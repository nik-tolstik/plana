import { describe, expect, it } from "vitest";
import { parseQuickAdd } from "./quick-add.js";

// Фиксированный момент: суббота 2026-10-10, в Москве 18:00.
const NOW = new Date("2026-10-10T15:00:00Z");
const TZ = "Europe/Moscow";

function parse(text: string) {
  return parseQuickAdd(text, { now: NOW, timeZone: TZ });
}

describe("parseQuickAdd: база", () => {
  it("простой текст без токенов", () => {
    expect(parse("Купить хлеб")).toEqual({
      title: "Купить хлеб",
      dueDate: null,
      dueTime: null,
      rrule: null,
      priority: "none",
    });
  });

  it("пустая строка", () => {
    expect(parse("   ")).toEqual({
      title: "",
      dueDate: null,
      dueTime: null,
      rrule: null,
      priority: "none",
    });
  });

  it("только атрибуты — строка возвращается как заголовок без разбора", () => {
    expect(parse("!!!")).toEqual({
      title: "!!!",
      dueDate: null,
      dueTime: null,
      rrule: null,
      priority: "none",
    });
  });
});

describe("parseQuickAdd: приоритет", () => {
  it("! / !! / !!! отдельным словом", () => {
    expect(parse("Отчёт !").priority).toBe("low");
    expect(parse("Отчёт !!").priority).toBe("medium");
    expect(parse("Отчёт !!!").priority).toBe("high");
    expect(parse("Отчёт !!!").title).toBe("Отчёт");
  });

  it("восклицание, прилипшее к слову, — не приоритет", () => {
    expect(parse("Отчёт!").priority).toBe("none");
    expect(parse("Отчёт!").title).toBe("Отчёт!");
  });
});

describe("parseQuickAdd: слова-даты", () => {
  it("сегодня / завтра / послезавтра", () => {
    expect(parse("Позвонить сегодня").dueDate).toBe("2026-10-10");
    expect(parse("Позвонить завтра").dueDate).toBe("2026-10-11");
    expect(parse("Позвонить послезавтра").dueDate).toBe("2026-10-12");
    expect(parse("Позвонить завтра").title).toBe("Позвонить");
  });

  it("через N дней / недель / месяц", () => {
    expect(parse("Сделать через 3 дня").dueDate).toBe("2026-10-13");
    expect(parse("Сделать через день").dueDate).toBe("2026-10-11");
    expect(parse("Сделать через 2 недели").dueDate).toBe("2026-10-24");
    expect(parse("Сделать через месяц").dueDate).toBe("2026-11-10");
  });

  it("день недели: полная и краткая форма", () => {
    expect(parse("Встреча в понедельник").dueDate).toBe("2026-10-12");
    expect(parse("Встреча в пятницу").dueDate).toBe("2026-10-16"); // сегодня суббота
    expect(parse("Встреча в вс").dueDate).toBe("2026-10-11");
    expect(parse("Встреча во вторник").dueDate).toBe("2026-10-13");
  });

  it("слово с корнем дня недели внутри не матчится", () => {
    expect(parse("Средство от кашля").dueDate).toBeNull();
  });
});

describe("parseQuickAdd: числа и месяцы", () => {
  it("«25 декабря» в будущем — этот год", () => {
    expect(parse("Подарки 25 декабря").dueDate).toBe("2026-12-25");
    expect(parse("Подарки 25 дек").dueDate).toBe("2026-12-25");
  });

  it("«1 мая» в прошлом — следующий год", () => {
    expect(parse("Отпуск 1 мая").dueDate).toBe("2027-05-01");
  });

  it("с явным годом", () => {
    expect(parse("НГ 31 декабря 2027").dueDate).toBe("2027-12-31");
  });

  it("дд.мм без года: прошедшая — следующий год", () => {
    expect(parse("Оплата 05.01").dueDate).toBe("2027-01-05");
    expect(parse("Оплата 20.12").dueDate).toBe("2026-12-20");
  });

  it("дд.мм.гггг и дд.мм.гг", () => {
    expect(parse("Оплата 05.01.2027").dueDate).toBe("2027-01-05");
    expect(parse("Оплата 05.01.27").dueDate).toBe("2027-01-05");
  });

  it("ISO-дата", () => {
    expect(parse("Релиз 2026-11-01").dueDate).toBe("2026-11-01");
  });

  it("несуществующая дата не распознаётся", () => {
    expect(parse("Событие 31.02").dueDate).toBeNull();
    expect(parse("Событие 31.02").title).toBe("Событие 31.02");
  });
});

