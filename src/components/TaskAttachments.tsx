import { useEffect, useRef, useState } from 'react';
import { deleteTaskAttachment, loadTaskAttachments, uploadTaskAttachment,
  type TaskAttachment } from '../lib/taskAttachments';

export function TaskAttachments({ userId, planId, stepId, readOnly, onChange }: {
  userId: string; planId: string; stepId: number; readOnly: boolean;
  onChange: (items: TaskAttachment[]) => void;
}) {
  const picker = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<TaskAttachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function refresh() {
    const result = await loadTaskAttachments(planId, stepId);
    const next = result.data ?? [];
    setItems(next); onChange(next);
    if (result.error) setError('Не удалось загрузить вложения.');
  }
  useEffect(() => { void refresh(); }, [planId, stepId]);

  async function upload(files: File[]) {
    setBusy(true); setError('');
    const selected = files.slice(0, Math.max(0, 3 - items.length));
    const totalSize = items.reduce((sum, item) => sum + item.size_bytes, 0)
      + selected.reduce((sum, file) => sum + file.size, 0);
    if (!selected.length || totalSize > 12 * 1024 * 1024) {
      setError('Можно добавить до 3 файлов общим размером не больше 12 МБ.'); setBusy(false); return;
    }
    for (const file of selected) {
      const result = await uploadTaskAttachment(userId, planId, stepId, file);
      if (result.error) { setError(result.error.message); break; }
    }
    await refresh(); setBusy(false);
  }

  async function remove(item: TaskAttachment) {
    const result = await deleteTaskAttachment(item);
    if (result.error) setError('Не удалось удалить файл.');
    else await refresh();
  }

  return <div className="task-attachments"><header><div><b>Фото и файлы результата</b>
    <small>Кью изучит их при проверке · до 10 МБ</small></div>{!readOnly && <button disabled={busy}
      onClick={() => picker.current?.click()}>{busy ? 'Загружаем…' : '＋ Прикрепить'}</button>}</header>
    <input ref={picker} hidden type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,text/plain"
      onChange={(event) => { void upload(Array.from(event.target.files ?? [])); event.target.value = ''; }} />
    <div>{items.map((item) => <article key={item.id}><span>{item.mime_type.startsWith('image/') ? '🖼️' : '📎'}</span>
      <a href={item.url} target="_blank" rel="noreferrer">{item.name}</a>
      {!readOnly && <button onClick={() => void remove(item)} aria-label={`Удалить ${item.name}`}>×</button>}
    </article>)}</div>
    {!items.length && <p>Можно приложить фото выполненной работы, PDF или TXT.</p>}
    {error && <p className="form-error">{error}</p>}
  </div>;
}
