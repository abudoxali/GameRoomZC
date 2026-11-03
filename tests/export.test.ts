import { it, expect } from "vitest";
import ExcelJS from "exceljs";
import { buildWorkbook } from "../src/export";
import type { Session } from "../src/model";
it("reopens a real RTL workbook with both paper registers, currency, dates and completed-only totals", async () => {
  const sample = (
    activity: Session["activity"],
    price: number | null,
    day = "2026-11-03",
  ): Session => ({
    id: crypto.randomUUID(),
    studentId: "001234",
    activity,
    price,
    day,
    equipment: "طاولة ١",
    status: price === null ? "active" : "completed",
    startAt: "2026-11-03T21:30:00.000Z",
    endAt: price === null ? null : "2026-11-03T22:30:00.000Z",
    createdAt: "2026-11-03T21:30:00.000Z",
    updatedAt: "2026-11-03T21:30:00.000Z",
  });
  const book = await buildWorkbook("2026-11-03", [
    sample("billiards", 1250),
    sample("playstation", 3000),
    sample("playstation", null),
    sample("billiards", 99900, "2026-11-02"),
  ]);
  const reopened = new ExcelJS.Workbook();
  await reopened.xlsx.load(await book.xlsx.writeBuffer());
  const daily = reopened.getWorksheet("السجل اليومي")!,
    summary = reopened.getWorksheet("الملخص")!;
  expect(daily.views[0].rightToLeft).toBe(true);
  expect(daily.getCell("A5").value).toBe("ID");
  expect(daily.getCell("H5").value).toBe("ID");
  expect(daily.getCell("A6").value).toBe("001234");
  expect(daily.getCell("E6").value).toBe(12.5);
  expect(daily.getCell("L7").value).toBe("غير نهائي");
  expect(daily.getCell("B6").numFmt).toBe("hh:mm");
  expect(daily.getCell("F6").value).toBeInstanceOf(Date);
  expect(daily.pageSetup.orientation).toBe("landscape");
  expect(summary.getCell("B4").value).toBe(1);
  expect(summary.getCell("B5").value).toBe(2);
  expect(summary.getCell("B6").value).toBe(2);
  expect(summary.getCell("B9").value).toBe(42.5);
  expect(summary.getCell("B10").value).toBe(1);
});
