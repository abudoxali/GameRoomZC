import { test, expect, type Page } from "@playwright/test";
async function openDetails(page: Page) {
  const panel = page.locator("dialog .form-details");
  if ((await panel.getAttribute("open")) === null)
    await panel.locator("summary").click();
}
async function dayOptions(page: Page) {
  const menu = page.locator("details.day-menu");
  if ((await menu.getAttribute("open")) === null)
    await menu.locator("summary").click();
}

import ExcelJS from "exceljs";
test("Arabic daily operation, persistence, Excel, safe close, archive and backup restoration", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (e) => {
    if (e.type() === "error") errors.push(e.text());
  });
  await page.goto("./");
  await expect(
    page.getByRole("heading", { name: "السجل اليومي", exact: true }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await page.getByRole("button", { name: "إضافة جلسة", exact: true }).click();
  await page.getByLabel("الرقم الجامعي للطالب").fill("TEST001");
  await page.getByLabel("اسم الطالب").fill("أحمد محمد");
  await page.screenshot({
    path: `test-results/${test.info().project.name}-add-session.png`,
  });
  await openDetails(page);
  await page.getByLabel("وقت البداية").fill("2026-11-03T23:30");
  await page.getByRole("button", { name: "بدء الجلسة", exact: true }).click();
  await expect(
    page.getByText("TEST001", { exact: true }).filter({ visible: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("TEST001", { exact: true }).filter({ visible: true }),
  ).toBeVisible();
  await dayOptions(page);
  await page.getByRole("button", { name: "إنهاء اليوم", exact: true }).click();
  await expect(page.getByText(/توجد ١ جلسات نشطة/)).toBeVisible();
  await page.getByRole("button", { name: "مراجعة الجلسات النشطة" }).click();
  await page
    .getByRole("button", { name: "إنهاء الجلسة TEST001", exact: true })
    .click();
  await openDetails(page);
  await page.getByLabel("وقت النهاية").fill("2026-11-04T00:30");
  await page.getByLabel("السعر النهائي بالجنيه المصري").fill("12.50");
  await page.getByRole("button", { name: "حفظ الجلسة المكتملة" }).click();
  await expect(
    page.getByText("TEST001", { exact: true }).filter({ visible: true }),
  ).toBeHidden();
  await page.getByLabel("تصفية حسب الحالة").selectOption("all");
  await expect(
    page.getByText("TEST001", { exact: true }).filter({ visible: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "تعديل الجلسة TEST001" }).click();
  await page.getByLabel("السعر النهائي بالجنيه المصري").fill("15.25");
  await page.getByRole("button", { name: "حفظ الجلسة المكتملة" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await page.getByLabel("البحث في الجلسات").fill("أحمد");
  await expect(
    page.getByText("أحمد محمد", { exact: true }).filter({ visible: true }),
  ).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: `test-results/${test.info().project.name}-named-session.png`,
    fullPage: true,
  });
  await page.getByLabel("البحث في الجلسات").fill("nothing");
  const downloadPromise = page.waitForEvent("download");
  await dayOptions(page);
  await page.getByRole("button", { name: "تصدير إكسل" }).click();
  const report = await downloadPromise;
  expect(report.suggestedFilename()).toMatch(
    /^GameRoomZC-\d{4}-\d{2}-\d{2}\.xlsx$/,
  );
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile((await report.path())!);
  expect(workbook.getWorksheet("السجل اليومي")!.getCell("A6").value).toBe(
    "TEST001",
  );
  expect(workbook.getWorksheet("الملخص")!.getCell("B9").value).toBe(15.25);
  expect(workbook.getWorksheet("تفاصيل الجلسات")!.getCell("B2").value).toBe(
    "أحمد محمد",
  );
  await page.getByLabel("البحث في الجلسات").fill("");
  await dayOptions(page);
  await page.getByRole("button", { name: "إنهاء اليوم", exact: true }).click();
  const closeDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "تجهيز التقرير وتنزيله" }).click();
  await closeDownload;
  await expect(
    page.getByRole("button", { name: "أرشفة اليوم وفتح سجل جديد" }),
  ).toBeDisabled();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "تأكيد حفظ التقرير" }),
  ).toBeVisible();
  await expect(page.getByRole("checkbox")).toBeDisabled();
  const reDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "تنزيل التقرير مرة أخرى" }).click();
  await reDownload;
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "أرشفة اليوم وفتح سجل جديد" }).click();
  await expect(
    page.getByText("TEST001", { exact: true }).filter({ visible: true }),
  ).toBeHidden();
  await page
    .getByRole("link", { name: "السجلات السابقة", exact: true })
    .click();
  await expect(
    page.getByText("TEST001", { exact: true }).filter({ visible: true }),
  ).toBeVisible();
  await expect(page.getByText("يوم مؤرشف", { exact: true })).toBeVisible();
  await page.screenshot({
    path: `test-results/${test.info().project.name}-history.png`,
    fullPage: true,
  });
  await expect(
    page.getByRole("button", { name: "تعديل الجلسة TEST001" }),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "الإعدادات", exact: true }).click();
  const backupPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "تنزيل نسخة احتياطية", exact: true })
    .click();
  const backup = await backupPromise;
  const file = await backup.path();
  expect(file).toBeTruthy();
  await page.getByLabel("اختيار نسخة احتياطية").setInputFiles(file!);
  await page.getByRole("button", { name: "تأكيد الاستعادة" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
  await page.screenshot({
    path: `test-results/${test.info().project.name}-settings.png`,
    fullPage: true,
  });
  await page.getByRole("link", { name: "السجل اليومي", exact: true }).click();
  await page.screenshot({
    path: `test-results/${test.info().project.name}-dashboard.png`,
    fullPage: true,
  });
});

