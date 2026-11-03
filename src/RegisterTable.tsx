import {
  Clock3,
  Gamepad2,
  Target,
  Pencil,
  Check,
  UserRound,
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
  onEdit: (s: Session) => void;
  onFinish: (s: Session) => void;
};
function Actions({
  session: s,
  editable,
  busy,
  onEdit,
  onFinish,
}: Pick<Props, "editable" | "busy" | "onEdit" | "onFinish"> & {
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
          <Check size={16} /> إنهاء
        </button>
      )}
      <button
        className="icon-button"
        title="تعديل الجلسة"
        aria-label={`تعديل الجلسة ${s.studentId}`}
        onClick={() => onEdit(s)}
        disabled={busy}
      >
        <Pencil size={17} />
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
function Student({ session: s }: { session: Session }) {
  return (
    <div className="student-cell">
      <span className="student-avatar">
        <UserRound size={18} />
      </span>
      <div>
        {s.studentName && (
          <strong className="student-name">{s.studentName}</strong>
        )}
        <bdi className={s.studentName ? "student-number" : "student-id"}>
          {s.studentId}
        </bdi>
      </div>
    </div>
  );
}
function Price({ session: s }: { session: Session }) {
  return s.status === "completed" ? (
    <>{currency(s.price ?? 0)}</>
  ) : (
    <span className="muted">—</span>
  );
}
export function RegisterTable(props: Props) {
  const { activity, sessions } = props,
    Icon = activity === "billiards" ? Target : Gamepad2,
    stats = totals(sessions);
  return (
    <section
      className={`register ${activity}`}
      aria-label={`سجل ${activityLabel[activity]}`}
    >
      <div className="register-head">
        <div className="section-title">
          <span className="activity-icon">
            <Icon size={24} />
          </span>
          <div>
            <h3>{activityLabel[activity]}</h3>
            <p>{sessions.length.toLocaleString("ar-EG")} جلسة</p>
          </div>
        </div>
        {stats.active > 0 && (
          <Badge active>{stats.active.toLocaleString("ar-EG")} نشطة</Badge>
        )}
      </div>
      {sessions.length === 0 ? (
        <div className="empty">
          <span className="empty-icon">
            <Icon size={32} />
          </span>
          <h4>لا توجد جلسات {activityLabel[activity]}</h4>
          <p>ابدأ من «إضافة جلسة» وسجّل الطالب.</p>
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
                  {["الطالب", "الوقت", "النوع", "السعر", "الحالة", ""].map(
                    (h, i) => (
                      <th key={i} scope="col">
                        {h || <span className="sr-only">الإجراءات</span>}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <Student session={s} />
                    </td>
                    <td className="time">
                      <span>{displayTime(s.startAt)}</span>
                      <small>
                        {s.endAt
                          ? `إلى ${displayTime(s.endAt)}`
                          : "مستمرة الآن"}
                      </small>
                      <small>{duration(s).toLocaleString("ar-EG")} دقيقة</small>
                    </td>
                    <td>{s.equipment || "—"}</td>
                    <td className="price">
                      <Price session={s} />
                    </td>
                    <td>
                      <Status session={s} />
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
                  <Student session={s} />
                  <Status session={s} />
                </div>
                <dl>
                  <div>
                    <dt>البداية</dt>
                    <dd>{displayTime(s.startAt)}</dd>
                  </div>
                  <div>
                    <dt>النهاية</dt>
                    <dd>{s.endAt ? displayTime(s.endAt) : "مستمرة الآن"}</dd>
                  </div>
                  {s.equipment && (
                    <div>
                      <dt>النوع</dt>
                      <dd>{s.equipment}</dd>
                    </div>
                  )}
                  <div>
                    <dt>السعر</dt>
                    <dd>
                      <Price session={s} />
                    </dd>
                  </div>
                  <div>
                    <dt>المدة</dt>
                    <dd>{duration(s).toLocaleString("ar-EG")} دقيقة</dd>
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
          <Clock3 size={16} /> {stats.completed.toLocaleString("ar-EG")} جلسات
          مكتملة في العرض
        </span>
        <strong>{currency(stats.revenue)}</strong>
      </div>
    </section>
  );
}
