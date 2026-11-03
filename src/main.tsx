import React from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/cairo";
import "./styles.css";
import App from "./App";
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="loading" lang="ar" dir="rtl">
        <h1>تعذر عرض السجل</h1>
        <p>لم تُحذف بياناتك. أعد فتح الصفحة وحاول مرة أخرى.</p>
        <button className="primary" onClick={() => location.reload()}>
          إعادة تحميل الصفحة
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
