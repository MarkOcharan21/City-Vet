import { useEffect } from "react";

// Input types where auto-capitalization must NEVER run:
// passwords, emails, phone numbers, numbers, dates/times, URLs,
// search boxes (so it never alters query matching), and non-text controls.
const SKIP_TYPES = new Set([
  "password",
  "email",
  "number",
  "tel",
  "date",
  "time",
  "url",
  "search",
  "file",
  "hidden",
  "checkbox",
  "radio",
  "color",
  "range",
  "month",
  "week",
  "datetime-local",
]);

// Capitalize the first letter of every word, leaving the rest of each word
// exactly as typed ("browny" -> "Browny", "jun dela cruz" -> "Jun Dela Cruz").
function titleCase(value) {
  return String(value ?? "")
    .split(" ")
    .map((word) => (word ? word.charAt(0).toLocaleUpperCase() + word.slice(1) : word))
    .join(" ");
}

// Global auto-capitalization for every text input across all portals and pages.
// Mounted once at the app root. It works through React state by using the
// native HTMLInputElement value setter, then re-fires a bubbled input event so
// React's onChange reads the capitalized value and updates the form state.
export default function AutoCapitalize() {
  useEffect(() => {
    const nativeSet = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value"
    ).set;

    function handleChange(e) {
      const target = e.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (e.isComposing) return;

      const type = target.type || "text";
      if (SKIP_TYPES.has(type)) return;
      if (target.readOnly || target.disabled) return;
      if (!target.value) return;

      const start = target.selectionStart;
      const end = target.selectionEnd;

      const next = titleCase(target.value);
      if (next === target.value) return;

      nativeSet.call(target, next);
      try {
        target.setSelectionRange(start, end);
      } catch (_) {
        // selection may not be settable on some elements; ignore
      }
      target.dispatchEvent(new Event("input", { bubbles: true }));
    }

    document.addEventListener("input", handleChange, true);
    return () => document.removeEventListener("input", handleChange, true);
  }, []);

  return null;
}