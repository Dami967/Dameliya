import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type AudioRelay = { stop: () => void };

export async function startRealtimeAudioRelay(callId: string, stream: MediaStream,
  context: AudioContext): Promise<AudioRelay> {
  await context.resume();
  let nextPlayTime = context.currentTime;
  const channel = supabase.channel(`audio-call:${callId}`, {
    config: { broadcast: { self: false, ack: false } },
  });
  channel.on('broadcast', { event: 'audio' }, ({ payload }) => {
    const encoded = typeof payload?.data === 'string' ? payload.data : '';
    if (!encoded) return;
    playChunk(context, encoded, (time) => { nextPlayTime = time; }, nextPlayTime);
  });
  await subscribe(channel);

  const source = context.createMediaStreamSource(stream);
  const processor = context.createScriptProcessor(4096, 1, 1);
  const silent = context.createGain(); silent.gain.value = 0;
  processor.onaudioprocess = (event) => {
    const samples = downsample(event.inputBuffer.getChannelData(0), context.sampleRate, 12_000);
    void channel.send({ type: 'broadcast', event: 'audio', payload: { data: encodePcm(samples) } });
  };
  source.connect(processor); processor.connect(silent); silent.connect(context.destination);

  return { stop: () => {
    processor.disconnect(); source.disconnect(); silent.disconnect(); processor.onaudioprocess = null;
    void supabase.removeChannel(channel);
  } };
}

function subscribe(channel: RealtimeChannel) {
  return new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('Audio relay timeout')), 8_000);
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') { window.clearTimeout(timer); resolve(); }
      if (status === 'CHANNEL_ERROR') { window.clearTimeout(timer); reject(new Error('Audio relay error')); }
    });
  });
}

function downsample(input: Float32Array, inputRate: number, outputRate: number) {
  const ratio = inputRate / outputRate;
  const output = new Int16Array(Math.max(1, Math.floor(input.length / ratio)));
  for (let index = 0; index < output.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, input[Math.floor(index * ratio)] ?? 0));
    output[index] = sample < 0 ? sample * 32768 : sample * 32767;
  }
  return output;
}

function encodePcm(samples: Int16Array) {
  const bytes = new Uint8Array(samples.buffer);
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}

function playChunk(context: AudioContext, encoded: string, updateTime: (value: number) => void,
  previousTime: number) {
  const binary = atob(encoded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  const samples = new Int16Array(bytes.buffer);
  const buffer = context.createBuffer(1, samples.length, 12_000);
  const output = buffer.getChannelData(0);
  for (let index = 0; index < samples.length; index += 1) output[index] = samples[index] / 32768;
  const source = context.createBufferSource(); source.buffer = buffer; source.connect(context.destination);
  const startAt = Math.max(context.currentTime + 0.06, previousTime);
  source.start(startAt); updateTime(startAt + buffer.duration);
}
