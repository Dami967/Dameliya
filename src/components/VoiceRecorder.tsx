import { useRef, useState } from 'react';

type ActiveRecording = {
  context: AudioContext;
  processor: ScriptProcessorNode;
  source: MediaStreamAudioSourceNode;
  stream: MediaStream;
  samples: Float32Array[];
};

export function VoiceRecorder({ onRecorded, disabled }: { onRecorded: (blob: Blob) => void; disabled: boolean }) {
  const active = useRef<ActiveRecording | null>(null);
  const [recording, setRecording] = useState(false);
  async function toggle() {
    if (active.current) {
      const current = active.current;
      active.current = null;
      current.processor.disconnect();
      current.source.disconnect();
      current.stream.getTracks().forEach((track) => track.stop());
      await current.context.close();
      setRecording(false);
      const blob = createWav(current.samples, current.context.sampleRate);
      if (blob) onRecorded(blob);
      else alert('Микрофон не записал звук. Проверь выбранный микрофон и попробуй ещё раз.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: true },
      });
      const context = new AudioContext();
      await context.resume();
      const source = context.createMediaStreamSource(stream);
      const processor = context.createScriptProcessor(4096, 1, 1);
      const samples: Float32Array[] = [];
      processor.onaudioprocess = (event) => samples.push(new Float32Array(event.inputBuffer.getChannelData(0)));
      source.connect(processor);
      processor.connect(context.destination);
      active.current = { context, processor, source, stream, samples };
      setRecording(true);
    } catch {
      alert('Разреши доступ к микрофону в настройках браузера.');
    }
  }
  return <button type="button" className={recording ? 'voice-button is-recording' : 'voice-button'} disabled={disabled}
    onClick={() => void toggle()} aria-label={recording ? 'Остановить и отправить' : 'Записать голосовое'}>
    {recording ? '■' : '🎙'}
  </button>;
}

function createWav(parts: Float32Array[], sampleRate: number) {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  let peak = 0;
  parts.forEach((part) => part.forEach((sample) => { peak = Math.max(peak, Math.abs(sample)); }));
  if (!length || peak < 0.0005) return null;
  const gain = Math.min(6, 0.9 / peak);
  const buffer = new ArrayBuffer(44 + length * 2);
  const view = new DataView(buffer);
  writeText(view, 0, 'RIFF');
  view.setUint32(4, 36 + length * 2, true);
  writeText(view, 8, 'WAVE');
  writeText(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeText(view, 36, 'data');
  view.setUint32(40, length * 2, true);
  let offset = 44;
  parts.forEach((part) => part.forEach((sample) => {
    const safe = Math.max(-1, Math.min(1, sample * gain));
    view.setInt16(offset, safe < 0 ? safe * 32768 : safe * 32767, true);
    offset += 2;
  }));
  return new Blob([buffer], { type: 'audio/wav' });
}

function writeText(view: DataView, offset: number, text: string) {
  [...text].forEach((character, index) => view.setUint8(offset + index, character.charCodeAt(0)));
}
