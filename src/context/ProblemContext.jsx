/**
 * AlgoLog — ProblemContext.jsx
 * ─────────────────────────────────────────────────────────────
 * Global state for problems, code versions, and review schedule.
 *
 * Architecture:
 *   • useReducer drives all state transitions (no scattered setState calls).
 *   • Async Supabase calls happen in *thunk-style* action creators that
 *     dispatch before AND after the network request for optimistic UI.
 *   • The Leitner algorithm is a pure function — easy to unit-test.
 *
 * Leitner Box Intervals:
 *   Box 1 →  1 day   (just learned)
 *   Box 2 →  3 days
 *   Box 3 →  7 days
 *   Box 4 → 14 days
 *   Box 5 → 30 days  (mastered)
 */
import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { nanoid } from 'nanoid';
import { supabase } from '../services/supabase.js';
import { useAuth } from './AuthContext.jsx';

// ── Constants ─────────────────────────────────────────────────
const LEITNER_INTERVALS_DAYS = [0, 1, 3, 7, 14, 30]; // index = box number

// ── Leitner Pure Function ─────────────────────────────────────

/**
 * Calculates the next review date given the current Leitner box and
 * whether the user recalled the answer correctly.
 *
 * @param {number} currentBox  - 1–5
 * @param {boolean} correct    - did the user recall correctly?
 * @returns {{ nextBox: number, nextReviewDate: Date }}
 */
export function calculateNextReview(currentBox, correct) {
  const nextBox = correct
    ? Math.min(currentBox + 1, 5)   // promote, cap at 5
    : 1;                             // incorrect → back to box 1

  const daysToAdd  = LEITNER_INTERVALS_DAYS[nextBox];
  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + daysToAdd);

  return { nextBox, nextReviewDate };
}

// ── Action Types ──────────────────────────────────────────────
export const ACTIONS = {
  SET_LOADING:         'SET_LOADING',
  SET_ERROR:           'SET_ERROR',
  LOAD_PROBLEMS:       'LOAD_PROBLEMS',
  ADD_PROBLEM:         'ADD_PROBLEM',
  UPDATE_PROBLEM:      'UPDATE_PROBLEM',
  DELETE_PROBLEM:      'DELETE_PROBLEM',
  SET_VERSIONS:        'SET_VERSIONS',        // load versions for one problem
  ADD_VERSION:         'ADD_VERSION',
  DELETE_VERSION:      'DELETE_VERSION',
  UPDATE_REVIEW:       'UPDATE_REVIEW',
  TOGGLE_PUBLIC:       'TOGGLE_PUBLIC',
  SET_ACTIVE_PROBLEM:  'SET_ACTIVE_PROBLEM',  // problem currently being viewed
};

// ── Initial State ─────────────────────────────────────────────
const initialState = {
  problems:       [],       // Problem[]
  versions:       {},       // { [problemId]: CodeVersion[] }
  reviews:        {},       // { [problemId]: ReviewSchedule }
  activeProblem:  null,     // Problem | null
  loading:        false,
  error:          null,
};

// ── Reducer ───────────────────────────────────────────────────

/**
 * Pure reducer — all state mutations are explicit and traceable.
 * No side effects live here.
 */
function problemReducer(state, action) {
  switch (action.type) {

    case ACTIONS.SET_LOADING:
      return { ...state, loading: action.payload };

    case ACTIONS.SET_ERROR:
      return { ...state, error: action.payload, loading: false };

    case ACTIONS.LOAD_PROBLEMS:
      return {
        ...state,
        problems: action.payload.problems,
        reviews:  action.payload.reviews,
        loading:  false,
        error:    null,
      };

    case ACTIONS.ADD_PROBLEM:
      return {
        ...state,
        problems: [action.payload, ...state.problems],
        versions: { ...state.versions, [action.payload.id]: [] },
      };

    case ACTIONS.UPDATE_PROBLEM:
      return {
        ...state,
        problems: state.problems.map(p =>
          p.id === action.payload.id ? { ...p, ...action.payload } : p
        ),
        activeProblem:
          state.activeProblem?.id === action.payload.id
            ? { ...state.activeProblem, ...action.payload }
            : state.activeProblem,
      };

    case ACTIONS.DELETE_PROBLEM: {
      const { [action.payload]: _v, ...remainingVersions } = state.versions;
      const { [action.payload]: _r, ...remainingReviews }  = state.reviews;
      return {
        ...state,
        problems: state.problems.filter(p => p.id !== action.payload),
        versions: remainingVersions,
        reviews:  remainingReviews,
        activeProblem:
          state.activeProblem?.id === action.payload ? null : state.activeProblem,
      };
    }

    case ACTIONS.SET_VERSIONS:
      return {
        ...state,
        versions: {
          ...state.versions,
          [action.payload.problemId]: action.payload.versions,
        },
      };

    case ACTIONS.ADD_VERSION:
      return {
        ...state,
        versions: {
          ...state.versions,
          [action.payload.problemId]: [
            ...(state.versions[action.payload.problemId] ?? []),
            action.payload.version,
          ],
        },
      };

    case ACTIONS.DELETE_VERSION:
      return {
        ...state,
        versions: {
          ...state.versions,
          [action.payload.problemId]: (
            state.versions[action.payload.problemId] ?? []
          ).filter(v => v.id !== action.payload.versionId),
        },
      };

    case ACTIONS.UPDATE_REVIEW:
      return {
        ...state,
        reviews: {
          ...state.reviews,
          [action.payload.problemId]: action.payload.review,
        },
      };

    case ACTIONS.TOGGLE_PUBLIC:
      return {
        ...state,
        problems: state.problems.map(p =>
          p.id === action.payload.id
            ? { ...p, is_public: action.payload.is_public, share_slug: action.payload.share_slug }
            : p
        ),
      };

    case ACTIONS.SET_ACTIVE_PROBLEM:
      return { ...state, activeProblem: action.payload };

    default:
      return state;
  }
}

