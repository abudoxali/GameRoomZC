import { z } from "zod";
export const activities = ["billiards", "playstation"] as const;
export type Activity = (typeof activities)[number];
export const activityLabel: Record<Activity, string> = {
  billiards: "البلياردو",
  playstation: "البلايستيشن",
};
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) =>
      !Number.isNaN(Date.parse(v)) &&
      new Date(v).toISOString().slice(0, 10) === v,
  );
const timestamp = z.string().datetime();
const money = z.number().int().min(0).max(100_000_000);
export const sessionSchema = z
  .object({
    id: z.string().uuid(),
    studentId: z
      .string()
      .trim()
      .regex(/^[0-9A-Za-z٠-٩-]{1,30}$/),
    activity: z.enum(activities),
    equipment: z.string().trim().max(80),
    day: date,
    startAt: timestamp,
    endAt: timestamp.nullable(),
    price: money.nullable(),
    status: z.enum(["active", "completed"]),
    createdAt: timestamp,
    updatedAt: timestamp,
  })
  .strict()
  .superRefine((s, c) => {
    if (
      (s.status === "completed" && (!s.endAt || s.price === null)) ||
      (s.status === "active" && (s.endAt !== null || s.price !== null))
    )
      c.addIssue({ code: "custom", message: "بيانات حالة الجلسة غير متوافقة" });
    if (
      s.endAt &&
      (Date.parse(s.endAt) <= Date.parse(s.startAt) ||
        Date.parse(s.endAt) - Date.parse(s.startAt) > 86400000)
    )
      c.addIssue({
        code: "custom",
        message: "وقت النهاية يجب أن يلي البداية بمدة لا تتجاوز ٢٤ ساعة",
      });
  });
export type Session = z.infer<typeof sessionSchema>;
export const settingsSchema = z
  .object({
    equipment: z
      .object({
        billiards: z.array(z.string().trim().min(1).max(80)).max(30),
        playstation: z.array(z.string().trim().min(1).max(80)).max(30),
      })
      .strict(),
    rates: z
      .object({ billiards: money.nullable(), playstation: money.nullable() })
      .strict(),
  })
  .strict();
export type Settings = z.infer<typeof settingsSchema>;
export const daySchema = z
  .object({
    date,
    status: z.enum(["open", "pending", "closed"]),
    preparedAt: timestamp.nullable(),
    closedAt: timestamp.nullable(),
  })
  .strict()
  .superRefine((d, c) => {
    if (
      (d.status === "open" && (d.preparedAt || d.closedAt)) ||
      (d.status === "pending" && (!d.preparedAt || d.closedAt)) ||
      (d.status === "closed" && (!d.preparedAt || !d.closedAt))
    )
      c.addIssue({ code: "custom", message: "بيانات إغلاق اليوم غير صحيحة" });
  });
export const stateSchema = z
  .object({
    version: z.literal(1),
    revision: z.number().int().nonnegative(),
    currentDay: date,
    sessions: z.array(sessionSchema).max(100000),
    days: z.array(daySchema).min(1).max(10000),
    settings: settingsSchema,
  })
  .strict()
  .superRefine((s, c) => {
    const fail = (message: string) => c.addIssue({ code: "custom", message });
    if (
      new Set(s.sessions.map((v) => v.id)).size !== s.sessions.length ||
      new Set(s.days.map((v) => v.date)).size !== s.days.length
    )
      fail("توجد سجلات مكررة");
    if (
      s.days.filter((d) => d.status !== "closed").length !== 1 ||
      !s.days.some((d) => d.date === s.currentDay && d.status !== "closed")
    )
      fail("اليوم التشغيلي غير صحيح");
    if (s.sessions.some((v) => !s.days.some((d) => d.date === v.day)))
      fail("جلسة بدون سجل يومي");
    if (
      s.sessions.some(
        (v) =>
          v.status === "active" &&
          s.days.find((d) => d.date === v.day)?.status !== "open",
      )
    )
      fail("توجد جلسة نشطة في يوم مغلق");
  });
export type State = z.infer<typeof stateSchema>;
export function cairoInput(value = new Date().toISOString()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const p = (k: string) => parts.find((v) => v.type === k)!.value;
  return `${p("year")}-${p("month")}-${p("day")}T${p("hour")}:${p("minute")}`;
}
export function today() {
  return cairoInput().slice(0, 10);
}
export function fromCairo(input: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(input))
    throw Error("أدخل تاريخًا ووقتًا صحيحين");
  const nominal = Date.parse(input + "Z");
  let guess = nominal;
  for (let i = 0; i < 3; i++)
    guess +=
      nominal - Date.parse(cairoInput(new Date(guess).toISOString()) + "Z");
  const iso = new Date(guess).toISOString();
  if (cairoInput(iso) !== input)
    throw Error("هذا الوقت غير موجود بسبب تغيير التوقيت الصيفي");
  return iso;
}
export function nextDate(value: string) {
  return new Date(Date.parse(value) + 86400000).toISOString().slice(0, 10);
}
export function initialState(day = today()): State {
  return {
    version: 1,
    revision: 0,
    currentDay: day,
    sessions: [],
    days: [{ date: day, status: "open", preparedAt: null, closedAt: null }],
    settings: {
      equipment: { billiards: [], playstation: [] },
      rates: { billiards: null, playstation: null },
    },
  };
}
export function totals(sessions: Session[]) {
  const completed = sessions.filter((s) => s.status === "completed");
  return {
    count: sessions.length,
    active: sessions.length - completed.length,
    completed: completed.length,
    revenue: completed.reduce((t, s) => t + (s.price ?? 0), 0),
  };
}
export function parsePrice(value: string) {
  if (!/^\d+(\.\d{1,2})?$/.test(value))
    throw Error("أدخل سعرًا صحيحًا بالجنيه، بحد أقصى منزلتين عشريتين");
  const p = Math.round(Number(value) * 100);
  return money.parse(p);
}
export const currency = (p: number) =>
  new Intl.NumberFormat("ar-EG", {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: 2,
  }).format(p / 100);
export const displayDate = (d: string) =>
  new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "full",
    timeZone: "Africa/Cairo",
  }).format(new Date(d + "T12:00:00Z"));
export const displayTime = (d: string) =>
  new Intl.DateTimeFormat("ar-EG", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Cairo",
  }).format(new Date(d));
export function duration(s: Session) {
  return Math.max(
    0,
    Math.round(
      ((s.endAt ? Date.parse(s.endAt) : Date.now()) - Date.parse(s.startAt)) /
        60000,
    ),
  );
}
