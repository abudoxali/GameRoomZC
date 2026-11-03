import {
  activityLabel,
  activities,
  cairoInput,
  totals,
  type Session,
} from "./model";
export async function buildWorkbook(
  day: string,
  sessions: Session[],
): Promise<import("exceljs").Workbook> {
  const { default: ExcelJS } = await import("exceljs");
  const book = new ExcelJS.Workbook();
  book.creator = "GameRoomZC";
  book.created = new Date();
  const rows = sessions
    .filter((s) => s.day === day)
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
  const sheet = book.addWorksheet("السجل اليومي", {
    views: [{ rightToLeft: true, state: "frozen", ySplit: 5 }],
    pageSetup: {
      paperSize: 9,
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.25,
        right: 0.25,
        top: 0.4,
        bottom: 0.4,
        header: 0.15,
        footer: 0.15,
      },
      printTitlesRow: "1:5",
    },
  });
  const title = (range: string, text: string) => {
    sheet.mergeCells(range);
    const c = sheet.getCell(range.split(":")[0]);
    c.value = text;
    c.font = {
      name: "Arial",
      size: 14,
      bold: true,
      color: { argb: "FF18284D" },
    };
    c.alignment = { horizontal: "center", vertical: "middle" };
  };
  title("A1:M1", "مدينة زويل للعلوم والتكنولوجيا والابتكار");
  title("A2:M2", `السجل اليومي لغرفة الألعاب — ${day}`);
  sheet.getRow(1).height = 28;
  sheet.getRow(2).height = 26;
  const count = Math.max(
    1,
    ...activities.map((a) => rows.filter((s) => s.activity === a).length),
  );
  for (const [index, activity] of activities.entries()) {
    const offset = index * 7;
    const start = index === 0 ? "A" : "H",
      end = index === 0 ? "F" : "M";
    title(`${start}4:${end}4`, `جدول ${activityLabel[activity]}`);
    const headings = ["ID", "من", "إلى", "النوع", "السعر", "التاريخ"];
    headings.forEach((h, i) => {
      sheet.getCell(5, offset + i + 1).value = h;
      sheet.getColumn(offset + i + 1).width = [17, 12, 12, 21, 15, 15][i];
    });
    const group = rows.filter((s) => s.activity === activity);
    for (let n = 0; n < count; n++) {
      const v = group[n],
        r = 6 + n;
      const values = v
        ? [
            v.studentId,
            new Date(cairoInput(v.startAt) + "Z"),
            v.endAt ? new Date(cairoInput(v.endAt) + "Z") : "نشطة",
            v.equipment || activityLabel[activity],
            v.status === "completed" ? (v.price ?? 0) / 100 : "غير نهائي",
            new Date(day + "T00:00:00Z"),
          ]
        : ["", "", "", "", "", ""];
      values.forEach((value, i) => {
        const c = sheet.getCell(r, offset + i + 1);
        c.value = value;
        c.numFmt =
          i === 1 || i === 2
            ? "hh:mm"
            : i === 4
              ? '#,##0.00 "ج.م."'
              : i === 5
                ? "yyyy-mm-dd"
                : "@";
      });
    }
    sheet.mergeCells(count + 7, offset + 1, count + 7, offset + 4);
    sheet.getCell(count + 7, offset + 1).value = "إجمالي الإيراد المكتمل";
    sheet.getCell(count + 7, offset + 5).value = totals(group).revenue / 100;
    sheet.getCell(count + 7, offset + 5).numFmt = '#,##0.00 "ج.م."';
    for (let r = 5; r <= count + 7; r++) {
      sheet.getRow(r).height = 26;
      for (let c = offset + 1; c <= offset + 6; c++) {
        const cell = sheet.getCell(r, c);
        cell.font = {
          name: "Arial",
          size: 11,
          bold: r === 5 || r === count + 7,
          color: { argb: r === 5 ? "FFFFFFFF" : "FF18284D" },
        };
        cell.alignment = {
          horizontal: "center",
          vertical: "middle",
          wrapText: true,
          readingOrder: "rtl",
        };
        cell.border = {
          top: { style: "thin", color: { argb: "FFD9DFE8" } },
          bottom: { style: "thin", color: { argb: "FFD9DFE8" } },
          left: { style: "thin", color: { argb: "FFD9DFE8" } },
          right: { style: "thin", color: { argb: "FFD9DFE8" } },
        };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: {
            argb: r === 5 ? "FF18284D" : r % 2 === 0 ? "FFF2F5FA" : "FFFFFFFF",
          },
        };
      }
    }
  }
  sheet.getColumn(7).width = 4;
  title(
    `A${count + 9}:M${count + 9}`,
    `إجمالي إيرادات اليوم المكتملة: ${(totals(rows).revenue / 100).toFixed(2)} ج.م.`,
  );
  title(
    `A${count + 10}:M${count + 10}`,
    "الجلسات النشطة أسعارها غير نهائية ولا تدخل في الإيرادات. الأوقات بتوقيت القاهرة.",
  );
  sheet.pageSetup.printArea = `A1:M${count + 10}`;
  sheet.headerFooter.oddFooter = "الصفحة &P من &N";
  const summary = book.addWorksheet("الملخص", {
    views: [{ rightToLeft: true }],
    pageSetup: { paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 1 },
  });
  summary.columns = [{ width: 42 }, { width: 28 }];
  const data = [
    ["ملخص غرفة الألعاب", null],
    ["تاريخ التقرير", new Date(day + "T00:00:00Z")],
    ["البيان", "القيمة"],
    [
      "عدد جلسات البلياردو",
      rows.filter((s) => s.activity === "billiards").length,
    ],
    [
      "عدد جلسات البلايستيشن",
      rows.filter((s) => s.activity === "playstation").length,
    ],
    ["عدد الجلسات المكتملة", totals(rows).completed],
    [
      "إيراد البلياردو المكتمل",
      totals(rows.filter((s) => s.activity === "billiards")).revenue / 100,
    ],
    [
      "إيراد البلايستيشن المكتمل",
      totals(rows.filter((s) => s.activity === "playstation")).revenue / 100,
    ],
    ["إجمالي الإيراد المكتمل", totals(rows).revenue / 100],
    ["جلسات نشطة بسعر غير نهائي", totals(rows).active],
  ];
  data.forEach((r) => summary.addRow(r));
  summary.getCell("B2").numFmt = "yyyy-mm-dd";
  [7, 8, 9].forEach((r) => (summary.getCell(r, 2).numFmt = '#,##0.00 "ج.م."'));
  summary.eachRow((row, r) => {
    row.height = 30;
    row.eachCell((cell) => {
      cell.font = {
        name: "Arial",
        size: 12,
        bold: r === 1 || r === 3 || r === 9,
        color: { argb: r === 3 ? "FFFFFFFF" : "FF18284D" },
      };
      cell.alignment = {
        horizontal: "right",
        vertical: "middle",
        readingOrder: "rtl",
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
          argb: r === 3 ? "FF18284D" : r % 2 === 0 ? "FFF2F5FA" : "FFFFFFFF",
        },
      };
    });
  });
  const details = book.addWorksheet("تفاصيل الجلسات", {
    views: [{ rightToLeft: true, state: "frozen", ySplit: 1 }],
    pageSetup: {
      paperSize: 9,
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      printTitlesRow: "1:1",
    },
  });
  details.columns = [
    { header: "ID", width: 18 },
    { header: "اسم الطالب", width: 30 },
    { header: "النشاط", width: 18 },
    { header: "النوع", width: 22 },
    { header: "من", width: 20 },
    { header: "إلى", width: 20 },
    { header: "السعر", width: 16 },
    { header: "التاريخ", width: 16 },
    { header: "الحالة", width: 16 },
  ];
  rows.forEach((s) =>
    details.addRow([
      s.studentId,
      s.studentName || "—",
      activityLabel[s.activity],
      s.equipment || "—",
      new Date(cairoInput(s.startAt) + "Z"),
      s.endAt ? new Date(cairoInput(s.endAt) + "Z") : "—",
      s.price === null ? "غير نهائي" : s.price / 100,
      new Date(day + "T00:00:00Z"),
      s.status === "active" ? "نشطة" : "مكتملة",
    ]),
  );
  details.eachRow((row, r) => {
    row.height = r === 1 ? 30 : 28;
    row.eachCell((cell, col) => {
      cell.font = {
        name: "Arial",
        size: 11,
        bold: r === 1,
        color: { argb: r === 1 ? "FFFFFFFF" : "FF24334D" },
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
          argb: r === 1 ? "FF18284D" : r % 2 === 0 ? "FFF2F5FA" : "FFFFFFFF",
        },
      };
      cell.alignment = {
        horizontal: "center",
        vertical: "middle",
        readingOrder: "rtl",
        wrapText: true,
      };
      if (r > 1)
        cell.numFmt =
          col === 5 || col === 6
            ? "yyyy-mm-dd hh:mm"
            : col === 7
              ? '#,##0.00 "ج.م."'
              : col === 8
                ? "yyyy-mm-dd"
                : "@";
    });
  });
  return book;
}
export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
export async function downloadReport(day: string, sessions: Session[]) {
  const book = await buildWorkbook(day, sessions);
  const buffer = await book.xlsx.writeBuffer();
  downloadBlob(
    new Blob([new Uint8Array(buffer)], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `GameRoomZC-${day}.xlsx`,
  );
}
