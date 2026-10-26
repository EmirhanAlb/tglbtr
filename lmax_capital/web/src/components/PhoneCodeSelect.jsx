import { useState, useEffect, useRef, useMemo } from "react";
import { DIAL_CODES } from "../data/dial-codes.js";

export function PhoneCodeSelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef(null);
  const searchRef = useRef(null);

  const selected = useMemo(
    () => DIAL_CODES.find((c) => c.dial === value) || DIAL_CODES[0],
    [value]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return DIAL_CODES;
    return DIAL_CODES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.dial.includes(q)
    );
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    setTimeout(() => searchRef.current?.focus(), 0);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={`phone-code ${open ? "is-open" : ""}`} ref={wrapRef}>
      <button
        type="button"
        className="phone-code-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="phone-code-flag">{selected.flag}</span>
        <span className="phone-code-dial">{selected.dial}</span>
        <svg className="phone-code-chev" viewBox="0 0 10 6" aria-hidden="true">
          <path fill="currentColor" d="M0 0h10L5 6z" />
        </svg>
      </button>

      {open && (
        <div className="phone-code-panel" role="listbox">
          <div className="phone-code-search-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              ref={searchRef}
              className="phone-code-search"
              type="text"
              placeholder="Ülke ara..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <ul className="phone-code-list">
            {filtered.length === 0 && (
              <li className="phone-code-empty">—</li>
            )}
            {filtered.map((c) => (
              <li key={c.code}>
                <button
                  type="button"
                  className={`phone-code-item ${c.dial === value ? "active" : ""}`}
                  onClick={() => {
                    onChange(c.dial);
                    setOpen(false);
                    setQuery("");
                  }}
                  role="option"
                  aria-selected={c.dial === value}
                >
                  <span className="phone-code-flag">{c.flag}</span>
                  <span className="phone-code-name">{c.name}</span>
                  <span className="phone-code-dial mono">{c.dial}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
