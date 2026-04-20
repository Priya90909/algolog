import { useParams } from 'react-router-dom';

/**
 * StudyRoom — collaborative viewing of a shared problem.
 * Full real-time collaboration would require Supabase Realtime subscriptions
 * (supabase.channel(...).on('postgres_changes', ...).subscribe()).
 * This component provides the UI shell and share-link generation.
 */
export default function StudyRoom() {
  const { roomId } = useParams();
  const shareUrl   = `${window.location.origin}/room/${roomId}`;

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <p className="font-mono text-[10px] text-amber-500 uppercase tracking-widest mb-1">AlgoLog / Study Room</p>
      <h1 className="text-xl font-bold text-[var(--text-primary)] mb-6">Study Room</h1>

      <div className="panel space-y-4">
        <p className="text-sm text-[var(--text-secondary)]">
          Share this link with teammates to study together:
        </p>
        <div className="flex gap-2">
          <input readOnly value={shareUrl} className="input font-mono text-xs flex-1" />
          <button onClick={() => navigator.clipboard.writeText(shareUrl)} className="btn-primary shrink-0">
            Copy
          </button>
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          Real-time collaboration uses Supabase Realtime. Enable the channel in your Supabase project to sync cursors and notes live.
        </p>
      </div>
    </main>
  );
}
