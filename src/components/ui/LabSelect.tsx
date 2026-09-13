"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import "./lab-select.css";

export type LabSelectOption = {
  value: string;
  label: string;
  description?: string;
  badge?: string;
  number?: number | null;
};

type LabSelectProps = {
  id?: string;
  label: string;
  value: string;
  options: LabSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  searchable?: boolean;
  compact?: boolean;
  variant?: "default" | "player";
  playerNumber?: number | null;
  triggerContent?: ReactNode;
};

type MenuPosition = CSSProperties & { "--lab-select-accent": string };

function normalize(text: string) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
}

/** A controlled, single-value combobox. Option values must be unique.
 * Search is enabled by default; compact only hides the visible label.
 * Player mode uses a button and moves search into a nonmodal portalled popup.
 * Tab follows the surrounding form in both modes.
 */
export default function LabSelect({
  id,
  label,
  value,
  options,
  onChange,
  placeholder = "Choose an option",
  disabled = false,
  searchable = true,
  compact = false,
  variant = "default",
  playerNumber,
  triggerContent,
}: LabSelectProps) {
  const generatedId = useId();
  const controlId = id ?? `lab-select-${generatedId}`;
  const labelId = `${controlId}-label`;
  const listId = `${controlId}-listbox`;
  const popupId = `${controlId}-popup`;
  const isPlayer = variant === "player";
  const canSearch = isPlayer || searchable;
  const customTrigger = isPlayer && triggerContent != null;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const [position, setPosition] = useState<MenuPosition>();
  const rootRef = useRef<HTMLDivElement>(null);
  const controlRef = useRef<HTMLInputElement | HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const scrollToActive = useRef(true);
  const typeahead = useRef({ text: "", time: 0 });
  const expanded = open && !disabled;
  const selected = options.find((option) => option.value === value);
  const selectedNumber = playerNumber !== undefined ? playerNumber : selected?.number;
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  const filtered = canSearch && terms.length
    ? options.filter((option) => {
        const text = normalize(
          `${option.label} ${option.description ?? ""} ${option.badge ?? ""} ${option.number ?? ""} ${option.value}`,
        );
        return terms.every((term) => text.includes(term));
      })
    : options;
  const foundIndex = filtered.findIndex((option) => option.value === highlighted);
  const activeIndex = foundIndex >= 0 ? foundIndex : filtered.length ? 0 : -1;
  const activeId = activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined;

  function focusControl() {
    controlRef.current?.focus({ preventScroll: true });
    if (controlRef.current instanceof HTMLInputElement) controlRef.current.select();
  }

  function close(restoreFocus = false) {
    setOpen(false);
    setQuery("");
    typeahead.current = { text: "", time: 0 };
    if (restoreFocus) focusControl();
  }

  const measureMenu = useCallback((): MenuPosition | undefined => {
    const root = rootRef.current;
    if (!root) return;
    const rect = root.querySelector(".lab-select-control")!.getBoundingClientRect();
    const viewport = window.visualViewport;
    const viewportLeft = viewport?.offsetLeft ?? 0;
    const viewportTop = viewport?.offsetTop ?? 0;
    const viewportWidth = viewport?.width ?? window.innerWidth;
    const viewportHeight = viewport?.height ?? window.innerHeight;
    const margin = 8;
    const gap = 8;
    const anchorTop = Math.max(viewportTop + margin, Math.min(rect.top, viewportTop + viewportHeight - margin));
    const anchorBottom = Math.max(viewportTop + margin, Math.min(rect.bottom, viewportTop + viewportHeight - margin));
    const below = viewportTop + viewportHeight - anchorBottom - gap - margin;
    const above = anchorTop - viewportTop - gap - margin;
    const upwards = below < 260 && above > below;
    const width = Math.min(Math.max(rect.width, isPlayer ? 320 : 280), Math.max(0, viewportWidth - margin * 2));
    return {
      left: Math.max(viewportLeft + margin, Math.min(rect.left, viewportLeft + viewportWidth - width - margin)),
      top: upwards ? anchorTop - gap : Math.max(viewportTop + margin, anchorBottom + gap),
      width,
      maxHeight: Math.max(0, Math.min(isPlayer ? 460 : 400, upwards ? above : below)),
      transform: upwards ? "translateY(-100%)" : undefined,
      "--lab-select-accent": getComputedStyle(root).getPropertyValue("--lab-select-accent").trim() || "#68c8ce",
    };
  }, [isPlayer]);

  function show(edge?: "first" | "last") {
    if (disabled) return;
    setPosition(measureMenu());
    setQuery("");
    scrollToActive.current = true;
    setHighlighted(
      edge === "first" ? options[0]?.value ?? null
        : edge === "last" ? options.at(-1)?.value ?? null
          : selected?.value ?? options[0]?.value ?? null,
    );
    setOpen(true);
  }

  function choose(option: LabSelectOption) {
    close(true);
    onChange(option.value);
  }

  useEffect(() => {
    if (expanded && isPlayer) searchRef.current?.focus({ preventScroll: true });
  }, [expanded, isPlayer]);

  // Capture ancestor scrolling too; the list's own scrolling must not move it.
  useEffect(() => {
    if (!expanded) return;
    let frame = 0;
    function update() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = controlRef.current?.getBoundingClientRect();
        const viewport = window.visualViewport;
        const top = viewport?.offsetTop ?? 0;
        const bottom = top + (viewport?.height ?? window.innerHeight);
        if (!rect || (!isPlayer && (rect.bottom < top || rect.top > bottom))) {
          setOpen(false);
          return;
        }
        setPosition(measureMenu());
      });
    }
    function onScroll(event: Event) {
      if (event.target instanceof Node && menuRef.current?.contains(event.target)) return;
      update();
    }
    function onOutsidePointer(event: PointerEvent) {
      if (!(event.target instanceof Node)) return;
      if (!rootRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }
    function onOutsideFocus(event: FocusEvent) {
      if (!(event.target instanceof Node)) return;
      if (!rootRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }
    const observer = new ResizeObserver(update);
    if (rootRef.current) observer.observe(rootRef.current);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", onScroll, true);
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);
    document.addEventListener("pointerdown", onOutsidePointer, true);
    document.addEventListener("focusin", onOutsideFocus);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", onScroll, true);
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
      document.removeEventListener("pointerdown", onOutsidePointer, true);
      document.removeEventListener("focusin", onOutsideFocus);
    };
  }, [expanded, isPlayer, measureMenu]);

  useEffect(() => {
    if (!expanded || !scrollToActive.current) return;
    const list = listRef.current;
    const option = activeId ? document.getElementById(activeId) : null;
    if (!list || !option) return;
    // Scroll only the menu, never the document or an ancestor chart panel.
    const listRect = list.getBoundingClientRect();
    const optionRect = option.getBoundingClientRect();
    if (optionRect.top < listRect.top) list.scrollTop -= listRect.top - optionRect.top;
    else if (optionRect.bottom > listRect.bottom) list.scrollTop += optionRect.bottom - listRect.bottom;
  }, [expanded, activeId, query, position]);

  // React commits the selected label after closing. Select that committed text
  // so typing a new search replaces the label rather than appending to it.
  useEffect(() => {
    const control = controlRef.current;
    if (!expanded && control instanceof HTMLInputElement && document.activeElement === control) {
      control.select();
    }
  }, [expanded, value]);

  function onKeyDown(event: KeyboardEvent<HTMLInputElement | HTMLButtonElement>) {
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    if (event.key === "Tab") {
      // The search is portalled at the end of body. Return to the trigger
      // before native Tab moves to the next (or previous) surrounding control.
      if (isPlayer && event.currentTarget === searchRef.current) focusControl();
      close();
      return;
    }
    if (event.key === "Escape") {
      if (expanded) {
        event.preventDefault();
        event.stopPropagation();
        close(true);
      }
      return;
    }
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      scrollToActive.current = true;
      if (!expanded) {
        show(event.key === "Home" ? "first" : event.key === "End" || (event.key === "ArrowUp" && !selected) ? "last" : undefined);
        return;
      }
      const next = event.key === "Home" ? 0
        : event.key === "End" ? filtered.length - 1
          : Math.max(0, Math.min(filtered.length - 1, activeIndex + (event.key === "ArrowDown" ? 1 : -1)));
      setHighlighted(filtered[next]?.value ?? null);
      return;
    }
    const playerTrigger = isPlayer && event.currentTarget === controlRef.current;
    if (event.key === "Enter" || ((!canSearch || playerTrigger) && event.key === " ")) {
      event.preventDefault();
      if (!expanded) show();
      else if (playerTrigger) searchRef.current?.focus({ preventScroll: true });
      else if (filtered[activeIndex]) choose(filtered[activeIndex]);
      return;
    }
    if (playerTrigger && event.key.length === 1) {
      event.preventDefault();
      if (!expanded) show();
      setQuery(event.key);
      setHighlighted(null);
      searchRef.current?.focus({ preventScroll: true });
      return;
    }
    if (!canSearch && event.key.length === 1) {
      event.preventDefault();
      const now = Date.now();
      const text = now - typeahead.current.time < 700 ? typeahead.current.text + event.key : event.key;
      typeahead.current = { text, time: now };
      const repeated = [...text].every((letter) => normalize(letter) === normalize(text[0]));
      const search = normalize(repeated ? text[0] : text);
      const start = repeated ? (expanded ? activeIndex : options.findIndex((option) => option.value === value)) + 1 : 0;
      const ordered = [...options.slice(start), ...options.slice(0, start)];
      const match = ordered.find((option) => normalize(option.label).startsWith(search));
      if (!expanded) show();
      scrollToActive.current = true;
      if (match) setHighlighted(match.value);
    }
  }

  return (
    <div
      ref={rootRef}
      className={`lab-select${compact ? " lab-select--compact" : ""}${isPlayer ? " lab-select--player" : ""}${customTrigger ? " lab-select--custom-trigger" : ""}`}
      data-disabled={disabled || undefined}
      data-open={expanded || undefined}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget) && !menuRef.current?.contains(event.relatedTarget)) close();
      }}
    >
      <label id={labelId} htmlFor={controlId} className={compact ? "lab-select-sr-only" : "lab-select-label"}>
        {label}
      </label>
      <div className="lab-select-control">
        {!isPlayer && searchable ? (
          <input
            ref={(node) => { controlRef.current = node; }}
            id={controlId}
            className="lab-select-input"
            type="text"
            role="combobox"
            aria-labelledby={labelId}
            aria-expanded={expanded}
            aria-controls={expanded ? listId : undefined}
            aria-activedescendant={expanded ? activeId : undefined}
            aria-autocomplete="list"
            aria-haspopup="listbox"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            disabled={disabled}
            value={expanded ? query : selected?.label ?? ""}
            placeholder={expanded ? `Search ${label.toLocaleLowerCase()}…` : placeholder}
            onFocus={(event) => event.currentTarget.select()}
            onClick={() => { if (!expanded) show(); }}
            onChange={(event) => {
              if (!expanded) show();
              setQuery(event.target.value);
              setHighlighted(null);
              scrollToActive.current = true;
            }}
            onKeyDown={onKeyDown}
          />
        ) : (
          <button
            ref={(node) => { controlRef.current = node; }}
            id={controlId}
            className="lab-select-trigger"
            type="button"
            role={isPlayer ? undefined : "combobox"}
            aria-label={isPlayer ? `${label}: ${selected?.label ?? placeholder}` : undefined}
            aria-labelledby={isPlayer ? undefined : `${labelId} ${controlId}-value`}
            aria-expanded={expanded}
            aria-controls={expanded ? (isPlayer ? popupId : listId) : undefined}
            aria-activedescendant={!isPlayer && expanded ? activeId : undefined}
            aria-haspopup={isPlayer ? "dialog" : "listbox"}
            disabled={disabled}
            onClick={() => { if (expanded) close(); else show(); }}
            onKeyDown={onKeyDown}
          >
            {customTrigger ? triggerContent : (
              <>
                {isPlayer && selectedNumber != null && <span className="lab-select-number" aria-hidden="true">{selectedNumber}</span>}
                <span id={`${controlId}-value`} className="lab-select-value" data-placeholder={!selected || undefined}>
                  {selected?.label ?? placeholder}
                </span>
                {selected?.badge && <span className="lab-select-badge">{selected.badge}</span>}
              </>
            )}
          </button>
        )}
        {!isPlayer && searchable ? (
          <button
            className="lab-select-toggle"
            type="button"
            tabIndex={-1}
            aria-label={`${expanded ? "Close" : "Open"} ${label.toLocaleLowerCase()} options`}
            aria-controls={expanded ? listId : undefined}
            disabled={disabled}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => { focusControl(); if (expanded) close(); else show(); }}
          >
            <Chevron />
          </button>
        ) : !customTrigger && <span className="lab-select-chevron"><Chevron /></span>}
      </div>
      {expanded && position && createPortal(
        <div
          ref={menuRef}
          id={popupId}
          className={`lab-select-popup${isPlayer ? " lab-select-popup--player" : ""}`}
          role={isPlayer ? "dialog" : undefined}
          aria-label={isPlayer ? `${label} options` : undefined}
          style={position}
          onMouseDown={(event) => {
            // Keep option clicks from stealing focus, but allow search caret/selection.
            if (!(event.target instanceof HTMLInputElement)) event.preventDefault();
          }}
        >
          {isPlayer && (
            <div className="lab-select-search-wrap">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.7" /><path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
              <input
                ref={searchRef}
                id={`${controlId}-search`}
                className="lab-select-search"
                type="text"
                role="combobox"
                aria-label={`Search ${label.toLowerCase()}`}
                aria-expanded={expanded}
                aria-controls={listId}
                aria-activedescendant={activeId}
                aria-autocomplete="list"
                aria-haspopup="listbox"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                placeholder={`Search ${label.toLowerCase()}…`}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setHighlighted(null);
                  scrollToActive.current = true;
                }}
                onKeyDown={onKeyDown}
              />
            </div>
          )}
          <div className="lab-select-menu-heading" aria-hidden="true">
            <span>{isPlayer ? "Choose a player" : searchable ? "Find your pick" : label}</span>
            <span>{filtered.length} {filtered.length === 1 ? "option" : "options"}</span>
          </div>
          <ul ref={listRef} id={listId} role="listbox" aria-labelledby={labelId} className="lab-select-options">
            {filtered.map((option, index) => (
              <li
                id={`${listId}-${index}`}
                key={option.value}
                role="option"
                aria-selected={option.value === value}
                aria-label={option.label}
                aria-describedby={option.description || option.badge ? `${listId}-${index}-detail` : undefined}
                className="lab-select-option"
                data-active={index === activeIndex || undefined}
                onPointerMove={(event) => {
                  if (event.pointerType !== "mouse") return;
                  scrollToActive.current = false;
                  setHighlighted(option.value);
                }}
                onClick={() => choose(option)}
              >
                {option.number != null && <span className="lab-select-number" aria-hidden="true">{option.number}</span>}
                <span className="lab-select-option-copy">
                  <span className="lab-select-option-label">{option.label}</span>
                  {option.description && <span className="lab-select-description">{option.description}</span>}
                </span>
                {option.badge && <span className="lab-select-badge">{option.badge}</span>}
                <span className="lab-select-check" aria-hidden="true">
                  {option.value === value && <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="m4 10 4 4 8-8" stroke="currentColor" strokeWidth="2" /></svg>}
                </span>
                {(option.description || option.badge) && <span id={`${listId}-${index}-detail`} className="lab-select-sr-only">{[option.description, option.badge].filter(Boolean).join(" · ")}</span>}
              </li>
            ))}
          </ul>
          {!filtered.length && <p className="lab-select-empty">{options.length ? <>No matches for “{query}”. <span>Try another name or keyword.</span></> : "No options available yet."}</p>}
          <p className="lab-select-sr-only" role="status" aria-live="polite" aria-atomic="true">
            {filtered.length ? `${filtered.length} ${filtered.length === 1 ? "option" : "options"} available.` : "No options found."}
          </p>
          <div className="lab-select-menu-footer" aria-hidden="true">↑ ↓ to explore <span>↵ select · esc close</span></div>
        </div>,
        document.body,
      )}
    </div>
  );
}

function Chevron() {
  return <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.5" /></svg>;
}
