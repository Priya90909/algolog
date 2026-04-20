/**
 * AlgoLog — pages/Dashboard.jsx
 * ─────────────────────────────────────────────────────────────
 * The nerve center. Displays:
 *   • KPI strip (total, solved today, on review queue, mastery avg)
 *   • Mastery-by-tag bar chart (useMemo derived)
 *   • Due-for-review queue
 *   • Full problem table with filter/sort
 *
 * Performance notes:
 *   • ProblemRow is wrapped in React.memo to prevent re-renders
 *     when sibling rows update.
 *   • filteredProblems is memoized so sorting never re-runs on
 *     unrelated state changes.
 */
import React, { useState, useMemo, memo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useProblems } from '../context/ProblemContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

// ── Difficulty badge colours ──────────────────────────────────
const DIFF_STYLES = {
  Easy:   'text-emerald-400  bg-emerald-400/10 border-emerald-500/30',
  Medium: 'text-amber-400    bg-amber-400/10   border-amber-500/30',
  Hard:   'text-rose-400     bg-rose-400/10    border-rose-500/30',
};

// ── Leitner box display ───────────────────────────────────────
const BOX_LABEL = ['', 'New', 'Learning', 'Reviewing', 'Practiced', 'Mastered'];
const BOX_WIDTH = [0, 20, 40, 60, 80, 100]; // percent fill

// ── Sub-components ────────────────────────────────────────────

/** KPI card used in the top strip. */
function StatCard({ label, value, sub }) {
  return (
    <div className="stat-card">
      <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-1">
        {label}
      </p>
      <p className="text-3xl font-bold font-mono text-[var(--text-primary)]">{value}</p>
      {sub && <p className="text-xs text-[var(--text-muted)] mt-1">{sub}</p>}
    </div>
  );
}

/** Mastery progress bar for one DS tag. */
function MasteryBar({ tag, mastery, count }) {
  const pct = Math.round(((mastery - 1) / 4) * 100); // box 1–5 → 0–100%
  return (
    <div className="flex items-center gap-3 group">
      <span className="w-24 text-xs text-right text-[var(--text-secondary)] truncate shrink-0">
        {tag}
      </span>
      <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] font-mono text-[var(--text-muted)] w-10 text-right shrink-0">
        {mastery.toFixed(1)}/5
      </span>
      <span className="text-[10px] text-[var(--text-muted)] w-12 shrink-0">
        {count}p
      </span>
    </div>
  );
}

/**
 * ProblemRow — memoized to prevent re-renders when unrelated rows change.
 */
