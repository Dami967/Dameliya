import { useState } from 'react';
import { useLocation } from 'wouter';
import { createPersonalNote } from '../lib/personalNotes';
import { useSession } from '../lib/useSession';
import { Icon } from './Icon';

export function NewNoteButton({ compact = false }: { compact?: boolean }) {
  const { session } = useSession();
  const [, navigate] = useLocation();
  const [busy, setBusy] = useState(false);

  async function create() {
    if (!session || busy) return;
    setBusy(true);
    const { data } = await createPersonalNote(session.user.id);
    if (data) navigate(`/notes/${data.id}`);
    else setBusy(false);
  }

  return <button className={compact ? 'new-note-compact' : ''} disabled={busy} onClick={() => void create()}>
    <span><Icon name="book" /></span><b>{busy ? 'Создаём…' : compact ? '+ Новая заметка' : 'Добавить заметку'}</b>
  </button>;
}
