"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";

interface DateRangePickerProps {
  from: string; // "YYYY-MM-DD" or ""
  to: string;   // "YYYY-MM-DD" or ""
  onChange: (from: string, to: string) => void;
  placeholder?: string;
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_LABEL = (d: Date) => d.toLocaleDateString("en-US", { month: "long", year: "numeric" });

const pad = (n: number) => String(n).padStart(2, "0");
const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseISO = (s: string): Date | null => {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};
const sameDay = (a: Date | null, b: Date | null) =>
  !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1);

function getMonthCells(viewDate: Date): (Date | null)[] {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = Array(first.getDay()).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  return cells;
}

function formatDisplay(from: Date | null, to: Date | null) {
  if (!from && !to) return null;
  const opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric" };
  if (from && to && !sameDay(from, to)) return `${from.toLocaleDateString("en-IN", opts)} – ${to.toLocaleDateString("en-IN", opts)}`;
  return (from ?? to)!.toLocaleDateString("en-IN", opts);
}

export default function DateRangePicker({ from, to, onChange, placeholder = "Select date range" }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [tempFrom, setTempFrom] = useState<Date | null>(null);
  const [tempTo, setTempTo] = useState<Date | null>(null);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [leftMonth, setLeftMonth] = useState<Date>(new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const f = parseISO(from);
    const t = parseISO(to);
    setTempFrom(f);
    setTempTo(t);
    setLeftMonth(addMonths(f ?? new Date(), 0));
  }, [open, from, to]);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const rightMonth = useMemo(() => addMonths(leftMonth, 1), [leftMonth]);

  const rangeStart = tempFrom && tempTo ? (tempFrom < tempTo ? tempFrom : tempTo) : tempFrom;
  const rangeEnd = tempFrom && tempTo ? (tempFrom < tempTo ? tempTo : tempFrom) : hoverDate && tempFrom ? hoverDate : null;

  const isInRange = (day: Date) => {
    if (!rangeStart) return false;
    const end = rangeEnd ?? rangeStart;
    const lo = rangeStart < end ? rangeStart : end;
    const hi = rangeStart < end ? end : rangeStart;
    return day >= lo && day <= hi;
  };

  const handleDayClick = (day: Date) => {
    if (!tempFrom || (tempFrom && tempTo)) {
      setTempFrom(day);
      setTempTo(null);
    } else {
      if (day < tempFrom) { setTempTo(tempFrom); setTempFrom(day); }
      else setTempTo(day);
    }
  };

  const applyPreset = (f: Date, t: Date) => {
    setTempFrom(startOfDay(f));
    setTempTo(startOfDay(t));
    setLeftMonth(addMonths(f, 0));
  };

  const today = startOfDay(new Date());
  const presets: { label: string; range: () => [Date, Date] }[] = [
    { label: "Today",        range: () => [today, today] },
    { label: "Yesterday",    range: () => [addDays(today, -1), addDays(today, -1)] },
    { label: "Last 7 days",  range: () => [addDays(today, -6), today] },
    { label: "Last 30 days", range: () => [addDays(today, -29), today] },
    { label: "This month",   range: () => [new Date(today.getFullYear(), today.getMonth(), 1), today] },
    { label: "Last month",   range: () => [new Date(today.getFullYear(), today.getMonth() - 1, 1), new Date(today.getFullYear(), today.getMonth(), 0)] },
  ];

  const handleApply = () => {
    onChange(tempFrom ? toISO(tempFrom) : "", tempTo ? toISO(tempTo) : tempFrom ? toISO(tempFrom) : "");
    setOpen(false);
  };

  const handleClear = () => {
    setTempFrom(null);
    setTempTo(null);
    onChange("", "");
    setOpen(false);
  };

  const display = formatDisplay(parseISO(from), parseISO(to));

  function renderMonth(viewDate: Date, showPrev: boolean, showNext: boolean) {
    return (
      <div className="w-[240px]">
        <div className="flex items-center justify-between mb-2">
          {showPrev ? (
            <button type="button" onClick={() => setLeftMonth((m) => addMonths(m, -1))} className="p-1 rounded-md hover:bg-slate-100 text-slate-500">
              <ChevronLeft className="w-4 h-4" />
            </button>
          ) : <span className="w-6" />}
          <p className="text-sm font-semibold text-slate-800">{MONTH_LABEL(viewDate)}</p>
          {showNext ? (
            <button type="button" onClick={() => setLeftMonth((m) => addMonths(m, 1))} className="p-1 rounded-md hover:bg-slate-100 text-slate-500">
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : <span className="w-6" />}
        </div>
        <div className="grid grid-cols-7 gap-y-0.5">
          {WEEKDAYS.map((w) => (
            <div key={w} className="text-[10px] font-medium text-slate-400 text-center py-1">{w}</div>
          ))}
          {getMonthCells(viewDate).map((day, i) => {
            if (!day) return <div key={i} />;
            const isStart = sameDay(day, rangeStart);
            const isEnd = sameDay(day, rangeEnd);
            const inRange = isInRange(day);
            const isToday = sameDay(day, today);
            return (
              <button
                key={i}
                type="button"
                onClick={() => handleDayClick(day)}
                onMouseEnter={() => setHoverDate(day)}
                className={`relative h-8 text-xs flex items-center justify-center transition-colors
                  ${inRange ? "bg-indigo-50" : "hover:bg-slate-100"}
                  ${isStart || isEnd ? "bg-indigo-600 text-white font-semibold hover:bg-indigo-600 rounded-full" : "text-slate-700 rounded-full"}
                  ${isToday && !isStart && !isEnd ? "ring-1 ring-indigo-300" : ""}
                `}
              >
                {day.getDate()}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 w-[230px] px-3 py-2 text-sm border rounded-lg outline-none transition-colors
          ${open ? "border-indigo-400 ring-2 ring-indigo-100" : "border-slate-300 hover:border-slate-400"}
          bg-white`}
      >
        <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
        <span className={`flex-1 text-left truncate ${display ? "text-slate-700" : "text-slate-400"}`}>
          {display ?? placeholder}
        </span>
        {display && (
          <X
            className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 shrink-0"
            onClick={(e) => { e.stopPropagation(); onChange("", ""); }}
          />
        )}
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl flex overflow-hidden">
          <div className="w-[140px] border-r border-slate-100 p-2 flex flex-col gap-0.5 bg-slate-50">
            {presets.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => { const [f, t] = p.range(); applyPreset(f, t); }}
                className="text-left text-xs px-2.5 py-1.5 rounded-lg text-slate-600 hover:bg-white hover:text-indigo-600 hover:shadow-sm transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="p-4">
            <div className="flex gap-4">
              {renderMonth(leftMonth, true, false)}
              {renderMonth(rightMonth, false, true)}
            </div>

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
              <p className="text-xs text-slate-500">
                {tempFrom ? formatDisplay(tempFrom, tempTo) : "Pick a start date"}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  disabled={!tempFrom}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-300"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
