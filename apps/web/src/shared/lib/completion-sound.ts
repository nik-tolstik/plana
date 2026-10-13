export type CompletionSoundId = "arpeggio" | "coin" | "chord" | "ding" | "drop";

/** Варианты звука завершения задачи; порядок = порядок в настройках. */
export const COMPLETION_SOUND_OPTIONS: ReadonlyArray<{
  id: CompletionSoundId;
  label: string;
}> = [
  { id: "arpeggio", label: "Арпеджио" },
  { id: "coin", label: "Монета" },
  { id: "chord", label: "Аккорд" },
  { id: "ding", label: "Динь" },
  { id: "drop", label: "Капля" },
];

const ENABLED_KEY = "plana.completionSound"; // "on" | "off"
const SOUND_ID_KEY = "plana.completionSoundId";
const DEFAULT_SOUND_ID: CompletionSoundId = "arpeggio";

/** Звук завершения включён по умолчанию; отключение хранится в localStorage. */
export function isCompletionSoundEnabled(): boolean {
  try {
    return globalThis.localStorage?.getItem(ENABLED_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setCompletionSoundEnabled(enabled: boolean): void {
  try {
    globalThis.localStorage?.setItem(ENABLED_KEY, enabled ? "on" : "off");
  } catch {
    // localStorage недоступен (приватный режим) — остаётся значение по умолчанию
  }
}

function isCompletionSoundId(value: string | null): value is CompletionSoundId {
  return COMPLETION_SOUND_OPTIONS.some((option) => option.id === value);
}

export function getCompletionSoundId(): CompletionSoundId {
  try {
    const saved = globalThis.localStorage?.getItem(SOUND_ID_KEY) ?? null;
    return isCompletionSoundId(saved) ? saved : DEFAULT_SOUND_ID;
  } catch {
    return DEFAULT_SOUND_ID;
  }
}

export function setCompletionSoundId(id: CompletionSoundId): void {
  try {
    globalThis.localStorage?.setItem(SOUND_ID_KEY, id);
  } catch {
    // localStorage недоступен — выбор живёт до перезагрузки
  }
}

let audioContext: AudioContext | null = null;

/**
 * Звук завершения задачи: синтез Web Audio без аудиофайлов. Контекст
 * создаётся лениво внутри клика — политика автовоспроизведения требует
 * пользовательского жеста.
 */
export function playCompletionSound(): void {
  if (!isCompletionSoundEnabled()) return;
  synthesize(getCompletionSoundId());
}

/** Прослушивание в настройках: играет выбранный вариант даже при выключенном звуке. */
export function previewCompletionSound(id: CompletionSoundId): void {
  synthesize(id);
}

type SoundSynth = (ctx: AudioContext, dest: AudioNode, start: number) => void;

function synthesize(id: CompletionSoundId): void {
  const AudioContextCtor = globalThis.AudioContext;
  if (!AudioContextCtor) return; // окружение без Web Audio (тесты)
  try {
    audioContext ??= new AudioContextCtor();
    void audioContext.resume?.();
    const master = audioContext.createGain();
    master.gain.value = 0.4;
    master.connect(audioContext.destination);
    SOUND_SYNTHS[id](audioContext, master, audioContext.currentTime);
  } catch {
    // Звук — необязательный декор: ошибка воспроизведения не должна ломать завершение.
  }
}

interface ToneOptions {
  freq: number;
  /** Смещение от начала звука, секунды. */
  at: number;
  gain: number;
  /** Затухание до тишины, секунды. */
  decay: number;
  type?: OscillatorType;
  /** Глиссандо частоты (эффект «капли»). */
  sweepTo?: number;
}

function tone(ctx: AudioContext, dest: AudioNode, opts: ToneOptions): void {
  const osc = ctx.createOscillator();
  osc.type = opts.type ?? "sine";
  osc.frequency.setValueAtTime(opts.freq, opts.at);
  if (opts.sweepTo !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(opts.sweepTo, opts.at + opts.decay);
  }
  const envelope = ctx.createGain();
  envelope.gain.setValueAtTime(0, opts.at);
  envelope.gain.linearRampToValueAtTime(opts.gain, opts.at + 0.006);
  envelope.gain.exponentialRampToValueAtTime(0.0001, opts.at + opts.decay);
  osc.connect(envelope);
  envelope.connect(dest);
  osc.start(opts.at);
  osc.stop(opts.at + opts.decay + 0.05);
}

/** Спектр челесты: тихие верхние обертоны дают «звон» вместо «пищалки». */
function withSparkle(
  ctx: AudioContext,
  dest: AudioNode,
  freq: number,
  at: number,
  gain: number,
  decay: number,
): void {
  tone(ctx, dest, { freq, at, gain, decay });
  tone(ctx, dest, { freq: freq * 2, at, gain: gain * 0.15, decay: decay * 0.7 });
}

const SOUND_SYNTHS: Record<CompletionSoundId, SoundSynth> = {
  // Мажорное арпеджио C5–E5–G5–C6: восходящее «уровень пройден».
  arpeggio(ctx, dest, start) {
    const notes = [523.25, 659.26, 783.99, 1046.5];
    notes.forEach((freq, index) => {
      withSparkle(ctx, dest, freq, start + index * 0.07, index === 3 ? 0.5 : 0.38, 0.35);
    });
  },
  // Аркадная монета: короткая B5 и яркая E6 — мгновенная «награда».
  coin(ctx, dest, start) {
    tone(ctx, dest, { freq: 987.77, at: start, gain: 0.16, decay: 0.08, type: "square" });
    tone(ctx, dest, { freq: 1318.51, at: start + 0.06, gain: 0.16, decay: 0.45, type: "square" });
  },
  // Тёплый мажорный аккорд «щипком», ноты встают друг за другом.
  chord(ctx, dest, start) {
    [523.25, 659.26, 783.99, 1046.5].forEach((freq, index) => {
      tone(ctx, dest, {
        freq,
        at: start + index * 0.03,
        gain: 0.25,
        decay: 0.65,
        type: "triangle",
      });
    });
  },
  // Один удар челесты E6 с обертонами.
  ding(ctx, dest, start) {
    tone(ctx, dest, { freq: 1318.51, at: start, gain: 0.5, decay: 0.55 });
    tone(ctx, dest, { freq: 1318.51 * 2, at: start, gain: 0.14, decay: 0.4 });
    tone(ctx, dest, { freq: 1318.51 * 3.01, at: start, gain: 0.05, decay: 0.3 });
  },
  // Капля: короткий «блюп» с подъёмом частоты.
  drop(ctx, dest, start) {
    tone(ctx, dest, { freq: 380, sweepTo: 950, at: start, gain: 0.5, decay: 0.14 });
  },
};