describe("parseQuickAdd: время", () => {
  it("«в 17» и «17:30»", () => {
    // 17:00 при now=18:00 уже прошло → дата завтра.
    expect(parse("Встреча в 17")).toEqual({
      title: "Встреча",
      dueDate: "2026-10-11",
      dueTime: "17:00",
      rrule: null,
      priority: "none",
    });
    expect(parse("Встреча 17:30 завтра")).toEqual({
      title: "Встреча",
      dueDate: "2026-10-11",
      dueTime: "17:30",
      rrule: null,
      priority: "none",
    });
  });

  it("время без даты: сегодня 18:00 — «в 17» уже прошло, значит завтра", () => {
    const result = parse("Встреча в 17");
    expect(result.dueDate).toBe("2026-10-11");
    expect(parse("Встреча в 19").dueDate).toBe("2026-10-10"); // ещё не прошло
  });

  it("невозможное время не матчится", () => {
    expect(parse("Встреча в 25").dueTime).toBeNull();
    expect(parse("Встреча в 25").title).toBe("Встреча в 25");
  });
});

describe("parseQuickAdd: комбинации", () => {
  it("дата + время + приоритет", () => {
    expect(parse("Созвон с командой в пятницу в 11 !!")).toEqual({
      title: "Созвон с командой",
      dueDate: "2026-10-16",
      dueTime: "11:00",
      rrule: null,
      priority: "medium",
    });
  });

  it("таймзона влияет на «сегодня»", () => {
    const lateEvening = new Date("2026-10-10T22:00:00Z");
    // В Москве уже 01:00 11-го — «в 23» не прошло, значит 11-е.
    const moscow = parseQuickAdd("Встреча в 23", { now: lateEvening, timeZone: "Europe/Moscow" });
    expect(moscow.dueDate).toBe("2026-10-11");
    // В UTC ещё 22:00 10-го — «в 23» не прошло, значит 10-е.
    const utc = parseQuickAdd("Встреча в 23", { now: lateEvening, timeZone: "UTC" });
    expect(utc.dueDate).toBe("2026-10-10");
  });
});

describe("parseQuickAdd: повторы", () => {
  it("простые слова-повторы", () => {
    expect(parse("Полив цветов ежедневно")).toEqual({
      title: "Полив цветов",
      dueDate: "2026-10-10",
      dueTime: null,
      rrule: "FREQ=DAILY",
      priority: "none",
    });
    expect(parse("Статус по будням").rrule).toBe("FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR");
    expect(parse("Уборка по выходным").rrule).toBe("FREQ=WEEKLY;BYDAY=SA,SU");
    expect(parse("Отчёт еженедельно").rrule).toBe("FREQ=WEEKLY");
    expect(parse("Инвентаризация ежемесячно").rrule).toBe("FREQ=MONTHLY");
    expect(parse("Медосмотр ежегодно").rrule).toBe("FREQ=YEARLY");
  });

  it("«каждый/каждые N …»", () => {
    expect(parse("Выписать корм каждый день").rrule).toBe("FREQ=DAILY");
    expect(parse("Зарплата каждую неделю").rrule).toBe("FREQ=WEEKLY");
    expect(parse("Стрижка каждые 2 недели").rrule).toBe("FREQ=WEEKLY;INTERVAL=2");
    expect(parse("Аренда каждые 3 месяца").rrule).toBe("FREQ=MONTHLY;INTERVAL=3");
    expect(parse("ТО каждые 2 года").rrule).toBe("FREQ=YEARLY;INTERVAL=2");
  });

  it("«каждую пятницу» — недельный повтор в день недели", () => {
    const result = parse("Встреча каждую пятницу");
    expect(result.rrule).toBe("FREQ=WEEKLY;BYDAY=FR");
    expect(result.dueDate).toBe("2026-10-16"); // ближайшая пятница
    expect(result.title).toBe("Встреча");
  });

  it("повтор без даты — сегодня, даже если время прошло", () => {
    // now = 18:00; «в 17» без повтора дало бы завтра.
    const result = parse("Зарядка каждый день в 17");
    expect(result.dueDate).toBe("2026-10-10");
    expect(result.dueTime).toBe("17:00");
    expect(result.rrule).toBe("FREQ=DAILY");
  });

  it("повтор с явной датой — дата не переопределяется", () => {
    const result = parse("Отчёт каждый месяц 25 декабря");
    expect(result.dueDate).toBe("2026-12-25");
    expect(result.rrule).toBe("FREQ=MONTHLY");
  });

  it("слово с корнем «кажд…» без единицы частоты — не повтор", () => {
    expect(parse("Каждодневный отчёт").rrule).toBeNull();
    expect(parse("Каждодневный отчёт").title).toBe("Каждодневный отчёт");
  });
});

describe("parseQuickAdd: якорь WEEKLY;BYDAY без явной даты", () => {
  it("«по будням» с субботы — первый якорь понедельник", () => {
    const result = parse("Статус по будням");
    expect(result.dueDate).toBe("2026-10-12");
  });

  it("«по выходным» с субботы — сегодня", () => {
    const result = parse("Уборка по выходным");
    expect(result.dueDate).toBe("2026-10-10");
  });
});
