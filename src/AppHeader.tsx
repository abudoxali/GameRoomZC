import {
  Gamepad2,
  LayoutDashboard,
  History,
  Settings,
  HardDrive,
} from "lucide-react";
type Page = "daily" | "history" | "settings";
export function AppHeader({
  page,
  onNavigate,
}: {
  page: Page;
  onNavigate: (page: Page) => void;
}) {
  return (
    <header className="app-header">
      <div className="header-inner">
        <a
          className="header-brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            onNavigate("daily");
          }}
        >
          <span className="header-logo">
            <Gamepad2 size={25} />
          </span>
          <span>
            <h1>إدارة غرفة الألعاب</h1>
            <small>مدينة زويل للعلوم والتكنولوجيا والابتكار</small>
          </span>
        </a>
        <nav className="main-nav" aria-label="التنقل الرئيسي">
          {(
            [
              { id: "daily", label: "السجل اليومي", icon: LayoutDashboard },
              { id: "history", label: "السجلات السابقة", icon: History },
              { id: "settings", label: "الإعدادات", icon: Settings },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <a
              key={id}
              href={id === "daily" ? "#" : `#${id}`}
              onClick={(e) => {
                e.preventDefault();
                onNavigate(id);
              }}
              aria-current={page === id ? "page" : undefined}
              className={page === id ? "active" : ""}
            >
              <Icon size={18} />
              <span>{label}</span>
            </a>
          ))}
        </nav>
        <span className="header-storage">
          <HardDrive size={15} />
          <span>الحفظ التلقائي مفعّل</span>
          <i />
        </span>
      </div>
    </header>
  );
}
