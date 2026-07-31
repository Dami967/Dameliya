import { useEffect, useRef, useState } from 'react';
import type { PersonalNote } from '../lib/personalNotes';
import type { NoteAttachment } from '../lib/noteAttachments';
import { NoteAttachments } from './NoteAttachments';
import { notePlainText, RichNoteContent, type RichNoteContentHandle } from './RichNoteContent';

export function NoteEditor({ note, onSave, onDelete }: {
  note: PersonalNote; onSave: (title: string, content: string) => Promise<void>; onDelete: () => void;
}) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [attachments, setAttachments] = useState<NoteAttachment[]>([]);
  const [status, setStatus] = useState('Все изменения сохранены');
  const editor = useRef<RichNoteContentHandle>(null);
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
    <RichNoteContent ref={editor} value={note.content} attachments={attachments} onChange={setContent} />
    <NoteAttachments noteId={note.id} userId={note.user_id} onItemsChange={setAttachments}
      onInsert={(item) => editor.current?.insertAttachment(item)} />
    <footer>{notePlainText(content).length.toLocaleString('ru-RU')} символов</footer>
  </article>;
}
