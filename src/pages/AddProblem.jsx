import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProblems } from '../context/ProblemContext.jsx';

const STEPS = ['Details', 'Tags', 'First Version'];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const DS_TAG_OPTIONS = ['Array','String','Hash Map','Tree','Graph','DP','Stack','Queue','Heap','Linked List','Two Pointers','Sliding Window','Binary Search','Backtracking','Trie','Segment Tree','Topological Sort','BFS','DFS'];
const COMPANY_OPTIONS = ['Google','Meta','Amazon','Microsoft','Apple','Uber','Airbnb','Netflix','Stripe','Atlassian','Adobe','Goldman Sachs'];

export default function AddProblem() {
  const { addProblem, addCodeVersion } = useProblems();
  const navigate = useNavigate();

  const [step, setStep]           = useState(0);
  const [loading, setLoading]     = useState(false);

  // Step 0 — Details
  const [title, setTitle]         = useState('');
  const [url, setUrl]             = useState('');
  const [difficulty, setDiff]     = useState('Medium');
  const [notes, setNotes]         = useState('');

  // Step 1 — Tags
  const [dsTags, setDsTags]       = useState([]);
  const [compTags, setCompTags]   = useState([]);

  // Step 2 — First code version
  const [vLabel, setVLabel]       = useState('Brute Force');
  const [lang, setLang]           = useState('python');
  const [code, setCode]           = useState('');
  const [timeC, setTimeC]         = useState('');
  const [spaceC, setSpaceC]       = useState('');

  function toggleTag(arr, setArr, val) {
    setArr(arr.includes(val) ? arr.filter(t => t !== val) : [...arr, val]);
  }

  async function handleFinish() {
    setLoading(true);
    const problem = await addProblem({ title, url, difficulty, ds_tags: dsTags, company_tags: compTags, notes });
    if (problem && code.trim()) {
      await addCodeVersion(problem.id, { version_label: vLabel, language: lang, code, time_complexity: timeC, space_complexity: spaceC });
    }
    setLoading(false);
    navigate(problem ? `/problem/${problem.id}` : '/');
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-8">
        <p className="font-mono text-[10px] text-amber-500 uppercase tracking-widest mb-1">AlgoLog / New Problem</p>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Add Problem</h1>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono border transition-all ${i === step ? 'bg-amber-500 border-amber-500 text-black' : i < step ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : 'bg-transparent border-white/10 text-[var(--text-muted)]'}`}>
              {i < step ? '✓' : i + 1}
            </div>
            <span className={`text-xs ${i === step ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>{s}</span>
            {i < STEPS.length - 1 && <div className="w-8 h-px bg-white/10 ml-1" />}
          </div>
        ))}
      </div>

      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-6">

        {/* ── Step 0: Details ── */}
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] block mb-1.5">Problem Title *</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Two Sum" className="input" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] block mb-1.5">LeetCode / Problem URL</label>
              <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://leetcode.com/problems/..." className="input" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] block mb-2">Difficulty</label>
              <div className="flex gap-2">
                {DIFFICULTIES.map(d => (
                  <button key={d} onClick={() => setDiff(d)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-mono border transition-all ${difficulty === d
                      ? d === 'Easy' ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-400'
                        : d === 'Medium' ? 'bg-amber-500/15 border-amber-500/50 text-amber-400'
                        : 'bg-rose-500/15 border-rose-500/50 text-rose-400'
                      : 'border-[var(--border)] text-[var(--text-muted)] hover:border-white/20'}`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] block mb-1.5">Notes / Pseudo-code (Markdown)</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4}
                placeholder="Write your approach, edge cases, pseudo-code here…"
                className="input resize-none font-mono text-xs" />
            </div>
          </div>
        )}

        {/* ── Step 1: Tags ── */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] block mb-3">Data Structure Tags</label>
              <div className="flex flex-wrap gap-2">
                {DS_TAG_OPTIONS.map(t => (
                  <button key={t} onClick={() => toggleTag(dsTags, setDsTags, t)}
                    className={`px-2.5 py-1 rounded-md text-xs font-mono border transition-all ${dsTags.includes(t) ? 'bg-amber-500/15 border-amber-500/40 text-amber-400' : 'border-[var(--border)] text-[var(--text-muted)] hover:border-white/20'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] block mb-3">Company Tags</label>
              <div className="flex flex-wrap gap-2">
                {COMPANY_OPTIONS.map(c => (
                  <button key={c} onClick={() => toggleTag(compTags, setCompTags, c)}
                    className={`px-2.5 py-1 rounded-md text-xs font-mono border transition-all ${compTags.includes(c) ? 'bg-blue-500/15 border-blue-500/40 text-blue-400' : 'border-[var(--border)] text-[var(--text-muted)] hover:border-white/20'}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2: First Version ── */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] block mb-1.5">Version Label</label>
                <input value={vLabel} onChange={e => setVLabel(e.target.value)} className="input" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] block mb-1.5">Language</label>
                <select value={lang} onChange={e => setLang(e.target.value)} className="input">
                  {['python','javascript','java','cpp','typescript','go','rust'].map(l => <option key={l}>{l}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] block mb-1.5">Code</label>
              <textarea value={code} onChange={e => setCode(e.target.value)} rows={12}
                placeholder="# Paste your solution here…"
                className="input resize-none font-mono text-xs leading-relaxed" />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] block mb-1.5">Time Complexity</label>
                <input value={timeC} onChange={e => setTimeC(e.target.value)} placeholder="O(n)" className="input font-mono" />
              </div>
              <div className="flex-1">
                <label className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] block mb-1.5">Space Complexity</label>
                <input value={spaceC} onChange={e => setSpaceC(e.target.value)} placeholder="O(1)" className="input font-mono" />
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8 pt-5 border-t border-[var(--border)]">
          <button onClick={() => step > 0 ? setStep(s => s - 1) : navigate('/')} className="btn-ghost">
            {step === 0 ? 'Cancel' : '← Back'}
          </button>
          {step < STEPS.length - 1
            ? <button onClick={() => setStep(s => s + 1)} disabled={step === 0 && !title.trim()} className="btn-primary disabled:opacity-40">
                Next →
              </button>
            : <button onClick={handleFinish} disabled={loading} className="btn-primary disabled:opacity-40">
                {loading ? 'Saving…' : 'Save Problem ✓'}
              </button>
          }
        </div>
      </div>
    </main>
  );
}