const ProblemRow = memo(function ProblemRow({ problem, review }) {
  const navigate = useNavigate();
  const box = review?.leitner_box ?? 1;

  return (
    <tr
      onClick={() => navigate(`/problem/${problem.id}`)}
      className="group border-t border-white/[0.04] hover:bg-white/[0.03] cursor-pointer transition-colors"
    >
      {/* Title */}
      <td className="py-3 px-4">
        <p className="text-sm font-medium text-[var(--text-primary)] group-hover:text-amber-400 transition-colors">
          {problem.title}
        </p>
        {problem.url && (
          <a
            href={problem.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="text-[10px] text-[var(--text-muted)] hover:text-amber-400 transition-colors"
          >
            {new URL(problem.url).hostname} ↗
          </a>
        )}
      </td>

      {/* Difficulty */}
      <td className="py-3 px-4">
        <span
          className={`inline-block px-2 py-0.5 rounded border text-[10px] font-mono uppercase tracking-wider ${DIFF_STYLES[problem.difficulty]}`}
        >
          {problem.difficulty}
        </span>
      </td>

      {/* DS Tags */}
      <td className="py-3 px-4 hidden md:table-cell">
        <div className="flex flex-wrap gap-1">
          {(problem.ds_tags ?? []).slice(0, 3).map(t => (
            <span key={t} className="tag">
              {t}
            </span>
          ))}
        </div>
      </td>

      {/* Leitner box */}
      <td className="py-3 px-4 hidden lg:table-cell">
        <div className="flex items-center gap-2">
          <div className="w-16 h-1 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full bg-amber-500/70"
              style={{ width: `${BOX_WIDTH[box]}%` }}
            />
          </div>
          <span className="text-[10px] text-[var(--text-muted)] font-mono">
            {BOX_LABEL[box]}
          </span>
        </div>
      </td>

      {/* Next review */}
      <td className="py-3 px-4 hidden xl:table-cell text-xs text-[var(--text-muted)] font-mono">
        {review?.next_review
          ? new Date(review.next_review).toLocaleDateString()
          : '—'}
      </td>

      {/* Companies */}
      <td className="py-3 px-4 hidden xl:table-cell">
        <div className="flex gap-1 flex-wrap">
          {(problem.company_tags ?? []).slice(0, 2).map(c => (
            <span key={c} className="company-tag">
              {c}
            </span>
          ))}
        </div>
      </td>
    </tr>
  );
});

// ── Dashboard ─────────────────────────────────────────────────
export default function Dashboard() {
  const { problems, reviews, masteryByTag, dueForReview, loading } = useProblems();
  const { user, username} = useAuth();

  const [search, setSearch]         = useState('');
  const [filterDiff, setFilterDiff] = useState('All');
  const [sortKey, setSortKey]       = useState('created_at'); // 'created_at' | 'difficulty' | 'leitner'

  // ── Memoized filtered + sorted list ──────────────────────────
  const filteredProblems = useMemo(() => {
    let result = [...problems];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        p =>
          p.title.toLowerCase().includes(q) ||
          p.ds_tags?.some(t => t.toLowerCase().includes(q)) ||
          p.company_tags?.some(t => t.toLowerCase().includes(q))
      );
    }

    if (filterDiff !== 'All') {
      result = result.filter(p => p.difficulty === filterDiff);
    }

    result.sort((a, b) => {
      if (sortKey === 'difficulty') {
        const order = { Easy: 0, Medium: 1, Hard: 2 };
        return order[a.difficulty] - order[b.difficulty];
      }
      if (sortKey === 'leitner') {
        const boxA = reviews[a.id]?.leitner_box ?? 1;
        const boxB = reviews[b.id]?.leitner_box ?? 1;
        return boxA - boxB;
      }
      // default: newest first
      return new Date(b.created_at) - new Date(a.created_at);
    });

    return result;
  }, [problems, reviews, search, filterDiff, sortKey]);

  // ── KPI calculations ─────────────────────────────────────────
  const avgMastery = useMemo(() => {
    if (!problems.length) return 0;
    const total = problems.reduce(
      (sum, p) => sum + (reviews[p.id]?.leitner_box ?? 1), 0
    );
    return ((total / problems.length - 1) / 4 * 100).toFixed(0);
  }, [problems, reviews]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)]">
        <div className="loader" />
      </div>
    );
  }

  return (
    <main className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8 space-y-8">

      {/* ── Header ── */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs text-amber-400 uppercase tracking-widest font-mono mb-1">
            AlgoLog / Dashboard
          </p>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Good morning,&nbsp;
            <span className="text-amber-400">{username || user?.email?.split('@')[0]}</span>
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            {dueForReview.length > 0
              ? `You have ${dueForReview.length} problem${dueForReview.length > 1 ? 's' : ''} due for review.`
              : "You're all caught up on reviews 🎉"}
          </p>
        </div>
        <Link
          to="/add"
          className="btn-primary shrink-0"
        >
          + Add Problem
        </Link>
      </header>

      {/* ── KPI Strip ── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Problems" value={problems.length} />
        <StatCard label="Due for Review"  value={dueForReview.length} sub="based on Leitner schedule" />
        <StatCard label="Avg Mastery"     value={`${avgMastery}%`}   sub="across all problems" />
        <StatCard label="Tags Tracked"    value={masteryByTag.length} sub="data structure categories" />
      </section>

      {/* ── Main Grid: Mastery + Review Queue ── */}
      <section className="grid lg:grid-cols-3 gap-6">

        {/* Mastery by Tag */}
        <div className="panel lg:col-span-2">
          <h2 className="panel-title">Mastery by Data Structure</h2>
          {masteryByTag.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">
              Add problems with DS tags to see mastery analytics.
            </p>
          ) : (
            <div className="space-y-3 mt-4">
              {masteryByTag.map(({ tag, mastery, count }) => (
                <MasteryBar key={tag} tag={tag} mastery={mastery} count={count} />
              ))}
            </div>
          )}
        </div>

        {/* Review Queue */}
        <div className="panel">
          <h2 className="panel-title">Review Queue</h2>
          {dueForReview.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] mt-4">Nothing due — come back later!</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {dueForReview.slice(0, 8).map(p => (
                <li key={p.id}>
                  <Link
                    to={`/problem/${p.id}`}
                    className="flex items-center justify-between group hover:bg-white/[0.04] -mx-2 px-2 py-1.5 rounded-lg transition-colors"
                  >
                    <span className="text-sm text-[var(--text-secondary)] group-hover:text-amber-400 transition-colors truncate">
                      {p.title}
                    </span>
                    <span className={`ml-2 text-[10px] font-mono shrink-0 ${DIFF_STYLES[p.difficulty]}`}>
                      {p.difficulty}
                    </span>
                  </Link>
                </li>
              ))}
              {dueForReview.length > 8 && (
                <li className="text-xs text-[var(--text-muted)] pt-1">
                  +{dueForReview.length - 8} more…
                </li>
              )}
            </ul>
          )}
        </div>
      </section>

      {/* ── Problem Table ── */}
      <section className="panel overflow-hidden">
        {/* Table toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between mb-4">
          <h2 className="panel-title">All Problems</h2>
          <div className="flex flex-wrap gap-2 items-center">
            {/* Search */}
            <input
              type="text"
              placeholder="Search title, tag, company…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-sm w-52"
            />
            {/* Difficulty filter */}
            <select
              value={filterDiff}
              onChange={e => setFilterDiff(e.target.value)}
              className="input-sm"
            >
              {['All', 'Easy', 'Medium', 'Hard'].map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            {/* Sort */}
            <select
              value={sortKey}
              onChange={e => setSortKey(e.target.value)}
              className="input-sm"
            >
              <option value="created_at">Newest</option>
              <option value="difficulty">Difficulty</option>
              <option value="leitner">Leitner Box</option>
            </select>
          </div>
        </div>

        {filteredProblems.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)] py-8 text-center">
            {problems.length === 0
              ? 'No problems yet. Hit "+ Add Problem" to get started.'
              : 'No problems match your filters.'}
          </p>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:-mx-6">
            <table className="w-full">
              <thead>
                <tr className="text-left">
                  {['Problem', 'Difficulty', 'Tags', 'Progress', 'Next Review', 'Companies'].map(h => (
                    <th
                      key={h}
                      className="pb-2 px-4 text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-medium"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredProblems.map(p => (
                  <ProblemRow
                    key={p.id}
                    problem={p}
                    review={reviews[p.id]}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
