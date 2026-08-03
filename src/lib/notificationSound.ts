let audioContext: AudioContext | null = null;

export function playNotificationSound(kind: 'notification' | 'call' = 'notification') {
  try {
    audioContext ??= new AudioContext();
    const times = kind === 'call' ? [0, .22, .44] : [0, .12];
    times.forEach((delay, index) => tone(audioContext!, delay, kind === 'call' ? 660 : 720 + index * 140));
  } catch { /* Браузер может запретить звук до первого касания страницы. */ }
}

export function unlockNotificationSound() {
  try { audioContext ??= new AudioContext(); void audioContext.resume(); } catch { /* Нет Web Audio. */ }
}

function tone(context: AudioContext, delay: number, frequency: number) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(.0001, context.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(.12, context.currentTime + delay + .015);
  gain.gain.exponentialRampToValueAtTime(.0001, context.currentTime + delay + .14);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(context.currentTime + delay);
  oscillator.stop(context.currentTime + delay + .16);
}
