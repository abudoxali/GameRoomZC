import "fake-indexeddb/auto";
import { describe, it, expect } from "vitest";
import { Register } from "../src/store";
import { openDB } from "idb";
import {
  cairoInput,
  fromCairo,
  parsePrice,
  totals,
  sessionSchema,
  type Session,
} from "../src/model";
const create = (day: string, changes: Partial<Session> = {}): Session => ({
  id: crypto.randomUUID(),
  studentId: "2026001",
  day,
  activity: "billiards",
  equipment: "",
  startAt: "2026-11-03T21:30:00.000Z",
  endAt: null,
  price: null,
  status: "active",
  createdAt: "2026-11-03T21:30:00.000Z",
  updatedAt: "2026-11-03T21:30:00.000Z",
  ...changes,
});
const db = () => new Register(crypto.randomUUID());
describe("register persistence and safe operations", () => {
  it("creates immediately and survives a new database connection", async () => {
    const r = db(),
      s = await r.read(),
      v = create(s.currentDay);
    await r.save(v);
    expect((await new Register(r.name).read()).sessions[0].studentId).toBe(
      "2026001",
    );
  });
  it("rejects repeated submission but allows separate sessions for the same student", async () => {
    const r = db(),
      s = await r.read(),
      v = create(s.currentDay);
    await r.save(v);
    await expect(r.save(v)).rejects.toThrow();
    await r.save(create(s.currentDay));
    expect((await r.read()).sessions).toHaveLength(2);
  });
  it("completes, edits and deletes with stale-edit protection", async () => {
    const r = db(),
      s = await r.read(),
      v = create(s.currentDay);
    await r.save(v);
    const end = {
      ...v,
      status: "completed" as const,
      endAt: "2026-11-03T22:30:00.000Z",
      price: 1250,
    };
    const saved = await r.save(end, v.updatedAt);
    expect(totals(saved.sessions).revenue).toBe(1250);
    const current = saved.sessions[0];
    await expect(
      r.save({ ...current, price: 500 }, v.updatedAt),
    ).rejects.toThrow();
    const changed = await r.save(
      { ...current, price: 2000 },
      current.updatedAt,
    );
    expect(totals(changed.sessions).revenue).toBe(2000);
    await r.remove(v.id, changed.sessions[0].updatedAt);
    expect((await r.read()).sessions).toHaveLength(0);
  });
  it("blocks closing active sessions and freezes pending days through refresh", async () => {
    const r = db(),
      s = await r.read(),
      v = create(s.currentDay);
    await r.save(v);
    await expect(r.prepare()).rejects.toThrow();
    await r.remove(v.id, v.updatedAt);
    await r.prepare();
    expect((await new Register(r.name).read()).days[0].status).toBe("pending");
    await expect(r.save(create(s.currentDay))).rejects.toThrow();
    await r.cancelClose();
    expect((await r.read()).days[0].status).toBe("open");
  });
  it("archives once, keeps history and opens a fresh register", async () => {
    const r = db(),
      s = await r.read();
    await r.save(
      create(s.currentDay, {
        status: "completed",
        endAt: "2026-11-03T22:30:00.000Z",
        price: 3500,
      }),
    );
    await r.prepare();
    await r.confirmClose();
    const history = await new Register(r.name).read();
    expect(history.days.find((d) => d.date === s.currentDay)?.status).toBe(
      "closed",
    );
    expect(history.sessions).toHaveLength(1);
    expect(history.currentDay > s.currentDay).toBe(true);
    await expect(r.confirmClose()).rejects.toThrow();
    await expect(
      r.save(
        { ...history.sessions[0], price: 0 },
        history.sessions[0].updatedAt,
      ),
    ).rejects.toThrow();
  });
  it("backs up and restores all data, with idempotent merge", async () => {
    const r = db(),
      s = await r.read();
    await r.save(create(s.currentDay));
    const json = await r.backup(),
      target = db();
    await target.restore(json);
    await target.restore(json);
    expect((await target.read()).sessions).toHaveLength(1);
  });
  it("rejects invalid and conflicting backups without changing existing data", async () => {
    const r = db(),
      s = await r.read(),
      v = create(s.currentDay);
    await r.save(v);
    await expect(r.restore('{"version":999}')).rejects.toThrow();
    const backup = JSON.parse(await r.backup());
    backup.state.sessions[0].studentId = "999";
    await expect(r.restore(JSON.stringify(backup))).rejects.toThrow();
    expect((await r.read()).sessions[0].studentId).toBe("2026001");
  });
  it("serializes concurrent writes without losing either record", async () => {
    const r = db(),
      s = await r.read();
    await Promise.all([
      r.save(create(s.currentDay)),
      new Register(r.name).save(create(s.currentDay)),
    ]);
    expect((await r.read()).sessions).toHaveLength(2);
  });
  it("rejects invalid sessions before persisting", async () => {
    const r = db(),
      s = await r.read();
    await expect(
      r.save(create(s.currentDay, { studentId: "" })),
    ).rejects.toThrow();
    expect((await r.read()).sessions).toHaveLength(0);
  });
  it("restores a new archived day with multiple sessions into an existing register", async () => {
    const source = db(),
      s = await source.read();
    await source.save(
      create(s.currentDay, {
        status: "completed",
        endAt: "2026-11-03T22:30:00.000Z",
        price: 100,
      }),
    );
    await source.save(
      create(s.currentDay, {
        status: "completed",
        endAt: "2026-11-03T22:30:00.000Z",
        price: 200,
      }),
    );
    await source.prepare();
    await source.confirmClose();
    const json = await source.backup(),
      incoming = JSON.parse(json);
    const target = db(),
      current = await target.read();
    const original = await openDB(target.name, 1);
    const modified = {
      ...current,
      currentDay: incoming.state.currentDay,
      days: [incoming.state.days[1]],
    };
    await original.put("register", modified, "state");
    original.close();
    await target.save(create(incoming.state.currentDay));
    await target.restore(json);
    expect((await target.read()).sessions).toHaveLength(3);
  });
  it("does not overwrite invalid persisted state while trying to read or save", async () => {
    const r = db();
    await r.read();
    const raw = await openDB(r.name, 1);
    await raw.put("register", { version: 999 }, "state");
    await expect(r.read()).rejects.toThrow();
    await expect(r.save(create("2026-11-03"))).rejects.toThrow();
    expect(await raw.get("register", "state")).toEqual({ version: 999 });
    raw.close();
  });
  it("rejects closure confirmation from a stale operational day", async () => {
    const r = db(),
      s = await r.read();
    await r.prepare();
    await r.confirmClose();
    await r.prepare();
    await expect(r.confirmClose(s.currentDay)).rejects.toThrow();
    expect(
      (await r.read()).days.filter((d) => d.status === "closed"),
    ).toHaveLength(1);
  });
});
it("rejects acknowledgment for an outdated report after a closing cycle is cancelled and restarted", async () => {
  const r = db(),
    s = await r.read();
  const report = await r.prepare();
  await r.cancelClose();
  await r.prepare();
  await expect(r.confirmClose(s.currentDay, report.revision)).rejects.toThrow();
  expect((await r.read()).days[0].status).toBe("pending");
});