test("sessions survive closing and restarting a real browser profile", async ({
  playwright,
  baseURL,
}, info) => {
  const profile = info.outputPath("persistent-profile");
  const options = {
    headless: true,
    baseURL,
    channel: process.env.PLAYWRIGHT_CHANNEL,
  };
  let context = await playwright.chromium.launchPersistentContext(
    profile,
    options,
  );
  try {
    const page = await context.newPage();
    await page.goto("./");
    await page.getByRole("button", { name: "إضافة جلسة", exact: true }).click();
    await page.getByLabel("الرقم الجامعي للطالب").fill("RESTART001");
    await page.getByRole("button", { name: "بدء الجلسة", exact: true }).click();
    await expect(
      page.getByText("RESTART001", { exact: true }).filter({ visible: true }),
    ).toBeVisible();
  } finally {
    await context.close();
  }
  context = await playwright.chromium.launchPersistentContext(profile, options);
  try {
    const page = await context.newPage();
    await page.goto("./");
    await expect(
      page.getByText("RESTART001", { exact: true }).filter({ visible: true }),
    ).toBeVisible();
  } finally {
    await context.close();
  }
});

test("configured rates are optional, transparent and can be overridden", async ({
  page,
}) => {
  await page.goto("./#settings");
  const field = page.getByRole("group", { name: "البلياردو", exact: true });
  await field
    .getByLabel("الطاولات أو الأجهزة أو أنواع الألعاب")
    .fill("طاولة ١\nطاولة ٢");
  await field.getByLabel("سعر الساعة بالجنيه").fill("30");
  await page.getByRole("button", { name: "حفظ الإعدادات" }).click();
  await expect(page.getByRole("status")).toContainText("تم حفظ الإعدادات");
  await page.getByRole("link", { name: "السجل اليومي", exact: true }).click();
  await page.getByRole("button", { name: "إضافة جلسة", exact: true }).click();
  await page.getByLabel("الرقم الجامعي للطالب").fill("RATE001");
  await openDetails(page);
  await page.getByLabel("الطاولة أو الجهاز أو نوع اللعبة").fill("طاولة ١");
  await openDetails(page);
  await page.getByLabel("وقت البداية").fill("2026-11-03T10:00");
  await page.getByRole("button", { name: "بدء الجلسة", exact: true }).click();
  await page.getByRole("button", { name: "إنهاء الجلسة RATE001" }).click();
  await openDetails(page);
  await page.getByLabel("وقت النهاية").fill("2026-11-03T10:30");
  await page.getByRole("button", { name: "استخدام السعر" }).click();
  await expect(page.getByLabel("السعر النهائي بالجنيه المصري")).toHaveValue(
    "15",
  );
  await page.getByLabel("السعر النهائي بالجنيه المصري").fill("10");
  await page.getByRole("button", { name: "حفظ الجلسة المكتملة" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await page.getByRole("button", { name: "تعديل الجلسة RATE001" }).click();
  await expect(page.getByLabel("السعر النهائي بالجنيه المصري")).toHaveValue(
    "10",
  );
});
test("keyboard cancellation, deletion, invalid restoration and responsive empty register", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByRole("button", { name: "إضافة جلسة", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await page.getByRole("button", { name: "إضافة جلسة", exact: true }).click();
  await page.getByLabel("الرقم الجامعي للطالب").fill("TEST002");
  await page.getByRole("button", { name: "بدء الجلسة", exact: true }).click();
  await page.getByRole("button", { name: "تعديل الجلسة TEST002" }).click();
  await page.getByRole("button", { name: "حذف الجلسة TEST002" }).click();
  await page.getByRole("button", { name: "تأكيد الحذف" }).click();
  await expect(page.getByText("TEST002", { exact: true })).toBeHidden();
  await page.getByRole("link", { name: "الإعدادات", exact: true }).click();
  await page.getByLabel("اختيار نسخة احتياطية").setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"invalid":true}'),
  });
  await expect(page.getByRole("alert")).toContainText("غير صالحة");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("invalid time errors remain readable inside the active modal", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByRole("button", { name: "إضافة جلسة", exact: true }).click();
  await page.getByLabel("الرقم الجامعي للطالب").fill("INVALID001");
  await openDetails(page);
  await page.getByLabel("وقت البداية").fill("2026-11-03T12:00");
  await page.getByRole("button", { name: "بدء الجلسة", exact: true }).click();
  await page.getByRole("button", { name: "إنهاء الجلسة INVALID001" }).click();
  await openDetails(page);
  await page.getByLabel("وقت النهاية").fill("2026-11-03T11:00");
  await page.getByLabel("السعر النهائي بالجنيه المصري").fill("10");
  await page.getByRole("button", { name: "حفظ الجلسة المكتملة" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toBeVisible();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "أوقات",
  );
});

test("failed storage writes display Arabic errors and do not show unsaved records", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (value, key) {
      if (this.name === "register" && value.sessions?.length)
        throw new DOMException("Quota exhausted", "QuotaExceededError");
      return original.call(this, value, key);
    };
  });
  await page.goto("./");
  await page.getByRole("button", { name: "إضافة جلسة", exact: true }).click();
  await page.getByLabel("الرقم الجامعي للطالب").fill("UNSAVED001");
  await page.getByRole("button", { name: "بدء الجلسة", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "حفظ البيانات محليًا",
  );
  await page.reload();
  await expect(page.getByText("UNSAVED001", { exact: true })).toHaveCount(0);
  await expect(
    page.getByText("لا توجد جلسات البلياردو", { exact: true }),
  ).toBeVisible();
});

