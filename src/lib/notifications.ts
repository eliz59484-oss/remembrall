export type SoundType = 'magic' | 'bell' | 'gong' | 'piano' | 'harp';

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function sendNotification(title: string, body: string): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  new Notification(title, {
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
  } as any);
}

// ============================================
// SOUND LIBRARY
// ============================================

function playMagicChime(ctx: AudioContext): void {
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(523.25, ctx.currentTime);       // C5
  osc1.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15); // E5
  osc1.frequency.setValueAtTime(783.99, ctx.currentTime + 0.3);  // G5

  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(783.99, ctx.currentTime + 0.1);
  osc2.frequency.setValueAtTime(1046.5, ctx.currentTime + 0.3);

  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);

  osc1.start(ctx.currentTime);
  osc2.start(ctx.currentTime + 0.1);
  osc1.stop(ctx.currentTime + 0.8);
  osc2.stop(ctx.currentTime + 0.8);
}

function playBell(ctx: AudioContext): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, ctx.currentTime);   // A5
  osc.frequency.setValueAtTime(1760, ctx.currentTime + 0.05);
  osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
  gain.gain.setValueAtTime(0.4, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.2);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 1.2);
}

function playGong(ctx: AudioContext): void {
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(196, ctx.currentTime);  // G3 - deep
  osc2.type = 'triangle';
  osc2.frequency.setValueAtTime(392, ctx.currentTime);  // G4
  gain.gain.setValueAtTime(0.5, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 2.0);
  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);
  osc1.start(ctx.currentTime);
  osc2.start(ctx.currentTime);
  osc1.stop(ctx.currentTime + 2.0);
  osc2.stop(ctx.currentTime + 2.0);
}

function playPiano(ctx: AudioContext): void {
  const notes = [523.25, 587.33, 659.25]; // C5, D5, E5
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.2);
    gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.2);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.2 + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + i * 0.2);
    osc.stop(ctx.currentTime + i * 0.2 + 0.5);
  });
}

function playHarp(ctx: AudioContext): void {
  const notes = [261.63, 329.63, 392, 523.25, 659.25]; // C4, E4, G4, C5, E5
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);
    gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.12);
    gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + i * 0.12 + 0.8);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + i * 0.12);
    osc.stop(ctx.currentTime + i * 0.12 + 0.8);
  });
}

export function playSound(type: SoundType = 'magic'): void {
  if (typeof window === 'undefined') return;
  try {
    const ctx = new AudioContext();
    switch (type) {
      case 'bell': playBell(ctx); break;
      case 'gong': playGong(ctx); break;
      case 'piano': playPiano(ctx); break;
      case 'harp': playHarp(ctx); break;
      case 'magic':
      default: playMagicChime(ctx); break;
    }
  } catch {
    // Silently fail if audio context is not available
  }
}

export function vibrate(pattern: number[] = [200, 100, 200]): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
}

export function speak(text: string, lang: 'ru' | 'en', voiceName?: string): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang === 'ru' ? 'ru-RU' : 'en-US';
  utterance.rate = 0.9;
  utterance.pitch = 1.1;

  if (voiceName) {
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find((v) => v.name === voiceName);
    if (voice) utterance.voice = voice;
  }

  window.speechSynthesis.speak(utterance);
}

export function getAvailableVoices(lang: 'ru' | 'en'): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  const langPrefix = lang === 'ru' ? 'ru' : 'en';
  return window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith(langPrefix));
}

// ============================================
// FUN QUOTES
// ============================================

const funQuotesRu = {
  allClear: [
    'Все задачи выполнены! Даже Дамблдор гордился бы 🧙‍♂️',
    'Свободен, как золотой снитч! ✨',
    'Шар чист — ты ничего не забыл! 🔮',
    'Можно расслабиться — маг заслужил отдых 💤',
    'Дымка прозрачна — всё сделано! Экспекто Патронум! 🦌',
    'Невилл завидует — так всё помнить!',
    'По Парето, 80% сделано. Остальное — по желанию 😄',
    'Ни одной лягушки не осталось! 🐸✅',
  ],
  frogDone: [
    '🐸 Лягушка съедена! Маг начал день правильно!',
    '🐸 Самое сложное — позади! Марк Твен гордится!',
    '🐸 Съел лягушку! Остальное — легкотня! 🎉',
    '🐸 Бам! Лягушка побеждена! Ты — Гриффиндор! 🦁',
    '🐸 Утренняя лягушка съедена! День героя начался!',
  ],
  pomodoroBreak: [
    'Перерыв! Время для шоколадной лягушки 🍫🐸',
    'Отдыхай, маг! Даже Гермиона делала паузы 📚',
    '25 минут фокуса — ты маг продуктивности! ✨',
    'Перерыв! Выпей зелье... то есть чай ☕',
  ],
};

const funQuotesEn = {
  allClear: [
    'All done! Even Dumbledore would be proud 🧙‍♂️',
    'Free as a Golden Snitch! ✨',
    'The orb is clear — nothing forgotten! 🔮',
    'Time to relax — this wizard earned it 💤',
    'Clear smoke — all done! Expecto Patronum! 🦌',
    'Neville is jealous — you remember everything!',
    'Pareto says 80% is done. The rest? Optional 😄',
    'No frogs left! 🐸✅',
  ],
  frogDone: [
    '🐸 Frog eaten! You started the day right!',
    '🐸 Hardest task — done! Mark Twain is proud!',
    '🐸 Ate the frog! Everything else is easy! 🎉',
    '🐸 Boom! Frog defeated! True Gryffindor! 🦁',
    '🐸 Morning frog eaten! Hero day has begun!',
  ],
  pomodoroBreak: [
    'Break time! Grab a Chocolate Frog 🍫🐸',
    'Rest up, wizard! Even Hermione took breaks 📚',
    '25 min of focus — you are a productivity wizard! ✨',
    'Break time! Have a potion... I mean, tea ☕',
  ],
};

export type QuoteCategory = 'allClear' | 'frogDone' | 'pomodoroBreak';

export function getRandomQuote(lang: 'ru' | 'en', category: QuoteCategory): string {
  const quotes = lang === 'ru' ? funQuotesRu[category] : funQuotesEn[category];
  return quotes[Math.floor(Math.random() * quotes.length)];
}

export const soundLabels: Record<SoundType, { ru: string; en: string }> = {
  magic: { ru: '✨ Магический перезвон', en: '✨ Magic chime' },
  bell: { ru: '🔔 Колокольчик', en: '🔔 Bell' },
  gong: { ru: '🎵 Гонг', en: '🎵 Gong' },
  piano: { ru: '🎹 Пиано', en: '🎹 Piano' },
  harp: { ru: '🎻 Арфа', en: '🎻 Harp' },
};
