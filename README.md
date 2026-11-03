# GameRoomZC

Arabic-first, browser-local gaming room register for Zewail City. React, TypeScript, Vite, Tailwind CSS, Lucide, IndexedDB (`idb`) and ExcelJS. No backend, authentication, analytics, cloud database, or student-data uploads.

Production: https://abudoxali.github.io/GameRoomZC/

## Development

Use Node.js 24 and npm. Install the exact dependency tree with the committed lockfile:

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite, including `/GameRoomZC/`.

```sh
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm run preview
```

`PLAYWRIGHT_CHANNEL=msedge` optionally selects an installed Edge browser for local tests. `E2E_URL` can target a running build. Browser tests use isolated test profiles and synthetic IDs; never run them in an operator's real browser profile. No sample records are seeded in the application.

## Architecture and data integrity

- `src/model.ts`: versioned schemas, Cairo timezone conversion, integer-piaster prices and completed-only revenue.
- `src/store.ts`: atomic read/write transactions, unique UUID sessions, optimistic edit/delete checks, immutable archived days, recoverable closing state and validated, non-destructive JSON restore.
- `src/export.ts`: lazy-loaded ExcelJS, two side-by-side Arabic registers matching the supplied paper headings, summary sheet, numeric currency/date/time cells and landscape printing.
- UI components: RTL daily dashboard, mobile session cards, session editor, history and settings. Hash navigation supports direct GitHub Pages links without server rewrites. Cairo font files and their license ship through the bundled Fontsource package.
- IndexedDB schema version 1 creates the register store in an upgrade transaction. State has an independent version marker. Future versions must add explicit migrations; unknown or invalid versions are rejected without resetting existing data.
- Every mutation validates the complete state and commits once. Multiple tabs serialize writes; stale session edits and stale day confirmations fail. The displayed view refreshes when the window regains focus.
- An operational day stays open across midnight until explicitly closed. Its report includes all assigned sessions regardless of UI filters. Closing blocks active sessions, freezes the register, downloads the workbook and requires explicit saved-file acknowledgment before atomically archiving and opening the next unused day (at least the next calendar day). Refresh resumes pending closing. Saved-report acknowledgment is bound to the downloaded state revision; another tab restarting closing invalidates the earlier acknowledgment.
- Backups restore all settings on a fresh register. Otherwise, restoration merges unique sessions and days, keeps current settings and rejects differing sessions, archive conflicts or incompatible operational days. Export the existing register first; use a fresh browser profile to restore a backup with a different operational day. Existing records are never removed by restore.
- Prices are manual unless the operator explicitly configures an hourly rate. Suggested prices are prorated by actual minutes and remain editable. Active sessions have no final price and never contribute to revenue. Sessions may span midnight; end timestamps must follow the start by at most 24 hours.

## GitHub Pages

The Vite base is `/GameRoomZC/`. Pushes to `main` run `.github/workflows/pages.yml`: lockfile install, TypeScript, Vitest, production build, desktop/mobile Playwright verification, artifact upload and Pages deployment. Failed checks block publication. The deploy job uses the `github-pages` environment and narrowly scoped `pages: write` / `id-token: write` permissions.

Repository Settings → Pages → Build and deployment → Source must be **GitHub Actions**. First-time repositories may require enabling Actions and approving the environment under Settings → Environments. No deployment secrets are required. Actual verified publishing status and commit references are recorded in `STATUS.md`.

Deployment configuration follows the [Vite GitHub Pages guide](https://vite.dev/guide/static-deploy#github-pages) and [GitHub publishing-source documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site). Workbook APIs follow the [ExcelJS documentation](https://github.com/exceljs/exceljs).

## دليل المشغّل

1. افتح الموقع باستخدام نفس الجهاز وملف المتصفح في كل مرة. لا تستخدم التصفح الخاص. من «الإعدادات» يمكنك طلب الاحتفاظ بالبيانات وإضافة أسماء الطاولات والأجهزة.
2. اختر «إضافة جلسة»، وأدخل الرقم الجامعي واسم الطالب في نفس النافذة، وحدد النشاط، ثم «بدء الجلسة». الاسم والنوع اختياريان ووقت البداية تلقائي بتوقيت القاهرة. افتح «تفاصيل إضافية» لإدخال النوع أو تعديل الأوقات.
3. عند انتهاء اللعب اختر «إنهاء»، وراجع وقت النهاية وأدخل السعر النهائي بالجنيه. يمكن تعديل الجلسات قبل إغلاق اليوم؛ زر الحذف داخل نافذة التعديل ويطلب تأكيدًا. إذا امتدت الجلسة بعد منتصف الليل، اختر تاريخ النهاية الصحيح.
4. استخدم البحث وتصفية الحالة. الإحصاءات الرئيسية تخص اليوم كاملًا، أما إجماليات أسفل كل قسم فتخص السجلات المعروضة فقط.
5. من «خيارات اليوم» اختر «تصدير إكسل» لتنزيل جميع جلسات اليوم في ملف `GameRoomZC-YYYY-MM-DD.xlsx`. يحتوي الملف جدولين متجاورين للبلياردو والبلايستيشن وورقة ملخص وورقة تفاصيل تتضمن أسماء الطلاب. الجلسات النشطة لا تُحسب ضمن الإيرادات.
6. عند انتهاء العمل افتح «خيارات اليوم» واختر «إنهاء اليوم». أنهِ جميع الجلسات النشطة، ثم جهّز التقرير ونزّله. افتح الملف وتأكد من حفظه، ثم ضع علامة التأكيد واختر «أرشفة اليوم وفتح سجل جديد». لا تُحذف الأيام السابقة. إذا أغلقت الصفحة أثناء العملية، سيُستأنف التأكيد عند فتحها.
7. من «السجلات السابقة» اختر أي يوم لمراجعة جلساته وإيراداته وتنزيل تقريره مرة أخرى. الأيام المؤرشفة للقراءة فقط.
8. من «الإعدادات» اختر «تنزيل نسخة احتياطية» بانتظام، واحتفظ بالملف في مكان آمن. لاستعادتها اختر الملف وراجع عدد الجلسات والأيام ثم أكد الاستعادة. تُفحص البيانات قبل الحفظ، وتُرفض التعارضات دون حذف الموجود.

**تنبيه التخزين:** البيانات محفوظة محليًا في هذا الجهاز وملف المتصفح فقط. مسح بيانات الموقع أو فقد الجهاز قد يفقد السجلات. إذن التخزين الدائم لا يمنع الحذف اليدوي. تقرير إكسل لا يستبدل النسخة الاحتياطية الكاملة بصيغة JSON. ملفات التقارير والنسخ الاحتياطية تتضمن أرقام الطلاب؛ احفظها في مكان مناسب.

## Operational limits

No cross-device synchronization or recovery service. Initial load and updates require access to GitHub Pages; offline reloading is not guaranteed. Reports are regenerated from immutable archived records, not stored as binary duplicates. The browser cannot verify that a download was saved, so the operator must confirm it. Keep backups before clearing or changing a browser profile. Supported environments are current browsers with IndexedDB, native dialogs and `Intl` Cairo timezone support. The initial release validates up to 100,000 sessions, 10,000 days and 30 configured equipment entries per activity; full-state validation favors integrity over unbounded archive performance. Current automated browsers are Chromium/Edge; Safari and Firefox are not separately certified.
