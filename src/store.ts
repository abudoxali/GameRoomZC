import { openDB } from "idb";
import { z } from "zod";
import {
  initialState,
  stateSchema,
  sessionSchema,
  settingsSchema,
  nextDate,
  today,
  type State,
  type Session,
  type Settings,
} from "./model";
const backupSchema = z
  .object({
    application: z.literal("GameRoomZC"),
    exportedAt: z.string().datetime(),
    state: stateSchema,
  })
  .strict();
export function validateBackup(json: string): State {
  try {
    return backupSchema.parse(JSON.parse(json)).state;
  } catch {
    throw Error(
      "النسخة الاحتياطية غير صالحة أو إصدارها غير مدعوم؛ لم تتغير البيانات",
    );
  }
}
export class Register {
  constructor(public name = "gameroomzc") {}
  private async connection() {
    const db = await openDB(this.name, 1, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) db.createObjectStore("register");
      },
    });
    db.addEventListener("versionchange", () => db.close());
    return db;
  }
  private async change(update: (s: State) => void): Promise<State> {
    const db = await this.connection();
    const tx = db.transaction("register", "readwrite");
    try {
      const raw = await tx.store.get("state");
      const state = raw === undefined ? initialState() : stateSchema.parse(raw);
      update(state);
      state.revision++;
      const validated = stateSchema.parse(state);
      await tx.store.put(validated, "state");
      await tx.done;
      return validated;
    } catch (e) {
      try {
        tx.abort();
      } catch {
        /* Already completed. */
      }
      await tx.done.catch(() => {});
      throw e;
    } finally {
      db.close();
    }
  }
  async read(): Promise<State> {
    const db = await this.connection();
    try {
      const raw = await db.get("register", "state");
      if (raw !== undefined) return stateSchema.parse(raw);
    } finally {
      db.close();
    }
    return this.change(() => {});
  }
  private editable(s: State, day: string) {
    if (
      day !== s.currentDay ||
      s.days.find((d) => d.date === day)?.status !== "open"
    )
      throw Error("اليوم مغلق أو تقريره بانتظار التأكيد؛ لا يمكن تعديل سجلاته");
  }
  async save(value: Session, expectedUpdatedAt?: string): Promise<State> {
    const v = sessionSchema.parse(value);
    return this.change((s) => {
      this.editable(s, v.day);
      const i = s.sessions.findIndex((x) => x.id === v.id);
      if (i >= 0) {
        const old = s.sessions[i];
        if (
          !expectedUpdatedAt ||
          old.updatedAt !== expectedUpdatedAt ||
          old.day !== v.day
        )
          throw Error(
            "تغيرت الجلسة في نافذة أخرى أو تم حفظها مسبقًا؛ حدّث السجل",
          );
        s.sessions[i] = {
          ...v,
          createdAt: old.createdAt,
          updatedAt: new Date(
            Math.max(Date.now(), Date.parse(old.updatedAt) + 1),
          ).toISOString(),
        };
      } else {
        if (expectedUpdatedAt) throw Error("تم حذف الجلسة في نافذة أخرى");
        s.sessions.push(v);
      }
    });
  }
  async remove(id: string, expectedUpdatedAt: string): Promise<State> {
    return this.change((s) => {
      const v = s.sessions.find((x) => x.id === id);
      if (!v || v.updatedAt !== expectedUpdatedAt)
        throw Error("تغيرت الجلسة؛ حدّث السجل قبل الحذف");
      this.editable(s, v.day);
      s.sessions = s.sessions.filter((x) => x.id !== id);
    });
  }
  private expectedDay(s: State, day?: string) {
    if (day && day !== s.currentDay)
      throw Error("تغير اليوم التشغيلي في نافذة أخرى؛ حدّث السجل");
  }
  async prepare(expectedDay?: string): Promise<State> {
    return this.change((s) => {
      this.expectedDay(s, expectedDay);
      this.editable(s, s.currentDay);
      if (
        s.sessions.some((x) => x.day === s.currentDay && x.status === "active")
      )
        throw Error("يجب إنهاء جميع الجلسات النشطة قبل إغلاق اليوم");
      const d = s.days.find((d) => d.date === s.currentDay)!;
      d.status = "pending";
      d.preparedAt = new Date().toISOString();
    });
  }
  async cancelClose(expectedDay?: string): Promise<State> {
    return this.change((s) => {
      this.expectedDay(s, expectedDay);
      const d = s.days.find((d) => d.date === s.currentDay)!;
      if (d.status !== "pending") throw Error("لا يوجد إغلاق قيد الانتظار");
      d.status = "open";
      d.preparedAt = null;
    });
  }
  async confirmClose(
    expectedDay?: string,
    expectedRevision?: number,
  ): Promise<State> {
    return this.change((s) => {
      this.expectedDay(s, expectedDay);
      if (expectedRevision !== undefined && s.revision !== expectedRevision)
        throw Error(
          "تغير السجل بعد تنزيل التقرير؛ نزّل التقرير مرة أخرى وأكد حفظ النسخة الجديدة",
        );
      const d = s.days.find((d) => d.date === s.currentDay)!;
      if (d.status !== "pending") throw Error("يجب تنزيل التقرير أولًا");
      d.status = "closed";
      d.closedAt = new Date().toISOString();
      let next = nextDate(d.date);
      if (next < today()) next = today();
      while (s.days.some((d) => d.date === next)) next = nextDate(next);
      s.currentDay = next;
      s.days.push({
        date: next,
        status: "open",
        closedAt: null,
        preparedAt: null,
      });
    });
  }
  async settings(value: Settings): Promise<State> {
    const settings = settingsSchema.parse(value);
    return this.change((s) => {
      s.settings = settings;
    });
  }
  async backup(): Promise<string> {
    return JSON.stringify(
      {
        application: "GameRoomZC",
        exportedAt: new Date().toISOString(),
        state: await this.read(),
      },
      null,
      2,
    );
  }
  async restore(json: string): Promise<State> {
    const incoming = validateBackup(json);
    return this.change((s) => {
      if (
        !s.sessions.length &&
        s.days.length === 1 &&
        s.days[0].status === "open"
      ) {
        Object.assign(s, incoming);
        return;
      }
      if (incoming.currentDay !== s.currentDay)
        throw Error(
          "تختلف الأيام التشغيلية؛ استعد النسخة في ملف متصفح فارغ لتجنب فقد البيانات",
        );
      const same = (a: unknown, b: unknown) =>
        JSON.stringify(a) === JSON.stringify(b);
      const existingClosed = new Set(
        s.days.filter((d) => d.status === "closed").map((d) => d.date),
      );
      for (const d of incoming.days) {
        const old = s.days.find((x) => x.date === d.date);
        if (old && !same(old, d))
          throw Error("تعارض في حالة يوم محفوظ؛ لم تتغير البيانات");
        if (!old) s.days.push(d);
      }
      for (const v of incoming.sessions) {
        const old = s.sessions.find((x) => x.id === v.id);
        if (old && !same(old, v))
          throw Error("تعارض في نسخة جلسة محفوظة؛ لم تتغير البيانات");
        if (!old) {
          if (existingClosed.has(v.day))
            throw Error("تعارض في أرشيف يوم مغلق؛ لم تتغير البيانات");
          s.sessions.push(v);
        }
      }
    });
  }
}
