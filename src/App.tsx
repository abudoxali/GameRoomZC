import { useCallback, useEffect, useRef, useState } from "react";
import {
  LayoutDashboard,
  History,
  Settings as SettingsIcon,
  Gamepad2,
  Plus,
  Download,
  LockKeyhole,
  CalendarDays,
  HardDrive,
  Search,
  ArrowUpLeft,
  Coins,
  CheckCheck,
  Activity,
  Layers3,
  Info,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { Register, validateBackup } from "./store";
import {
  activityLabel,
  activities,
  currency,
  displayDate,
  today,
  totals,
  type State,
  type Session,
  type Activity as ActivityType,
} from "./model";
import { downloadReport, downloadBlob } from "./export";
import { Modal, Badge, OperationErrorContext } from "./components";
import { SessionForm } from "./SessionForm";
import { RegisterTable } from "./RegisterTable";
import { Settings } from "./Settings";
const register = new Register();
type Page = "daily" | "history" | "settings";
const getPage = (): Page =>
  location.hash === "#history"
    ? "history"
    : location.hash === "#settings"
      ? "settings"
      : "daily";
function message(e: unknown) {
  if (e instanceof Error && e.name === "ZodError")
    return "بيانات غير صحيحة؛ راجع الرقم الجامعي والسعر وترتيب أوقات البداية والنهاية (بحد أقصى ٢٤ ساعة). إذا كانت بيانات التخزين تالفة فلا تمسحها؛ استعد نسخة احتياطية في ملف متصفح آخر.";
  if (e instanceof Error && /[\u0600-\u06ff]/.test(e.message)) return e.message;
  return "تعذر تنفيذ العملية أو حفظ البيانات محليًا. تحقق من مساحة الجهاز وإذن التخزين ثم حاول مرة أخرى.";
}
export default function App() {
  const [state, setState] = useState<State>();
  const [loadError, setLoadError] = useState("");
  const [page, setPage] = useState<Page>(getPage);
  const [busy, setBusy] = useState(false);
  const guard = useRef(false);
  const [toast, setToast] = useState<{ text: string; error: boolean }>();
  const [persistent, setPersistent] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [activityFilter, setActivityFilter] = useState("all");
  const [historyDate, setHistoryDate] = useState("");
  const [editor, setEditor] = useState<{
    session?: Session;
    finish?: boolean;
    activity?: ActivityType;
  }>();
  const [deleting, setDeleting] = useState<Session>();
  const [closing, setClosing] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [downloadRevision, setDownloadRevision] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const [restore, setRestore] = useState<{ json: string; state: State }>();
  const refresh = useCallback(async () => {
    try {
      setState(await register.read());
      setLoadError("");
    } catch (e) {
      setLoadError(message(e));
    }
  }, []);
  useEffect(() => {
    void refresh();
    navigator.storage
      ?.persisted?.()
      .then(setPersistent)
      .catch(() => {});
    const hash = () => setPage(getPage());
    const focus = () => {
      void refresh();
    };
    window.addEventListener("hashchange", hash);
    window.addEventListener("focus", focus);
    return () => {
      window.removeEventListener("hashchange", hash);
      window.removeEventListener("focus", focus);
    };
  }, [refresh]);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(undefined), 9000);
      return () => clearTimeout(t);
    }
  }, [toast]);
  async function run(action: () => Promise<void>, success?: string) {
    if (guard.current) return false;
    guard.current = true;
    setBusy(true);
    setToast(undefined);
    try {
      await action();
      if (success) setToast({ text: success, error: false });
      return true;
    } catch (e) {
      setToast({ text: message(e), error: true });
      return false;
    } finally {
      guard.current = false;
      setBusy(false);
    }
  }
  const navigate = (p: Page) => {
    location.hash = p === "daily" ? "" : p;
    setQuery("");
    setFilter("all");
    setActivityFilter("all");
  };
  if (!state)
    return (
      <main className="loading">
        <Gamepad2 size={44} />
        <h1>إدارة غرفة الألعاب</h1>
        {loadError ? (
          <>
            <p role="alert" className="error">
              {loadError}
            </p>
            <button className="primary" onClick={() => void refresh()}>
              <RefreshCw size={18} /> إعادة المحاولة
            </button>
          </>
        ) : (
          <p>جارٍ فتح السجل المحلي…</p>
        )}
      </main>
    );
  const selectedDay =
    page === "history"
      ? historyDate ||
        [...state.days].reverse().find((d) => d.status === "closed")?.date ||
        state.currentDay
      : state.currentDay;
  const day = state.days.find((d) => d.date === selectedDay);
  const pending =
    state.days.find((d) => d.date === state.currentDay)?.status === "pending";
  const editable = page === "daily" && !pending;
  const sessions = state.sessions.filter((s) => s.day === selectedDay);
  const total = totals(sessions);
  const visible = sessions
    .filter(
      (s) =>
        (!query ||
          s.studentId.toLowerCase().includes(query.trim().toLowerCase()) ||
          s.equipment.includes(query.trim())) &&
        (filter === "all" || s.status === filter) &&
        (activityFilter === "all" || s.activity === activityFilter),
    )
    .sort(
      (a, b) =>
        Number(b.status === "active") - Number(a.status === "active") ||
        b.startAt.localeCompare(a.startAt),
    );
  const exportDay = () =>
    run(async () => {
      const fresh = await register.read();
      await downloadReport(selectedDay, fresh.sessions);
    }, "تم بدء تنزيل تقرير اليوم؛ تأكد من حفظ الملف على جهازك");
  const doSave = async (s: Session, expected?: string) =>
    run(async () => {
      setState(await register.save(s, expected));
      setEditor(undefined);
    }, "تم حفظ الجلسة بنجاح");
  const prepareClose = () =>
    run(async () => {
      const fresh = await register.prepare(state.currentDay);
      setState(fresh);
      setClosing(false);
      setDownloaded(false);
      setSaved(false);
      await downloadReport(fresh.currentDay, fresh.sessions);
      setDownloadRevision(fresh.revision);
      setDownloaded(true);
    });
  return (
    <OperationErrorContext value={toast?.error ? toast.text : ""}>
      <div className="app-shell">
        <aside className="sidebar">
          <a className="brand" href="#" aria-label="العودة إلى السجل اليومي">
            <span className="brand-mark">
              <Gamepad2 size={28} />
            </span>
            <span>
              غرفة الألعاب<small>مـديـنـة زويـل</small>
            </span>
          </a>
          <span className="nav-caption">مساحة العمل</span>
          <nav aria-label="التنقل الرئيسي">
            {(
              [
                { id: "daily", label: "السجل اليومي", icon: LayoutDashboard },
                { id: "history", label: "السجلات السابقة", icon: History },
                { id: "settings", label: "الإعدادات", icon: SettingsIcon },
              ] as const
            ).map(({ id, label, icon: Icon }) => (
              <a
                key={id}
                href={id === "daily" ? "#" : `#${id}`}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(id);
                }}
                className={page === id ? "nav-link current" : "nav-link"}
                aria-current={page === id ? "page" : undefined}
              >
                <Icon size={20} />
                <span>{label}</span>
                {page === id && <span className="nav-dot" />}
              </a>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <div className="local-note">
              <HardDrive size={20} />
              <strong>بياناتك على جهازك</strong>
              <p>
                حفظ محلي، وخصوصية كاملة.
                <br />
                احتفظ بنسخة احتياطية بانتظام.
              </p>
              <button
                className="sidebar-backup"
                onClick={() => navigate("settings")}
              >
                إدارة النسخ الاحتياطية <ArrowUpLeft size={16} />
              </button>
            </div>
            <p className="sidebar-credit">
              مدينة زويل
              <br />
              <span>للعلوم والتكنولوجيا والابتكار</span>
            </p>
          </div>
        </aside>
        <div className="workspace">
          <header className="topbar">
            <div>
              <span className="eyebrow">
                مدينة زويل للعلوم والتكنولوجيا والابتكار
              </span>
              <h1>إدارة غرفة الألعاب</h1>
            </div>
            <div className="topbar-meta">
              <span className="storage-pill">
                <span /> محفوظ على هذا الجهاز
              </span>
              <button
                className="icon-button"
                aria-label="فتح الإعدادات"
                onClick={() => navigate("settings")}
              >
                <SettingsIcon size={20} />
              </button>
            </div>
          </header>
          <main className="main-content" id="main">
            <div className="page-heading">
              <div>
                <p className="eyebrow">
                  {page === "daily"
                    ? "كل شيء جاهز ليومٍ جديد"
                    : page === "history"
                      ? "سجلات محفوظة، دائمًا في متناولك"
                      : "مساحة عمل تناسب يومك"}
                </p>
                <h2>
                  {page === "daily"
                    ? "السجل اليومي"
                    : page === "history"
                      ? "السجلات السابقة"
                      : "الإعدادات"}
                </h2>
                <p className="muted">
                  {page === "daily"
                    ? "تابع الجلسات، وسجّل اللعب، وأنهِ يومك بكل سهولة."
                    : page === "history"
                      ? "راجع الأيام السابقة ونزّل تقاريرها في أي وقت."
                      : "خصّص خيارات الأنشطة واحمِ بيانات الغرفة."}
                </p>
              </div>
              <div className="date-card">
                <CalendarDays size={20} />
                <div>
                  <small>تاريخ القاهرة اليوم</small>
                  <strong>{displayDate(today())}</strong>
                </div>
              </div>
            </div>
            {loadError && (
              <p role="alert" className="error">
                {loadError}
              </p>
            )}
            {pending && (
              <div className="notice">
                <LockKeyhole size={20} />
                <span>
                  إغلاق يوم {state.currentDay} بانتظار تأكيد حفظ التقرير. السجل
                  محفوظ ومجمّد لحين التأكيد.
                </span>
              </div>
            )}
            {page === "settings" ? (
              <Settings
                key={state.revision}
                state={state}
                busy={busy}
                persistent={persistent}
                onSave={(s) =>
                  run(async () => {
                    setState(await register.settings(s));
                  }, "تم حفظ الإعدادات")
                }
                onBackup={() =>
                  void run(async () => {
                    downloadBlob(
                      new Blob([await register.backup()], {
                        type: "application/json",
                      }),
                      `GameRoomZC-backup-${today()}.json`,
                    );
                  }, "تم بدء تنزيل النسخة الاحتياطية")
                }
                onImport={(file) =>
                  void run(async () => {
                    if (file.size > 50 * 1024 * 1024)
                      throw Error("حجم النسخة يتجاوز ٥٠ ميجابايت");
                    const json = await file.text();
                    setRestore({ json, state: validateBackup(json) });
                  })
                }
                onPersist={() =>
                  void run(async () => {
                    const granted = await navigator.storage?.persist?.();
                    setPersistent(!!granted);
                    setToast({
                      text: granted
                        ? "تم منح إذن التخزين الدائم؛ استمر في حفظ النسخ الاحتياطية"
                        : "لم يمنح المتصفح إذن التخزين الدائم. البيانات محفوظة محليًا؛ احتفظ بنسخة احتياطية.",
                      error: false,
                    });
                  })
                }
              />
            ) : (
              <>
                {page === "history" && (
                  <div className="history-bar surface">
                    <label>
                      اختر اليوم
                      <select
                        value={selectedDay}
                        onChange={(e) => setHistoryDate(e.target.value)}
                      >
                        {[...state.days].reverse().map((d) => (
                          <option key={d.date} value={d.date}>
                            {d.date} —{" "}
                            {d.status === "closed"
                              ? "مؤرشف"
                              : d.status === "pending"
                                ? "بانتظار الإغلاق"
                                : "يوم تشغيلي مفتوح"}
                          </option>
                        ))}
                      </select>
                    </label>
                    <Badge active={day?.status !== "closed"}>
                      {day?.status === "closed"
                        ? "يوم مؤرشف"
                        : day?.status === "pending"
                          ? "إغلاق قيد الانتظار"
                          : "يوم مفتوح"}
                    </Badge>
                    <button
                      className="secondary"
                      disabled={busy}
                      onClick={() => void exportDay()}
                    >
                      <Download size={18} /> تنزيل تقرير اليوم
                    </button>
                  </div>
                )}
                <div className="stats-grid">
                  {[
                    {
                      label: "إجمالي جلسات اليوم",
                      value: total.count.toLocaleString("ar-EG"),
                      sub: "جلسات مسجلة",
                      icon: Layers3,
                      color: "indigo",
                    },
                    {
                      label: "الجلسات النشطة",
                      value: total.active.toLocaleString("ar-EG"),
                      sub: "قيد اللعب الآن",
                      icon: Activity,
                      color: "green",
                    },
                    {
                      label: "الجلسات المكتملة",
                      value: total.completed.toLocaleString("ar-EG"),
                      sub: "تم إنهاؤها وتسجيلها",
                      icon: CheckCheck,
                      color: "blue",
                    },
                    {
                      label: "إيرادات اليوم",
                      value: currency(total.revenue),
                      sub: "الجلسات المكتملة فقط",
                      icon: Coins,
                      color: "amber",
                    },
                  ].map(({ label, value, sub, icon: Icon, color }) => (
                    <section className="stat-card" key={label}>
                      <div>
                        <p>{label}</p>
                        <strong>{value}</strong>
                        <small>{sub}</small>
                      </div>
                      <span className={`stat-icon ${color}`}>
                        <Icon size={22} />
                      </span>
                    </section>
                  ))}
                </div>
                {page === "daily" && (
                  <section className="daily-actions surface">
                    <div>
                      <span className="day-indicator" />
                      <div>
                        <strong>
                          يوم العمل · <bdi>{state.currentDay}</bdi>
                        </strong>
                        <p>
                          {pending
                            ? "التقرير جاهز، أكمل تأكيد الحفظ لإغلاق اليوم."
                            : "سجلّك محفوظ تلقائيًا بعد كل عملية."}
                        </p>
                      </div>
                    </div>
                    <div className="action-buttons">
                      <button
                        className="primary"
                        onClick={() => setEditor({})}
                        disabled={busy || !editable}
                      >
                        <Plus size={19} /> إضافة جلسة
                      </button>
                      <button
                        className="secondary"
                        onClick={() => void exportDay()}
                        disabled={busy}
                      >
                        <Download size={18} /> تصدير إكسل
                      </button>
                      <button
                        className="secondary"
                        onClick={() => setClosing(true)}
                        disabled={busy || pending}
                      >
                        <LockKeyhole size={17} /> إنهاء اليوم
                      </button>
                      <button
                        className="text-button history-shortcut"
                        onClick={() => navigate("history")}
                      >
                        <History size={17} /> السجلات السابقة
                      </button>
                    </div>
                  </section>
                )}
                <div className="register-toolbar">
                  <div>
                    <h3>
                      جلسات {page === "history" ? "اليوم المحدد" : "اليوم"}
                    </h3>
                    <span className="count-pill">
                      {sessions.length.toLocaleString("ar-EG")}
                    </span>
                  </div>
                  <div className="filters">
                    <label className="search">
                      <Search size={17} />
                      <input
                        placeholder="ابحث بالرقم الجامعي أو النوع…"
                        aria-label="البحث في الجلسات"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </label>
                    <select
                      aria-label="تصفية حسب الحالة"
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                    >
                      <option value="all">كل الحالات</option>
                      <option value="active">نشطة</option>
                      <option value="completed">مكتملة</option>
                    </select>
                    {page === "history" && (
                      <select
                        aria-label="تصفية حسب النشاط"
                        value={activityFilter}
                        onChange={(e) => setActivityFilter(e.target.value)}
                      >
                        <option value="all">كل الأنشطة</option>
                        {activities.map((a) => (
                          <option key={a} value={a}>
                            {activityLabel[a]}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
                <div className="register-grid">
                  {activities
                    .filter(
                      (a) => activityFilter === "all" || activityFilter === a,
                    )
                    .map((a) => (
                      <RegisterTable
                        key={a}
                        activity={a}
                        sessions={visible.filter((s) => s.activity === a)}
                        editable={editable}
                        busy={busy}
                        onAdd={() => setEditor({ activity: a })}
                        onEdit={(s) => setEditor({ session: s })}
                        onFinish={(s) =>
                          setEditor({ session: s, finish: true })
                        }
                        onDelete={setDeleting}
                      />
                    ))}
                </div>
                <div className="bottom-note">
                  <Info size={16} />
                  <p>
                    الأسعار بالجنيه المصري · الأوقات بتوقيت القاهرة · التقرير
                    يشمل جميع جلسات اليوم مهما كانت التصفية.
                  </p>
                </div>
              </>
            )}
            <footer className="footer">
              <span>غرفة الألعاب · مدينة زويل</span>
              <span>
                <HardDrive size={13} /> البيانات محفوظة في هذا المتصفح فقط
              </span>
            </footer>
          </main>
        </div>
        {toast && (
          <div
            className={`toast ${toast.error ? "toast-error" : ""}`}
            role={toast.error ? "alert" : "status"}
          >
            {toast.error ? (
              <AlertCircle size={21} />
            ) : (
              <CheckCircle2 size={21} />
            )}
            <span>{toast.text}</span>
            <button
              aria-label="إخفاء الإشعار"
              className="icon-button"
              onClick={() => setToast(undefined)}
            >
              ×
            </button>
          </div>
        )}
        {editor && (
          <SessionForm
            state={state}
            session={editor.session}
            finish={editor.finish}
            defaultActivity={editor.activity}
            busy={busy}
            onClose={() => !busy && setEditor(undefined)}
            onSave={doSave}
          />
        )}{" "}
        {deleting && (
          <Modal
            title="حذف الجلسة"
            busy={busy}
            onClose={() => setDeleting(undefined)}
          >
            <p>
              هل تريد حذف جلسة الطالب <bdi>{deleting.studentId}</bdi>؟ سيُحدّث
              إجمالي اليوم، ولا يمكن التراجع عن الحذف. يمكنك تنزيل نسخة احتياطية
              قبل المتابعة.
            </p>
            <div className="modal-actions">
              <button
                className="danger"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    setState(
                      await register.remove(deleting.id, deleting.updatedAt),
                    );
                    setDeleting(undefined);
                  }, "تم حذف الجلسة")
                }
              >
                تأكيد الحذف
              </button>
              <button
                className="secondary"
                disabled={busy}
                onClick={() => setDeleting(undefined)}
              >
                إلغاء
              </button>
            </div>
          </Modal>
        )}
        {closing && (
          <Modal
            title="إنهاء اليوم"
            busy={busy}
            onClose={() => setClosing(false)}
          >
            {total.active > 0 ? (
              <>
                <p className="warning">
                  توجد {total.active.toLocaleString("ar-EG")} جلسات نشطة. أنهِ
                  هذه الجلسات وسجّل أسعارها قبل إغلاق اليوم.
                </p>
                <div className="modal-actions">
                  <button
                    className="primary"
                    onClick={() => {
                      setFilter("active");
                      setClosing(false);
                    }}
                  >
                    مراجعة الجلسات النشطة
                  </button>
                </div>
              </>
            ) : (
              <>
                <p>
                  سيتم تجهيز تقرير يوم <bdi>{state.currentDay}</bdi> وتنزيله، ثم
                  نطلب منك تأكيد حفظ الملف قبل الأرشفة وفتح يوم جديد.
                </p>
                <div className="closing-total">
                  <span>إجمالي الإيرادات المكتملة</span>
                  <strong>{currency(total.revenue)}</strong>
                </div>
                <div className="modal-actions">
                  <button
                    className="primary"
                    disabled={busy}
                    onClick={() => void prepareClose()}
                  >
                    <Download size={18} /> تجهيز التقرير وتنزيله
                  </button>
                  <button
                    className="secondary"
                    disabled={busy}
                    onClick={() => setClosing(false)}
                  >
                    إلغاء
                  </button>
                </div>
              </>
            )}
          </Modal>
        )}
        {pending && (
          <Modal
            title="تأكيد حفظ التقرير"
            busy={busy}
            onClose={() =>
              void run(async () => {
                setState(await register.cancelClose(state.currentDay));
                setSaved(false);
                setDownloaded(false);
              })
            }
          >
            <p>
              التقرير الخاص بيوم <bdi>{state.currentDay}</bdi> جاهز. بدء التنزيل
              لا يعني أن الملف حُفظ. افتح الملف وتأكد من حفظه على جهازك قبل
              المتابعة.
            </p>
            <button
              className="secondary full"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  const fresh = await register.read();
                  await downloadReport(fresh.currentDay, fresh.sessions);
                  setDownloadRevision(fresh.revision);
                  setSaved(false);
                  setDownloaded(true);
                })
              }
            >
              <Download size={18} /> تنزيل التقرير مرة أخرى
            </button>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={saved}
                disabled={!downloaded || busy}
                onChange={(e) => setSaved(e.target.checked)}
              />{" "}
              أؤكد أنني حفظت تقرير اليوم وراجعت الملف
            </label>
            {!downloaded && (
              <p className="small muted">
                استؤنف الإغلاق بعد فتح الصفحة. نزّل التقرير ثم أكد حفظه.
              </p>
            )}
            <div className="modal-actions">
              <button
                className="primary"
                disabled={busy || !saved || !downloaded}
                onClick={() =>
                  void run(async () => {
                    setState(
                      await register.confirmClose(
                        state.currentDay,
                        downloadRevision ?? -1,
                      ),
                    );
                    setSaved(false);
                    setDownloaded(false);
                  }, "تمت أرشفة اليوم وفتح سجل جديد دون حذف السجلات السابقة")
                }
              >
                أرشفة اليوم وفتح سجل جديد
              </button>
              <button
                className="secondary"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    setState(await register.cancelClose(state.currentDay));
                    setSaved(false);
                    setDownloaded(false);
                  })
                }
              >
                العودة للسجل
              </button>
            </div>
          </Modal>
        )}
        {restore && (
          <Modal
            title="استعادة نسخة احتياطية"
            busy={busy}
            onClose={() => setRestore(undefined)}
          >
            <p>
              تم فحص النسخة:{" "}
              {restore.state.sessions.length.toLocaleString("ar-EG")} جلسة و
              {restore.state.days.length.toLocaleString("ar-EG")} يومًا. لن
              تُحذف السجلات الحالية؛ تُرفض أي بيانات متعارضة.
            </p>
            <p className="warning">
              نزّل نسخة من بيانات هذا الجهاز أولًا. عند وجود سجلات حالية تبقى
              إعدادات الجهاز كما هي.
            </p>
            <div className="modal-actions">
              <button
                className="primary"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    setState(await register.restore(restore.json));
                    setRestore(undefined);
                  }, "تمت استعادة النسخة الاحتياطية بنجاح")
                }
              >
                تأكيد الاستعادة
              </button>
              <button
                className="secondary"
                disabled={busy}
                onClick={() => setRestore(undefined)}
              >
                إلغاء
              </button>
            </div>
          </Modal>
        )}
      </div>
    </OperationErrorContext>
  );
}
