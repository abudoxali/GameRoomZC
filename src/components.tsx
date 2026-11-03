import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
  type FormEvent,
} from "react";
import { X } from "lucide-react";
export const OperationErrorContext = createContext("");
export function arabicValidation(e: FormEvent<HTMLFormElement>) {
  (e.target as HTMLInputElement).setCustomValidity(
    "يرجى إدخال قيمة صحيحة في هذا الحقل",
  );
}
export function clearValidation(e: FormEvent<HTMLFormElement>) {
  (e.target as HTMLInputElement).setCustomValidity("");
}
export function Modal({
  title,
  children,
  onClose,
  busy = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  busy?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const error = useContext(OperationErrorContext);
  useEffect(() => {
    const prior = document.activeElement as HTMLElement;
    ref.current?.showModal();
    return () => {
      prior?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby="modal-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className="modal-head">
        <h2 id="modal-title">{title}</h2>
        <button
          type="button"
          className="icon-button"
          aria-label="إغلاق النافذة"
          onClick={onClose}
          disabled={busy}
        >
          <X size={20} />
        </button>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {children}
    </dialog>
  );
}
export function Badge({
  active,
  children,
}: {
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <span className={`badge ${active ? "live" : "done"}`}>
      <span />
      {children}
    </span>
  );
}
