import { useEffect, useRef, useState } from 'react';
import { deleteNoteAttachment, loadNoteAttachments, uploadNoteAttachment,
  type NoteAttachment } from '../lib/noteAttachments';

export function NoteAttachments({ noteId, userId }: { noteId: string; userId: string }) {
  const picker = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<NoteAttachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function refresh() {
    const result = await loadNoteAttachments(noteId);
    setItems(result.data ?? []);
    if (result.error) setError('Не удалось загрузить вложения.');
  }
  useEffect(() => { void refresh(); }, [noteId]);

  async function add(files: File[]) {
    setBusy(true); setError('');
    for (const file of files) {
      const result = await uploadNoteAttachment(userId, noteId, file);
      if (result.error) { setError(result.error.message); break; }
    }
    await refresh(); setBusy(false);
  }

  async function remove(item: NoteAttachment) {
    if (!confirm(`Удалить «${item.name}»?`)) return;
    const result = await deleteNoteAttachment(item);
    if (result.error) setError('Не удалось удалить файл.');
    else await refresh();
  }

  return <section className="note-attachments">
    <header><div><b>Фото и файлы</b><small>До 10 МБ каждый</small></div>
      <button disabled={busy} onClick={() => picker.current?.click()}>＋ Добавить</button>
      <input ref={picker} hidden type="file" multiple onChange={(event) => {
        void add(Array.from(event.target.files ?? [])); event.target.value = '';
      }} /></header>
    {error && <p className="note-attachment-error">{error}</p>}
    {!!items.length && <div className="note-attachment-grid">{items.map((item) =>
      <article key={item.id}>
        {item.mime_type.startsWith('image/') && item.url
          ? <a href={item.url} target="_blank" rel="noreferrer"><img src={item.url} alt={item.name} /></a>
          : <a className="note-file-icon" href={item.url} target="_blank" rel="noreferrer">📎</a>}
        <div><a href={item.url} target="_blank" rel="noreferrer">{item.name}</a>
          <small>{formatSize(item.size_bytes)}</small></div>
        <button aria-label={`Удалить ${item.name}`} onClick={() => void remove(item)}>×</button>
      </article>)}</div>}
  </section>;
}

function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} КБ` : `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}
