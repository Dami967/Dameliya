import { useEffect, useState } from 'react';
import type { PersonalNote } from '../lib/personalNotes';
import { NoteAttachments } from './NoteAttachments';

export function NoteEditor({ note, onSave, onDelete }: {
  note: PersonalNote; onSave: (title: string, content: string) => Promise<void>; onDelete: () => void;
}) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [status, setStatus] = useState('Все изменения сохранены');
  const saveNow = () => {
    if (title !== note.title || content !== note.content) void onSave(title, content).then(() => setStatus('Сохранено ✓'));
  };

  useEffect(() => { setTitle(note.title); setContent(note.content); }, [note.id]);
  useEffect(() => {
    if (title === note.title && content === note.content) return;
    setStatus('Сохраняем…');
    const timer = window.setTimeout(() => {
      void onSave(title, content).then(() => setStatus('Сохранено ✓'));
    }, 650);
    return () => window.clearTimeout(timer);
  }, [content, note.content, note.title, onSave, title]);

  return <article className="note-editor">
    <header><span>{status}</span><button onClick={onDelete}>Удалить</button></header>
    <input className="note-title" value={title} maxLength={200} autoFocus
      onChange={(event) => setTitle(event.target.value)} onBlur={saveNow} placeholder="Название заметки" />
    <textarea className="note-content" value={content} maxLength={50000}
      onChange={(event) => setContent(event.target.value)} onBlur={saveNow}
      placeholder={'Начни писать здесь…\n\nИдеи, планы, мысли, списки — всё, что важно сохранить.'} />
    <NoteAttachments noteId={note.id} userId={note.user_id} />
    <footer>{content.length.toLocaleString('ru-RU')} символов</footer>
  </article>;
}
