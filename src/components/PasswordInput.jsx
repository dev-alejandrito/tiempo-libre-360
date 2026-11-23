import { useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PasswordInput({ className = "input", ...props }) {
  const [visible, setVisible] = useState(false);
  const inputRef = useRef(null);
  const action = visible ? "Ocultar contraseña" : "Mostrar contraseña";

  function toggle() {
    const input = inputRef.current;
    const start = input?.selectionStart;
    const end = input?.selectionEnd;
    setVisible((current) => !current);
    requestAnimationFrame(() => {
      if (!input) return;
      input.focus({ preventScroll: true });
      if (start != null && end != null) input.setSelectionRange(start, end);
    });
  }

  return (
    <div className="password-field">
      <input {...props} ref={inputRef} className={`${className} password-input`} type={visible ? "text" : "password"} />
      <Button type="button" variant="ghost" size="icon" className="password-toggle" aria-label={action} title={action} aria-pressed={visible} aria-controls={props.id} disabled={props.disabled} onClick={toggle}>
        {visible ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
      </Button>
    </div>
  );
}