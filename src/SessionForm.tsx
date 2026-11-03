import { useRef, useState, type FormEvent } from "react";
import { Play, Check, Info } from "lucide-react";
import { Modal, arabicValidation, clearValidation } from "./components";
import {
  activities,
  activityLabel,
  cairoInput,
  fromCairo,
  parsePrice,
  currency,
  type Session,
  type State,
  type Activity,
} from "./model";
type Props = {
  state: State;
  session?: Session;
  finish?: boolean;
  defaultActivity?: Activity;
  busy: boolean;
  onClose: () => void;
  onSave: (s: Session, expected?: string) => Promise<boolean>;
  onDelete?: () => void;
};
export function SessionForm({
  state,
  session,
  finish,
  defaultActivity,
  busy,
  onClose,
  onSave,
  onDelete,
}: Props) {
  const [activity, setActivity] = useState<Activity>(
    session?.activity ?? defaultActivity ?? "billiards",
  );
  const [start, setStart] = useState(cairoInput(session?.startAt));
  const [end, setEnd] = useState(
    finish ? cairoInput() : session?.endAt ? cairoInput(session.endAt) : "",
  );
  const [price, setPrice] = useState(
    session?.price !== null && session?.price !== undefined
      ? String(session.price / 100)
      : "",
  );
  const [equipment, setEquipment] = useState(session?.equipment ?? "");
  const [error, setError] = useState("");
  const id = useRef(session?.id ?? crypto.randomUUID());
  const completed = finish || session?.status === "completed";
  const rate = state.settings.rates[activity];
  let suggested: number | null = null;
  try {
    if (rate !== null && end) {
      const minutes =
        (Date.parse(fromCairo(end)) - Date.parse(fromCairo(start))) / 60000;
      if (minutes > 0) suggested = Math.round((rate * minutes) / 60);
    }
  } catch {
    /* Form validation handles invalid times. */
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    try {
      const form = new FormData(e.currentTarget);
      const now = new Date().toISOString();
      const value: Session = {
        id: id.current,
        studentId: String(form.get("studentId")).trim(),
        studentName: String(form.get("studentName") ?? "").trim() || undefined,
        activity,
        equipment,
        day: session?.day ?? state.currentDay,
        startAt: fromCairo(start),
        endAt: completed ? fromCairo(end) : null,
        price: completed ? parsePrice(price) : null,
        status: completed ? "completed" : "active",
        createdAt: session?.createdAt ?? now,
        updatedAt: session?.updatedAt ?? now,
      };
      await onSave(value, session?.updatedAt);
    } catch (e) {
      setError(
        e instanceof Error && /[\u0600-\u06ff]/.test(e.message)
          ? e.message
          : "تعذر حفظ الجلسة؛ راجع البيانات المدخلة",
      );
    }
  }
  return (
    <Modal
      title={
        finish ? "إنهاء الجلسة" : session ? "تعديل الجلسة" : "إضافة جلسة جديدة"
      }
      onClose={onClose}
      busy={busy}
    >
      <form
        onSubmit={submit}
        onInvalid={arabicValidation}
        onInput={clearValidation}
        className="form"
      >
        <p className="muted">
          سجل يوم {state.currentDay} · جميع الأوقات بتوقيت القاهرة
        </p>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div className="student-fields">
          <label>
            الرقم الجامعي للطالب
            <input
              autoFocus
              name="studentId"
              dir="ltr"
              placeholder="أدخل الرقم الجامعي"
              required
              maxLength={30}
              pattern="[0-9A-Za-z٠-٩\-]+"
              defaultValue={session?.studentId}
              autoComplete="off"
            />
          </label>
          <label>
            <span>
              اسم الطالب <small className="muted">(اختياري)</small>
            </span>
            <input
              name="studentName"
              placeholder="اكتب اسم الطالب"
              maxLength={120}
              defaultValue={session?.studentName}
              autoComplete="off"
            />
          </label>
        </div>
        <fieldset>
          <legend>النشاط</legend>
          <div className="activity-picker">
            {activities.map((a) => (
              <button
                key={a}
                type="button"
                aria-pressed={activity === a}
                onClick={() => {
                  setActivity(a);
                  setEquipment("");
                }}
                className={activity === a ? "selected" : ""}
              >
                {activityLabel[a]}
              </button>
            ))}
          </div>
        </fieldset>
        <details className="form-details">
          <summary>
            تفاصيل إضافية <span>النوع وتعديل الوقت</span>
          </summary>
          <div className="details-content">
            <label>
              الطاولة أو الجهاز أو نوع اللعبة{" "}
              <span className="muted">(اختياري)</span>
              <input
                list="equipment-list"
                placeholder="اختر أو اكتب النوع"
                value={equipment}
                onChange={(e) => setEquipment(e.target.value)}
                maxLength={80}
              />
              <datalist id="equipment-list">
                {state.settings.equipment[activity].map((v) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
            </label>
            <div className="form-grid">
              <label>
                وقت البداية
                <input
                  type="datetime-local"
                  dir="ltr"
                  required
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                />
              </label>
              {completed && (
                <label>
                  وقت النهاية
                  <input
                    type="datetime-local"
                    dir="ltr"
                    required
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                  />
                </label>
              )}
            </div>
          </div>
        </details>
        {completed && (
          <>
            <label>
              السعر النهائي بالجنيه المصري
              <input
                inputMode="decimal"
                type="number"
                min="0"
                max="1000000"
                step="0.01"
                required
                placeholder="أدخل قيمة الجلسة"
                dir="ltr"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </label>
            {suggested !== null && (
              <div className="hint">
                <Info size={17} />
                <span>
                  السعر المقترح: {currency(suggested)}، محسوب بالدقيقة.
                </span>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setPrice(String(suggested! / 100))}
                >
                  استخدام السعر
                </button>
              </div>
            )}
          </>
        )}
        {completed && (
          <div className="hint">
            <Info size={18} />
            <span>
              {completed
                ? "راجع التاريخ إذا امتدت الجلسة بعد منتصف الليل. الحد الأقصى للجلسة ٢٤ ساعة."
                : "يُحفظ وقت البداية تلقائيًا، ويمكنك تعديله. يُدخل السعر عند إنهاء الجلسة."}
            </span>
          </div>
        )}
        <div className="modal-actions">
          <button className="primary" disabled={busy}>
            {completed ? <Check size={18} /> : <Play size={18} />}{" "}
            {busy
              ? "جارٍ الحفظ…"
              : completed
                ? "حفظ الجلسة المكتملة"
                : session
                  ? "حفظ التعديلات"
                  : "بدء الجلسة"}
          </button>
          <button
            type="button"
            className="secondary"
            onClick={onClose}
            disabled={busy}
          >
            إلغاء
          </button>
        </div>
        {session && !finish && onDelete && (
          <button
            type="button"
            className="delete-link"
            aria-label={`حذف الجلسة ${session.studentId}`}
            onClick={onDelete}
            disabled={busy}
          >
            حذف هذه الجلسة
          </button>
        )}
      </form>
    </Modal>
  );
}
