import { Link } from 'wouter';
import type { PersonalNote } from '../lib/personalNotes';
import { NewNoteButton } from './NewNoteButton';
import { notePlainText } from './RichNoteContent';

export function NotesSidebar({ notes, activeId, query, onQuery }: {
  notes: PersonalNote[]; activeId?: string; query: string; onQuery: (value: string) => void;
}) {
  const shown = notes.filter((note) => `${note.title} ${notePlainText(note.content)}`.toLowerCase().includes(query.toLowerCase()));
  return <aside className="notes-sidebar">
    <header><div><span className="eyebrow">МОЯ КОЛЛЕКЦИЯ</span><h1>Заметки</h1></div><NewNoteButton compact /></header>
    <input className="notes-search" value={query} onChange={(event) => onQuery(event.target.value)}
      placeholder="Поиск по заметкам…" />
    <div className="notes-list">
      {shown.map((note) => <Link href={`/notes/${note.id}`} className={note.id === activeId ? 'is-active' : ''} key={note.id}>
        <b>{note.title.trim() || 'Новая заметка'}</b>
        <p>{notePlainText(note.content) || 'Начни писать…'}</p>
        <small>{formatDate(note.updated_at)}</small>
      </Link>)}
      {!shown.length && <div className="notes-empty-list">Здесь появятся твои заметки ✨</div>}
    </div>
  </aside>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    .format(new Date(value));
}
