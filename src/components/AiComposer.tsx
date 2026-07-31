import { FormEvent, useRef, useState } from 'react';
import { AiAttachment, prepareAiAttachment } from '../lib/aiAttachments';
import { useSession } from '../lib/useSession';
import { VoiceRecorder } from './VoiceRecorder';

type Props = {
  busy: boolean;
  name: string;
  placeholder: string;
  onSend: (text: string, attachments: AiAttachment[]) => void;
};

export function AiComposer({ busy, name, placeholder, onSend }: Props) {
  const { session } = useSession();
  const picker = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<AiAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function add(selected: File[]) {
    if (!session || !selected.length) return;
    setLoading(true);
    setError('');
    try {
      const prepared = await Promise.all(selected.slice(0, 3).map((file) =>
        prepareAiAttachment(session.user.id, file)));
      setFiles((current) => [...current, ...prepared].slice(0, 3));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось добавить файл.');
    } finally {
      setLoading(false);
    }
  }

  async function record(blob: Blob) {
    if (!session) return;
    setLoading(true);
    try {
      const attachment = await prepareAiAttachment(session.user.id,
        new File([blob], `voice-${Date.now()}.wav`, { type: 'audio/wav' }));
      onSend('Прослушай моё голосовое сообщение и ответь на него.', [attachment]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось отправить голосовое.');
    } finally {
      setLoading(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = form.elements.namedItem(name) as HTMLInputElement;
    const text = input.value.trim();
    if (!text && !files.length) return;
    onSend(text || 'Изучи прикреплённые материалы и помоги мне.', files);
    setFiles([]);
    input.value = '';
  }

  const disabled = busy || loading;
  return <div className="ai-composer">
    {!!files.length && <div className="ai-composer__files">{files.map((file, index) =>
      <span key={`${file.name}-${index}`}>{file.mimeType.startsWith('image/') ? '🖼️' : '📎'} {file.name}
        <button type="button" onClick={() => setFiles((old) => old.filter((_, item) => item !== index))}>×</button>
      </span>)}</div>}
    {error && <small className="ai-composer__error">{error}</small>}
    <form onSubmit={submit}>
      <input ref={picker} type="file" hidden multiple
        accept="image/jpeg,image/png,image/webp,image/gif,audio/*,application/pdf,text/plain"
        onChange={(event) => { void add(Array.from(event.target.files ?? [])); event.target.value = ''; }} />
      <button type="button" className="ai-attach" disabled={disabled} onClick={() => picker.current?.click()}
        aria-label="Прикрепить фото или файл">＋</button>
      <VoiceRecorder disabled={disabled} onRecorded={(blob) => void record(blob)} />
      <input name={name} placeholder={loading ? 'Загрузка…' : placeholder} autoComplete="off" disabled={disabled} />
      <button className="ai-send" aria-label="Отправить" disabled={disabled}>↑</button>
    </form>
  </div>;
}
