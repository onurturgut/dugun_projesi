"use client";
import { useRef, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { DayPicker } from "react-day-picker";
import { tr } from "react-day-picker/locale";
import { CalendarDays } from "lucide-react";

function parse(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y &&
    date.getMonth() === m - 1 &&
    date.getDate() === d
    ? date
    : undefined;
}
const iso = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const display = (value: string) =>
  value ? value.split("-").reverse().join(".") : "";

export function DateField({
  name,
  value,
  defaultValue = "",
  onValueChange,
  label = "Tarih",
  required,
  disabled,
}: {
  name?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  const [internal, setInternal] = useState(defaultValue);
  const current = value ?? internal;
  const [draft, setDraft] = useState({
    source: current,
    text: display(current),
  });
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<Date | undefined>(parse(current));
  const input = useRef<HTMLInputElement>(null);
  const text = draft.source === current ? draft.text : display(current);
  function choose(next: string) {
    input.current?.setCustomValidity("");
    setInternal(next);
    setDraft({ source: next, text: display(next) });
    onValueChange?.(next);
    setOpen(false);
  }
  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        if (next) setMonth(parse(current) ?? new Date());
        setOpen(next);
      }}
    >
      <Popover.Anchor asChild>
        <div className="admin-date-field">
          <input
            ref={input}
            className="admin-control"
            aria-label={label}
            placeholder="gg.aa.yyyy"
            inputMode="numeric"
            autoComplete="off"
            required={required}
            disabled={disabled}
            value={text}
            onChange={(e) => {
              const nextText = e.target.value;
              const next = nextText.split(".").reverse().join("-");
              const valid = !nextText || !!parse(next);
              e.target.setCustomValidity(
                valid ? "" : "Geçerli bir tarih girin (gg.aa.yyyy).",
              );
              const updated = valid ? next : current;
              setDraft({ source: updated, text: nextText });
              if (valid) {
                setInternal(next);
                onValueChange?.(next);
              }
            }}
          />
          {name && <input type="hidden" name={name} value={current} />}
          <Popover.Trigger
            className="admin-calendar-trigger"
            type="button"
            disabled={disabled}
            aria-label={`${label}: takvimi aç`}
          >
            <CalendarDays size={18} />
          </Popover.Trigger>
        </div>
      </Popover.Anchor>
      <Popover.Portal>
        <Popover.Content
          className="admin-calendar-menu"
          align="end"
          sideOffset={6}
          collisionPadding={12}
          aria-label={`${label} seçimi`}
        >
          <DayPicker
            mode="single"
            locale={tr}
            weekStartsOn={1}
            showOutsideDays
            selected={parse(current)}
            month={month}
            onMonthChange={setMonth}
            onSelect={(date) => {
              if (date) choose(iso(date));
            }}
            autoFocus
          />
          <div className="admin-calendar-footer">
            <button type="button" onClick={() => choose("")}>
              Temizle
            </button>
            <button type="button" onClick={() => choose(iso(new Date()))}>
              Bugün
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
