import { useEffect, useRef, useState } from 'react';
import { deleteNoteAttachment, loadNoteAttachments, uploadNoteAttachment,
  type NoteAttachment } from '../lib/noteAttachments';

type PendingFile = { id: string; file: File; preview: string };

export function NoteAttachments({ noteId, userId, onInsert, onItemsChange }: {
  noteId: string; userId: string; onInsert?: (item: NoteAttachment) => void;
  onItemsChange?: (items: NoteAttachment[]) => void;
}) {
  const picker = useRef<HTMLInputElement>(null);
  const pendingRef = useRef<PendingFile[]>([]);
  const [items, setItems] = useState<NoteAttachment[]>([]);
  const [pending, setPending] = useState<PendingFile[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function refresh() {
    const result = await loadNoteAttachments(noteId);
    const loaded = result.data ?? [];
    setItems(loaded); onItemsChange?.(loaded);
    if (result.error) setError('Не удалось загрузить вложения.');
  }
  useEffect(() => { void refresh(); }, [noteId]);
  useEffect(() => () => pendingRef.current.forEach(releasePreview), []);

  function stage(files: File[]) {
    if (!files.length) return;
    const valid = files.filter((file) => file.size > 0 && file.size <= 10 * 1024 * 1024);
    if (valid.length !== files.length) setError('Каждый файл должен быть меньше 10 МБ.');
    else setError('');
    const next = [...pendingRef.current, ...valid.map((file) => ({
      id: crypto.randomUUID(), file, preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : '',
    }))];
    pendingRef.current = next; setPending(next); setNotice(valid.length ? `Выбрано: ${next.length}` : '');
  }

  async function send() {
    if (!pending.length || busy) return;
    setBusy(true); setError(''); setNotice('Отправляем в заметку…');
    const uploadedIds = new Set<string>();
    for (const item of pending) {
      const result = await uploadNoteAttachment(userId, noteId, item.file);
      if (result.error) { setError(result.error.message); break; }
      if (result.data) onInsert?.(result.data);
      uploadedIds.add(item.id);
    }
    const remaining = pending.filter((item) => !uploadedIds.has(item.id));
    pending.filter((item) => uploadedIds.has(item.id)).forEach(releasePreview);
    pendingRef.current = remaining; setPending(remaining);
    await refresh(); setBusy(false);
    setNotice(uploadedIds.size ? `${uploadedIds.size === 1 ? 'Фото или файл отправлен' : `Отправлено: ${uploadedIds.size}`} в заметку ✓` : '');
  }

  function removePending(item: PendingFile) {
    releasePreview(item);
    const next = pending.filter((pendingItem) => pendingItem.id !== item.id);
    pendingRef.current = next; setPending(next); setNotice(next.length ? `Выбрано: ${next.length}` : '');
  }

  async function remove(item: NoteAttachment) {
    if (!confirm(`Удалить «${item.name}»?`)) return;
    const result = await deleteNoteAttachment(item);
    if (result.error) setError('Не удалось удалить файл.');
    else await refresh();
  }

  const storedFiles = items.filter((item) => !item.mime_type.startsWith('image/'));
  return <section className="note-attachments" onDragOver={(event) => event.preventDefault()}
    onDrop={(event) => { event.preventDefault(); stage(Array.from(event.dataTransfer.files)); }}>
    <header><div><b>Фото и файлы</b><small>До 10 МБ каждый</small></div>
      <div className="note-attachment-actions"><button className="note-add-button" disabled={busy}
        onClick={() => picker.current?.click()}>＋ Добавить</button>
        <button disabled={busy || !pending.length} onClick={() => void send()}>
          {busy ? 'Отправляем…' : `Отправить в заметку${pending.length ? ` · ${pending.length}` : ''}`}</button></div>
      <input ref={picker} hidden type="file" multiple onChange={(event) => {
        stage(Array.from(event.target.files ?? [])); event.target.value = '';
      }} /></header>
    {!items.length && !pending.length && !busy && <button className="note-attachment-drop" onClick={() => picker.current?.click()}>
      <span>🖼️</span><b>Добавить фотографию</b><small>Нажми здесь или перетащи фото в этот блок</small></button>}
    {notice && <p className="note-attachment-notice">{notice}</p>}
    {error && <p className="note-attachment-error">{error}</p>}
    {!!(storedFiles.length || pending.length) && <div className="note-attachment-grid">{pending.map((item) =>
      <article className={`${item.preview ? 'is-photo' : 'is-file'} is-pending`} key={item.id}>
        {item.preview ? <span className="note-photo-preview"><img src={item.preview} alt={item.file.name} /></span>
          : <span className="note-file-icon">📎</span>}
        <div><b>{item.file.name}</b><small>Готово к отправке · {formatSize(item.file.size)}</small></div>
        <button aria-label={`Убрать ${item.file.name}`} onClick={() => removePending(item)}>×</button>
      </article>)}
      {storedFiles.map((item) =>
      <article className={item.mime_type.startsWith('image/') ? 'is-photo' : 'is-file'} key={item.id}>
        {item.mime_type.startsWith('image/') && item.url
          ? <a className="note-photo-preview" href={item.url} target="_blank" rel="noreferrer"
            aria-label={`Открыть фотографию ${item.name}`}><img src={item.url} alt={item.name} loading="lazy" /></a>
          : <a className="note-file-icon" href={item.url} target="_blank" rel="noreferrer">📎</a>}
        <div><a href={item.url} target="_blank" rel="noreferrer">{item.name}</a>
          <small>{formatSize(item.size_bytes)}</small></div>
        <button aria-label={`Удалить ${item.name}`} onClick={() => void remove(item)}>×</button>
      </article>)}</div>}
  </section>;
}

function releasePreview(item: PendingFile) {
  if (item.preview) URL.revokeObjectURL(item.preview);
}

function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} КБ` : `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}