describe("time and financial rules", () => {
  it("handles Cairo midnight across explicit dates", () => {
    const a = fromCairo("2026-11-03T23:30"),
      b = fromCairo("2026-11-04T00:30");
    expect(Date.parse(b) - Date.parse(a)).toBe(3600000);
    expect(cairoInput(a)).toBe("2026-11-03T23:30");
  });
  it("rejects reversed or zero duration and more than 24 hours", () => {
    const v = create("2026-11-03", {
      status: "completed",
      price: 0,
      endAt: "2026-11-03T21:00:00.000Z",
    });
    expect(sessionSchema.safeParse(v).success).toBe(false);
    expect(sessionSchema.safeParse({ ...v, endAt: v.startAt }).success).toBe(
      false,
    );
    expect(
      sessionSchema.safeParse({ ...v, endAt: "2026-11-05T21:30:00.000Z" })
        .success,
    ).toBe(false);
  });
  it("uses integer piasters and counts completed revenue only", () => {
    expect(parsePrice("12.35")).toBe(1235);
    expect(() => parsePrice("-1")).toThrow();
    expect(() => parsePrice("1.234")).toThrow();
    expect(
      totals([
        create("2026-11-03"),
        create("2026-11-03", {
          status: "completed",
          endAt: "2026-11-03T22:00:00.000Z",
          price: 1235,
        }),
      ]),
    ).toEqual({ count: 2, active: 1, completed: 1, revenue: 1235 });
  });
});
