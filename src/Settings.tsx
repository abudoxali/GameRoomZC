import { useState, type FormEvent } from "react";
import {
  Download,
  Upload,
  ShieldCheck,
  HardDrive,
  Info,
  Save,
} from "lucide-react";
import {
  activities,
  activityLabel,
  parsePrice,
  type State,
  type Settings as Config,
} from "./model";
import { arabicValidation, clearValidation } from "./components";
export function Settings({
  state,
  busy,
  persistent,
  onSave,
  onBackup,
  onImport,
  onPersist,
}: {
  state: State;
  busy: boolean;
  persistent: boolean;
  onSave: (s: Config) => Promise<boolean>;
  onBackup: () => void;
  onImport: (file: File) => void;
  onPersist: () => void;
}) {
  const [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    try {
      const f = new FormData(e.currentTarget),
        settings: Config = {
          equipment: { billiards: [], playstation: [] },
          rates: { billiards: null, playstation: null },
        };
      for (const a of activities) {
        settings.equipment[a] = [
          ...new Set(
            String(f.get(a + "Equipment"))
              .split("\n")
              .map((x) => x.trim())
              .filter(Boolean),
          ),
        ];
        const rate = String(f.get(a + "Rate")).trim();
        settings.rates[a] = rate ? parsePrice(rate) : null;
      }
      await onSave(settings);
    } catch {
      setError(
        "راجع أسماء الأجهزة والأسعار؛ استخدم أرقامًا موجبة ومنزلتين عشريتين كحد أقصى",
      );
    }
  }
  return (
    <div className="settings-grid">
      <section className="surface settings-card">
        <div className="section-title">
          <span className="activity-icon">
            <Save size={22} />
          </span>
          <div>
            <h3>الأنشطة والتسعير</h3>
            <p>خيارات بسيطة لتسريع التسجيل اليومي</p>
          </div>
        </div>
        <form
          className="form"
          onSubmit={submit}
          onInvalid={arabicValidation}
          onInput={clearValidation}
        >
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          {activities.map((a) => (
            <fieldset key={a} className="settings-activity">
              <legend>{activityLabel[a]}</legend>
              <label>
                الطاولات أو الأجهزة أو أنواع الألعاب
                <textarea
                  name={a + "Equipment"}
                  rows={3}
                  placeholder="اكتب كل خيار في سطر مستقل"
                  defaultValue={state.settings.equipment[a].join("\n")}
                  maxLength={2400}
                />
              </label>
              <label>
                سعر الساعة بالجنيه <span className="muted">(اختياري)</span>
                <input
                  name={a + "Rate"}
                  type="number"
                  dir="ltr"
                  min="0"
                  max="1000000"
                  step="0.01"
                  placeholder="اتركه فارغًا للتسعير اليدوي"
                  defaultValue={
                    state.settings.rates[a] === null
                      ? ""
                      : state.settings.rates[a]! / 100
                  }
                />
              </label>
            </fieldset>
          ))}
          <p className="hint">
            <Info size={18} /> التسعير يدوي افتراضيًا. السعر المقترح يحسب
            بالدقيقة ويمكن تعديله دائمًا قبل الحفظ.
          </p>
          <button className="primary" disabled={busy}>
            <Save size={18} /> حفظ الإعدادات
          </button>
        </form>
      </section>
      <div className="settings-stack">
        <section className="surface settings-card">
          <div className="section-title">
            <span className="activity-icon">
              <ShieldCheck size={22} />
            </span>
            <div>
              <h3>النسخ الاحتياطي والاستعادة</h3>
              <p>احتفظ بنسخة مستقلة من جميع سجلاتك</p>
            </div>
          </div>
          <p className="muted">
            النسخة تشمل الجلسات والأرشيف والإعدادات وحالة إغلاق اليوم. لا تُرسل
            أي بيانات إلى الإنترنت.
          </p>
          <button className="secondary full" onClick={onBackup} disabled={busy}>
            <Download size={18} /> تنزيل نسخة احتياطية
          </button>
          <label
            className={`secondary full file-label ${busy ? "disabled" : ""}`}
          >
            <Upload size={18} /> استعادة نسخة احتياطية
            <input
              type="file"
              accept="application/json,.json"
              aria-label="اختيار نسخة احتياطية"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onImport(file);
                e.target.value = "";
              }}
            />
          </label>
          <p className="small muted">
            تُفحص النسخة قبل الاستعادة. تُدمج السجلات دون حذف الموجود، وتُرفض
            التعارضات. في متصفح فارغ تُستعاد الإعدادات أيضًا.
          </p>
        </section>
        <section className="surface settings-card">
          <div className="section-title">
            <span className="activity-icon">
              <HardDrive size={22} />
            </span>
            <div>
              <h3>التخزين المحلي</h3>
              <p>
                {persistent
                  ? "تم منح إذن التخزين الدائم"
                  : "التخزين المحلي يعمل"}
              </p>
            </div>
          </div>
          <p className="warning">
            السجلات خاصة بهذا الجهاز وملف المتصفح. مسح بيانات الموقع أو استخدام
            التصفح الخاص قد يفقدها. نزّل نسخة احتياطية بانتظام؛ إذن التخزين
            الدائم لا يضمن الحماية من الحذف.
          </p>
          <button
            className="secondary full"
            onClick={onPersist}
            disabled={busy || persistent}
          >
            طلب الاحتفاظ بالبيانات
          </button>
        </section>
      </div>
    </div>
  );
}
