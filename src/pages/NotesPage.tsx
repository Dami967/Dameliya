import { useCallback, useEffect, useState } from 'react';
import { useLocation, useRoute } from 'wouter';
import { AppShell } from '../components/AppShell';
import { NoteEditor } from '../components/NoteEditor';
import { NotesSidebar } from '../components/NotesSidebar';
import { deletePersonalNote, loadPersonalNote, loadPersonalNotes, updatePersonalNote,
  type PersonalNote } from '../lib/personalNotes';
import { deleteAllNoteAttachments } from '../lib/noteAttachments';
import { useSession } from '../lib/useSession';

export function NotesPage() {
  const { session } = useSession();
  const [, navigate] = useLocation();
  const [, params] = useRoute('/notes/:id');
  const [notes, setNotes] = useState<PersonalNote[]>([]);
  const [active, setActive] = useState<PersonalNote | null>(null);
  const [query, setQuery] = useState('');

  const refresh = useCallback(async () => {
    if (!session) return;
    const { data } = await loadPersonalNotes(session.user.id);
    setNotes(data ?? []);
  }, [session]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    if (!session || !params?.id) return setActive(null);
    void loadPersonalNote(session.user.id, params.id).then(({ data }) => setActive(data ?? null));
  }, [params?.id, session]);

  async function save(title: string, content: string) {
    if (!active) return;
    const { error } = await updatePersonalNote(active.id, title, content);
    if (!error) {
      setActive({ ...active, title, content, updated_at: new Date().toISOString() });
      await refresh();
    }
  }
  async function remove() {
    if (!active || !confirm('Удалить эту заметку? Восстановить её не получится.')) return;
    await deleteAllNoteAttachments(active.id);
    const { error } = await deletePersonalNote(active.id);
    if (!error) { await refresh(); navigate('/notes'); }
  }

  return <AppShell><div className="notes-page">
    <NotesSidebar notes={notes} activeId={active?.id} query={query} onQuery={setQuery} />
    {active ? <NoteEditor key={active.id} note={active} onSave={save} onDelete={() => void remove()} />
      : <section className="notes-welcome"><span>📝</span><h2>Личные заметки</h2>
        <p>Выбери старую заметку слева или создай новую. Заметки из квестов хранятся отдельно.</p></section>}
  </div></AppShell>;
}