test("two operator tabs cannot silently overwrite a changed session", async ({
  page,
  context,
}) => {
  await page.goto("./");
  await page.getByRole("button", { name: "إضافة جلسة", exact: true }).click();
  await page.getByLabel("الرقم الجامعي للطالب").fill("TABS001");
  await page.getByRole("button", { name: "بدء الجلسة", exact: true }).click();
  const other = await context.newPage();
  await other.goto("./");
  await other.getByRole("button", { name: "تعديل الجلسة TABS001" }).click();
  await page.getByRole("button", { name: "تعديل الجلسة TABS001" }).click();
  await openDetails(page);
  await page
    .getByLabel("الطاولة أو الجهاز أو نوع اللعبة")
    .fill("التعديل الأول");
  await page.getByRole("button", { name: "حفظ التعديلات" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await openDetails(other);
  await other
    .getByLabel("الطاولة أو الجهاز أو نوع اللعبة")
    .fill("التعديل القديم");
  await other.getByRole("button", { name: "حفظ التعديلات" }).click();
  await expect(other.getByRole("dialog").getByRole("alert")).toContainText(
    "نافذة أخرى",
  );
  await other.reload();
  await expect(
    other.getByText("التعديل الأول", { exact: true }).filter({ visible: true }),
  ).toBeVisible();
  await other.close();
});

test("closing acknowledgment stays tied to the downloaded snapshot across operator tabs", async ({
  page,
  context,
}) => {
  await page.goto("./");
  await dayOptions(page);
  await page.getByRole("button", { name: "إنهاء اليوم", exact: true }).click();
  let file = page.waitForEvent("download");
  await page.getByRole("button", { name: "تجهيز التقرير وتنزيله" }).click();
  await file;
  const other = await context.newPage();
  await other.goto("./");
  await other.getByRole("button", { name: "العودة للسجل" }).click();
  await dayOptions(other);
  await other.getByRole("button", { name: "إنهاء اليوم", exact: true }).click();
  const otherFile = other.waitForEvent("download");
  await other.getByRole("button", { name: "تجهيز التقرير وتنزيله" }).click();
  await otherFile;
  await page.bringToFront();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "أرشفة اليوم وفتح سجل جديد" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "تغير السجل بعد تنزيل التقرير",
  );
  file = page.waitForEvent("download");
  await page.getByRole("button", { name: "تنزيل التقرير مرة أخرى" }).click();
  await file;
  await expect(page.getByRole("checkbox")).not.toBeChecked();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "أرشفة اليوم وفتح سجل جديد" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await other.close();
});

test("larger Arabic type stays readable without page overflow on compact phones and tablets", async ({
  page,
}) => {
  await page.goto("./");
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(
      page.getByRole("button", { name: "إضافة جلسة", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  await page.getByRole("button", { name: "إضافة جلسة", exact: true }).click();
  await expect(page.getByLabel("اسم الطالب")).toBeVisible();
  await expect(page.getByLabel("وقت البداية")).toBeHidden();
});