// ── Context ───────────────────────────────────────────────────
const ProblemContext = createContext(null);

export function useProblems() {
  const ctx = useContext(ProblemContext);
  if (!ctx) throw new Error('useProblems must be used inside <ProblemProvider>');
  return ctx;
}

// ── Provider ──────────────────────────────────────────────────
export function ProblemProvider({ children }) {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(problemReducer, initialState);

  // ── Bootstrap: load problems + reviews on auth ──────────────
  useEffect(() => {
    if (!user) return;
    loadProblems();
  }, [user]);

  /**
   * Fetches all problems and their review schedules for the
   * current user in two parallel requests.
   */
  async function loadProblems() {
    dispatch({ type: ACTIONS.SET_LOADING, payload: true });
    try {
      const [problemRes, reviewRes] = await Promise.all([
        supabase
          .from('problems')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('review_schedule')
          .select('*')
          .eq('user_id', user.id),
      ]);

      if (problemRes.error) throw problemRes.error;
      if (reviewRes.error) throw reviewRes.error;

      // Index reviews by problem_id for O(1) lookup
      const reviewMap = (reviewRes.data ?? []).reduce((acc, r) => {
        acc[r.problem_id] = r;
        return acc;
      }, {});

      dispatch({
        type: ACTIONS.LOAD_PROBLEMS,
        payload: { problems: problemRes.data ?? [], reviews: reviewMap },
      });
    } catch (err) {
      dispatch({ type: ACTIONS.SET_ERROR, payload: err.message });
    }
  }

  // ── Action Creators ───────────────────────────────────────────

  /**
   * addProblem — creates a new problem row AND seeds its review schedule.
   * @param {object} fields - { title, url, difficulty, company_tags, ds_tags, notes }
   */
  const addProblem = useCallback(async (fields) => {
    dispatch({ type: ACTIONS.SET_LOADING, payload: true });
    try {
      const { data, error } = await supabase
        .from('problems')
        .insert({ ...fields, user_id: user.id })
        .select()
        .single();
      if (error) throw error;

      dispatch({ type: ACTIONS.ADD_PROBLEM, payload: data });

      // Seed initial review schedule (box 1, due today)
      await supabase.from('review_schedule').insert({
        problem_id:   data.id,
        user_id:      user.id,
        leitner_box:  1,
        next_review:  new Date().toISOString(),
        review_count: 0,
      });

      return data;
    } catch (err) {
      dispatch({ type: ACTIONS.SET_ERROR, payload: err.message });
      return null;
    }
  }, [user]);

  /**
   * addCodeVersion — appends a new solution version to a problem.
   * @param {string} problemId
   * @param {object} versionData - { version_label, language, code, time_complexity, space_complexity }
   */
  const addCodeVersion = useCallback(async (problemId, versionData) => {
    try {
      const { data, error } = await supabase
        .from('code_versions')
        .insert({ problem_id: problemId, ...versionData })
        .select()
        .single();
      if (error) throw error;

      dispatch({
        type: ACTIONS.ADD_VERSION,
        payload: { problemId, version: data },
      });
      return data;
    } catch (err) {
      dispatch({ type: ACTIONS.SET_ERROR, payload: err.message });
      return null;
    }
  }, []);

  /**
   * loadVersions — fetches code versions for a specific problem (lazy).
   */
  const loadVersions = useCallback(async (problemId) => {
    if (state.versions[problemId]) return; // already loaded
    try {
      const { data, error } = await supabase
        .from('code_versions')
        .select('*')
        .eq('problem_id', problemId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      dispatch({
        type: ACTIONS.SET_VERSIONS,
        payload: { problemId, versions: data ?? [] },
      });
    } catch (err) {
      dispatch({ type: ACTIONS.SET_ERROR, payload: err.message });
    }
  }, [state.versions]);

  /**
   * recordReview — advances or resets the Leitner box for a problem.
   * @param {string} problemId
   * @param {boolean} correct - user self-rated recall
   */
  const recordReview = useCallback(async (problemId, correct) => {
    const currentReview = state.reviews[problemId];
    const currentBox    = currentReview?.leitner_box ?? 1;

    const { nextBox, nextReviewDate } = calculateNextReview(currentBox, correct);

    const update = {
      leitner_box:  nextBox,
      last_reviewed: new Date().toISOString(),
      next_review:  nextReviewDate.toISOString(),
      review_count: (currentReview?.review_count ?? 0) + 1,
    };

    // Optimistic UI update
    dispatch({
      type: ACTIONS.UPDATE_REVIEW,
      payload: {
        problemId,
        review: { ...(currentReview ?? {}), ...update },
      },
    });

    try {
      await supabase
        .from('review_schedule')
        .upsert({ problem_id: problemId, user_id: user.id, ...update });
    } catch (err) {
      dispatch({ type: ACTIONS.SET_ERROR, payload: err.message });
    }
  }, [state.reviews, user]);

  /**
   * togglePublic — flips is_public and generates/clears a share slug.
   */
  const togglePublic = useCallback(async (problemId, currentlyPublic) => {
    const newIsPublic  = !currentlyPublic;
    const newShareSlug = newIsPublic ? nanoid(10) : null;

    try {
      const { error } = await supabase
        .from('problems')
        .update({ is_public: newIsPublic, share_slug: newShareSlug })
        .eq('id', problemId);
      if (error) throw error;

      dispatch({
        type: ACTIONS.TOGGLE_PUBLIC,
        payload: { id: problemId, is_public: newIsPublic, share_slug: newShareSlug },
      });

      return newShareSlug;
    } catch (err) {
      dispatch({ type: ACTIONS.SET_ERROR, payload: err.message });
      return null;
    }
  }, []);

  /**
   * deleteProblem — removes problem and cascades (DB handles FK cascades).
   */
  const deleteProblem = useCallback(async (problemId) => {
    dispatch({ type: ACTIONS.DELETE_PROBLEM, payload: problemId });
    try {
      await supabase.from('problems').delete().eq('id', problemId);
    } catch (err) {
      dispatch({ type: ACTIONS.SET_ERROR, payload: err.message });
    }
  }, []);

  // ── Derived / Memoized Data ───────────────────────────────────

  /**
   * masteryByTag — aggregates mastery score per DS tag.
   * Mastery = average Leitner box (1–5) for all problems tagged with that DS.
   *
   * Used by the Smart Dashboard's analytics view.
   *
   * @returns {Array<{ tag: string, mastery: number, count: number }>}
   */
  const masteryByTag = useMemo(() => {
    const tagMap = {}; // { [tag]: { totalBox: number, count: number } }

    state.problems.forEach((p) => {
      const review = state.reviews[p.id];
      const box    = review?.leitner_box ?? 1;

      (p.ds_tags ?? []).forEach((tag) => {
        if (!tagMap[tag]) tagMap[tag] = { totalBox: 0, count: 0 };
        tagMap[tag].totalBox += box;
        tagMap[tag].count    += 1;
      });
    });

    return Object.entries(tagMap)
      .map(([tag, { totalBox, count }]) => ({
        tag,
        mastery: parseFloat((totalBox / count).toFixed(2)),
        count,
      }))
      .sort((a, b) => b.mastery - a.mastery);
  }, [state.problems, state.reviews]);

  /**
   * dueForReview — list of problems whose next_review date is today or past.
   */
  const dueForReview = useMemo(() => {
    const now = new Date();
    return state.problems.filter((p) => {
      const review = state.reviews[p.id];
      if (!review) return true; // never reviewed → always due
      return new Date(review.next_review) <= now;
    });
  }, [state.problems, state.reviews]);

  const value = {
    // State
    problems:      state.problems,
    versions:      state.versions,
    reviews:       state.reviews,
    activeProblem: state.activeProblem,
    loading:       state.loading,
    error:         state.error,
    // Derived
    masteryByTag,
    dueForReview,
    // Actions
    addProblem,
    addCodeVersion,
    loadVersions,
    recordReview,
    togglePublic,
    deleteProblem,
    setActiveProblem: (problem) =>
      dispatch({ type: ACTIONS.SET_ACTIVE_PROBLEM, payload: problem }),
  };

  return (
    <ProblemContext.Provider value={value}>
      {children}
    </ProblemContext.Provider>
  );
}
