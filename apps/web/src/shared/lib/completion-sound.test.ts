import { afterEach, describe, expect, it, vi } from "vitest";

function stubLocalStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
  });
  return store;
}

/** Заглушка AudioContext: считает запущенные осцилляторы. */
function stubAudioContext(): { started: number[] } {
  const started: number[] = [];
  vi.stubGlobal(
    "AudioContext",
    class {
      currentTime = 0;
      destination = {};
      resume = vi.fn();
      createGain() {
        return {
          gain: {
            value: 0,
            setValueAtTime: vi.fn(),
            linearRampToValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
        };
      }
      createOscillator() {
        const osc = {
          type: "",
          frequency: { value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
          connect: vi.fn(),
          start: () => started.push(1),
          stop: vi.fn(),
        };
        return osc;
      }
    },
  );
  return { started };
}

/**
 * Модуль кэширует AudioContext — между тестами нужен свежий экземпляр,
 * чтобы заглушки не ссылались на прошлые массивы.
 */
async function importSoundModule() {
  vi.resetModules();
  return import("./completion-sound");
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("completion-sound", () => {
  it("включён по умолчанию, когда localStorage пуст или недоступен", async () => {
    const { isCompletionSoundEnabled } = await importSoundModule();
    expect(isCompletionSoundEnabled()).toBe(true);
    stubLocalStorage();
    expect(isCompletionSoundEnabled()).toBe(true);
  });

  it("setCompletionSoundEnabled переключает и сохраняет настройку", async () => {
    stubLocalStorage();
    const { isCompletionSoundEnabled, setCompletionSoundEnabled } = await importSoundModule();
    setCompletionSoundEnabled(false);
    expect(isCompletionSoundEnabled()).toBe(false);
    setCompletionSoundEnabled(true);
    expect(isCompletionSoundEnabled()).toBe(true);
  });

  it("мелодия по умолчанию — арпеджио; сохранение и мусор игнорируются", async () => {
    stubLocalStorage();
    const { getCompletionSoundId, setCompletionSoundId } = await importSoundModule();
    expect(getCompletionSoundId()).toBe("arpeggio");
    setCompletionSoundId("coin");
    expect(getCompletionSoundId()).toBe("coin");
    localStorage.setItem("plana.completionSoundId", "nonsense");
    expect(getCompletionSoundId()).toBe("arpeggio");
  });

  it("каждый вариант запускает своё число осцилляторов", async () => {
    stubLocalStorage();
    const { started } = stubAudioContext();
    const { COMPLETION_SOUND_OPTIONS, previewCompletionSound } = await importSoundModule();
    // арпеджио: 4 ноты × 2 (нота + блеск), монета: 2, аккорд: 4, динь: 3, капля: 1
    const expected: Record<string, number> = {
      arpeggio: 8,
      coin: 2,
      chord: 4,
      ding: 3,
      drop: 1,
    };
    for (const { id } of COMPLETION_SOUND_OPTIONS) {
      started.length = 0;
      previewCompletionSound(id);
      expect(started.length, id).toBe(expected[id]);
    }
  });

  it("выключенная настройка не запускает осцилляторы", async () => {
    stubLocalStorage();
    const { started } = stubAudioContext();
    const { playCompletionSound, setCompletionSoundEnabled } = await importSoundModule();
    setCompletionSoundEnabled(false);
    playCompletionSound();
    expect(started.length).toBe(0);
  });

  it("прослушивание играет даже при выключенном звуке", async () => {
    stubLocalStorage();
    const { started } = stubAudioContext();
    const { previewCompletionSound, setCompletionSoundEnabled } = await importSoundModule();
    setCompletionSoundEnabled(false);
    previewCompletionSound("drop");
    expect(started.length).toBe(1);
  });

  it("playCompletionSound играет выбранную мелодию", async () => {
    stubLocalStorage();
    const { started } = stubAudioContext();
    const { playCompletionSound, setCompletionSoundId } = await importSoundModule();
    setCompletionSoundId("coin");
    playCompletionSound();
    expect(started.length).toBe(2);
  });

  it("не падает без Web Audio (тестовое окружение)", async () => {
    stubLocalStorage();
    const { playCompletionSound, previewCompletionSound } = await importSoundModule();
    expect(() => playCompletionSound()).not.toThrow();
    expect(() => previewCompletionSound("ding")).not.toThrow();
  });
});
