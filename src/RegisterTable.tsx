import {
  Clock3,
  Gamepad2,
  Plus,
  Target,
  Pencil,
  Trash2,
  Check,
} from "lucide-react";
import { Badge } from "./components";
import {
  activityLabel,
  currency,
  displayTime,
  duration,
  totals,
  type Session,
  type Activity,
} from "./model";
type Props = {
  activity: Activity;
  sessions: Session[];
  editable: boolean;
  busy: boolean;
  onAdd: () => void;
  onEdit: (s: Session) => void;
  onFinish: (s: Session) => void;
  onDelete: (s: Session) => void;
};
function Actions({
  session: s,
  editable,
  busy,
  onEdit,
  onFinish,
  onDelete,
}: Pick<Props, "editable" | "busy" | "onEdit" | "onFinish" | "onDelete"> & {
  session: Session;
}) {
  return editable ? (
    <div className="row-actions">
      {s.status === "active" && (
        <button
          className="finish-button"
          onClick={() => onFinish(s)}
          disabled={busy}
          aria-label={`إنهاء الجلسة ${s.studentId}`}
        >
          <Check size={14} /> إنهاء
        </button>
      )}
      <button
        className="icon-button"
        title="تعديل"
        aria-label={`تعديل الجلسة ${s.studentId}`}
        onClick={() => onEdit(s)}
        disabled={busy}
      >
        <Pencil size={15} />
      </button>
      <button
        className="icon-button danger-text"
        title="حذف"
        aria-label={`حذف الجلسة ${s.studentId}`}
        onClick={() => onDelete(s)}
        disabled={busy}
      >
        <Trash2 size={15} />
      </button>
    </div>
  ) : (
    <span className="muted">مؤرشفة</span>
  );
}
function Status({ session: s }: { session: Session }) {
  return (
    <Badge active={s.status === "active"}>
      {s.status === "active" ? "نشطة" : "مكتملة"}
    </Badge>
  );
}
function Price({ session: s }: { session: Session }) {
  return s.status === "completed" ? (
    <>{currency(s.price ?? 0)}</>
  ) : (
    <span className="muted">غير نهائي</span>
  );
}
export function RegisterTable(props: Props) {
  const { activity, sessions, editable, busy, onAdd } = props;
  const Icon = activity === "billiards" ? Target : Gamepad2;
  return (
    <section
      className={`register ${activity}`}
      aria-label={`سجل ${activityLabel[activity]}`}
    >
      <div className="register-head">
        <div className="section-title">
          <span className="activity-icon">
            <Icon size={23} />
          </span>
          <div>
            <h3>{activityLabel[activity]}</h3>
            <p>{sessions.length.toLocaleString("ar-EG")} جلسة في العرض</p>
          </div>
        </div>
        {editable && (
          <button
            className="icon-button add-small"
            aria-label={`إضافة جلسة ${activityLabel[activity]}`}
            onClick={onAdd}
            disabled={busy}
          >
            <Plus size={20} />
          </button>
        )}
      </div>
      {!sessions.length ? (
        <div className="empty">
          <span className="empty-icon">
            <Icon size={30} />
          </span>
          <h4>لا توجد جلسات {activityLabel[activity]}</h4>
          <p>ستظهر الجلسات هنا بمجرد تسجيلها.</p>
          {editable && (
            <button className="text-button" onClick={onAdd} disabled={busy}>
              <Plus size={16} /> تسجيل أول جلسة
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="table-scroll">
            <table>
              <caption className="sr-only">
                سجل جلسات {activityLabel[activity]}
              </caption>
              <thead>
                <tr>
                  {[
                    "ID",
                    "من",
                    "إلى",
                    "النوع",
                    "السعر",
                    "التاريخ",
                    "الحالة",
                    "المدة",
                    "الإجراءات",
                  ].map((h) => (
                    <th key={h} scope="col">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <bdi className="student-id">{s.studentId}</bdi>
                    </td>
                    <td className="time">{displayTime(s.startAt)}</td>
                    <td className="time">
                      {s.endAt ? displayTime(s.endAt) : "—"}
                    </td>
                    <td>{s.equipment || "—"}</td>
                    <td className="price">
                      <Price session={s} />
                    </td>
                    <td>
                      <bdi>{s.day}</bdi>
                    </td>
                    <td>
                      <Status session={s} />
                    </td>
                    <td>
                      {duration(s).toLocaleString("ar-EG")} د{" "}
                      {s.status === "active" ? "تقريبًا" : ""}
                    </td>
                    <td>
                      <Actions {...props} session={s} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="session-cards">
            {sessions.map((s) => (
              <article key={s.id} className="session-card">
                <div className="session-card-top">
                  <div>
                    <span className="muted">الرقم الجامعي </span>
                    <bdi className="student-id">{s.studentId}</bdi>
                  </div>
                  <Status session={s} />
                </div>
                <dl>
                  <div>
                    <dt>من</dt>
                    <dd>{displayTime(s.startAt)}</dd>
                  </div>
                  <div>
                    <dt>إلى</dt>
                    <dd>{s.endAt ? displayTime(s.endAt) : "مستمرة الآن"}</dd>
                  </div>
                  <div>
                    <dt>النوع</dt>
                    <dd>{s.equipment || activityLabel[activity]}</dd>
                  </div>
                  <div>
                    <dt>السعر</dt>
                    <dd>
                      <Price session={s} />
                    </dd>
                  </div>
                  <div>
                    <dt>التاريخ</dt>
                    <dd>
                      <bdi>{s.day}</bdi>
                    </dd>
                  </div>
                  <div>
                    <dt>المدة</dt>
                    <dd>
                      {duration(s).toLocaleString("ar-EG")} دقيقة{" "}
                      {s.status === "active" ? "تقريبًا" : ""}
                    </dd>
                  </div>
                </dl>
                <Actions {...props} session={s} />
              </article>
            ))}
          </div>
        </>
      )}
      <div className="register-footer">
        <span>
          <Clock3 size={15} /> {totals(sessions).active.toLocaleString("ar-EG")}{" "}
          جلسات نشطة في العرض
        </span>
        <strong>{currency(totals(sessions).revenue)}</strong>
      </div>
    </section>
  );
}
