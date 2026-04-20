import { useEffect, useState, memo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import python from 'react-syntax-highlighter/dist/esm/languages/hljs/python';
import javascript from 'react-syntax-highlighter/dist/esm/languages/hljs/javascript';
import java from 'react-syntax-highlighter/dist/esm/languages/hljs/java';
import { useProblems } from '../context/ProblemContext.jsx';
import { fetchAIHint } from '../services/supabase.js';

SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('javascript', javascript);
SyntaxHighlighter.registerLanguage('java', java);

const DIFF_STYLE = {
  Easy:   'text-emerald-400 bg-emerald-400/10 border-emerald-500/30',
  Medium: 'text-amber-400   bg-amber-400/10   border-amber-500/30',
  Hard:   'text-rose-400    bg-rose-400/10    border-rose-500/30',
};
const BOX_LABEL = ['','New','Learning','Reviewing','Practiced','Mastered'];

/** Memoized code block — only re-renders when the code string changes */
const CodeBlock = memo(function CodeBlock({ code, language }) {
  return (
    <div className="code-block rounded-lg overflow-hidden border border-[var(--border)]">
      <SyntaxHighlighter
        language={language}
        style={atomOneDark}
        showLineNumbers
        customStyle={{ margin: 0, fontSize: '12px', lineHeight: '1.7', background: 'var(--bg-input)' }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
});

export default function ProblemView({ shared = false }) {
  const { id, slug }                   = useParams();
  const navigate                       = useNavigate();
  const { problems, versions, reviews, loadVersions, addCodeVersion, recordReview, togglePublic, setActiveProblem } = useProblems();

  const problem = shared
    ? problems.find(p => p.share_slug === slug)
    : problems.find(p => p.id === id);

  const versionList  = versions[problem?.id] ?? [];
  const review       = reviews[problem?.id];
  const [activeVIdx, setActiveVIdx] = useState(0);

  // Whiteboard / new version form state
  const [scratchpad, setScratchpad]  = useState('');
  const [addingVersion, setAdding]   = useState(false);
  const [vLabel, setVLabel]          = useState('Optimised');
  const [vLang, setVLang]            = useState('python');
  const [vCode, setVCode]            = useState('');
  const [vTime, setVTime]            = useState('');
  const [vSpace, setVSpace]          = useState('');

  // AI Hint state
  const [hint, setHint]              = useState('');
  const [hintLoading, setHintLoading] = useState(false);

  useEffect(() => {
    if (problem) {
      loadVersions(problem.id);
      setActiveProblem(problem);
    }
    return () => setActiveProblem(null);
  }, [problem?.id]);

  async function handleAddVersion() {
    if (!vCode.trim()) return;
    await addCodeVersion(problem.id, { version_label: vLabel, language: vLang, code: vCode, time_complexity: vTime, space_complexity: vSpace });
    setAdding(false);
    setVCode(''); setVTime(''); setVSpace('');
  }

  async function handleHint() {
    setHintLoading(true);
    try {
      const h = await fetchAIHint(problem.title, problem.ds_tags);
      setHint(h);
    } catch {
      setHint('Could not fetch hint. Make sure the Edge Function is deployed.');
    }
    setHintLoading(false);
  }

  async function handleShare() {
    const slug = await togglePublic(problem.id, problem.is_public);
    if (slug) {
      const url = `${window.location.origin}/share/${slug}`;
      navigator.clipboard.writeText(url);
      alert(`Share link copied!\n${url}`);
    }
  }

  if (!problem) return (
    <div className="flex items-center justify-center h-[calc(100vh-52px)]">
      <p className="text-[var(--text-muted)]">Problem not found.</p>
    </div>
  );

  const activeVersion = versionList[activeVIdx];

  return (
    <main className="max-w-screen-xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div>
          <button onClick={() => navigate('/')} className="text-[10px] font-mono text-[var(--text-muted)] hover:text-amber-400 mb-2 block">
            ← Dashboard
          </button>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">{problem.title}</h1>
          <div className="flex flex-wrap gap-2 mt-2 items-center">
            <span className={`inline-block px-2 py-0.5 rounded border text-[10px] font-mono uppercase ${DIFF_STYLE[problem.difficulty]}`}>
              {problem.difficulty}
            </span>
            {problem.url && (
              <a href={problem.url} target="_blank" rel="noopener noreferrer"
                className="text-[10px] text-[var(--text-muted)] hover:text-amber-400 font-mono">
                Open Problem ↗
              </a>
            )}
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {(problem.ds_tags ?? []).map(t => <span key={t} className="tag">{t}</span>)}
            {(problem.company_tags ?? []).map(t => <span key={t} className="company-tag">{t}</span>)}
          </div>
        </div>

        {!shared && (
          <div className="flex gap-2 shrink-0 flex-wrap">
            <button onClick={() => recordReview(problem.id, true)}
              className="btn-ghost text-emerald-400 border-emerald-500/30 hover:border-emerald-400">
              ✓ Got it (Box {Math.min((review?.leitner_box ?? 1) + 1, 5)})
            </button>
            <button onClick={() => recordReview(problem.id, false)}
              className="btn-ghost text-rose-400 border-rose-500/30 hover:border-rose-400">
              ✗ Forgot (Box 1)
            </button>
            <button onClick={handleShare} className="btn-ghost">
              {problem.is_public ? '🔓 Shared' : '🔗 Share'}
            </button>
          </div>
        )}
      </div>

      {/* Review status */}
      {review && (
        <div className="mb-6 p-3 bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg flex items-center gap-4 text-xs font-mono text-[var(--text-muted)]">
          <span>Leitner Box: <span className="text-amber-400">{BOX_LABEL[review.leitner_box]}</span></span>
          <span>Reviews: {review.review_count}</span>
          <span>Next: {new Date(review.next_review).toLocaleDateString()}</span>
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_340px] gap-6">

        {/* Left: Code versions + Aha timeline */}
        <div className="space-y-6">

          {/* Version tabs */}
          {versionList.length > 0 && (
            <div className="panel">
              <div className="flex items-center justify-between mb-4">
                <div className="flex gap-1 flex-wrap">
                  {versionList.map((v, i) => (
                    <button key={v.id} onClick={() => setActiveVIdx(i)}
                      className={`px-3 py-1 rounded-md text-xs font-mono border transition-all ${activeVIdx === i ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'border-[var(--border)] text-[var(--text-muted)] hover:border-white/20'}`}>
                      {v.version_label}
                    </button>
                  ))}
                </div>
                {!shared && (
                  <button onClick={() => setAdding(v => !v)} className="btn-ghost text-xs">
                    + Version
                  </button>
                )}
              </div>

              {activeVersion && (
                <>
                  <div className="flex gap-3 mb-3">
                    {activeVersion.time_complexity && (
                      <span className="tag">⏱ {activeVersion.time_complexity}</span>
                    )}
                    {activeVersion.space_complexity && (
                      <span className="tag">💾 {activeVersion.space_complexity}</span>
                    )}
                    <span className="tag">{activeVersion.language}</span>
                    <span className="text-[10px] text-[var(--text-muted)] font-mono ml-auto">
                      {new Date(activeVersion.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <CodeBlock code={activeVersion.code} language={activeVersion.language} />
                </>
              )}
            </div>
          )}

          {/* Add version form */}
          {addingVersion && !shared && (
            <div className="panel space-y-4">
              <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-mono">New Version</p>
              <div className="flex gap-3">
                <input value={vLabel} onChange={e => setVLabel(e.target.value)} className="input flex-1" placeholder="Optimised" />
                <select value={vLang} onChange={e => setVLang(e.target.value)} className="input w-36">
                  {['python','javascript','java','cpp','typescript','go'].map(l => <option key={l}>{l}</option>)}
                </select>
              </div>
              <textarea value={vCode} onChange={e => setVCode(e.target.value)} rows={10}
                placeholder="# Your solution…" className="input font-mono text-xs resize-none" />
              <div className="flex gap-3">
                <input value={vTime} onChange={e => setVTime(e.target.value)} className="input flex-1 font-mono" placeholder="Time: O(n)" />
                <input value={vSpace} onChange={e => setVSpace(e.target.value)} className="input flex-1 font-mono" placeholder="Space: O(1)" />
              </div>
              <div className="flex gap-2">
                <button onClick={handleAddVersion} className="btn-primary">Save Version</button>
                <button onClick={() => setAdding(false)} className="btn-ghost">Cancel</button>
              </div>
            </div>
          )}

          {/* Aha! Timeline */}
          {versionList.length > 1 && (
            <div className="panel">
              <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-mono mb-4">Aha! Timeline</p>
              <div className="space-y-4">
                {[...versionList].reverse().map((v, i, arr) => (
                  <div key={v.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0 mt-1" />
                      {i < arr.length - 1 && <div className="w-px flex-1 bg-white/[0.06] mt-1" />}
                    </div>
                    <div className="pb-4">
                      <p className="text-xs font-mono text-amber-400">{v.version_label}</p>
                      <p className="text-[11px] text-[var(--text-muted)]">{new Date(v.created_at).toLocaleDateString()}</p>
                      {(v.time_complexity || v.space_complexity) && (
                        <p className="text-[11px] font-mono text-[var(--text-muted)] mt-0.5">
                          {v.time_complexity && `T: ${v.time_complexity}`}
                          {v.time_complexity && v.space_complexity && ' · '}
                          {v.space_complexity && `S: ${v.space_complexity}`}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Whiteboard + Hint */}
        <div className="space-y-5">

          {/* Whiteboard / scratchpad */}
          <div className="panel">
            <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-mono mb-3">Whiteboard Scratchpad</p>
            {problem.notes && !scratchpad && (
              <p className="text-xs text-[var(--text-muted)] font-mono whitespace-pre-wrap mb-3 pb-3 border-b border-[var(--border)]">
                {problem.notes}
              </p>
            )}
            <textarea
              value={scratchpad}
              onChange={e => setScratchpad(e.target.value)}
              rows={10}
              placeholder="Pseudo-code, edge cases, diagrams in text…"
              className="input font-mono text-xs resize-none leading-relaxed"
            />
            <p className="text-[10px] text-[var(--text-muted)] mt-2">Session-only. Add a version to persist code.</p>
          </div>

          {/* AI Hint */}
          {!shared && (
            <div className="panel">
              <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-mono mb-3">AI Hint</p>
              {hint ? (
                <div className="text-xs text-[var(--text-secondary)] leading-relaxed bg-amber-500/5 border border-amber-500/15 rounded-lg p-3">
                  {hint}
                </div>
              ) : (
                <p className="text-xs text-[var(--text-muted)] mb-3">Stuck? Get a conceptual nudge — no full solutions.</p>
              )}
              <button
                onClick={handleHint}
                disabled={hintLoading}
                className="btn-ghost w-full justify-center mt-2 disabled:opacity-40"
              >
                {hintLoading ? 'Thinking…' : hint ? '↻ Another Hint' : '✦ Get Hint'}
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
