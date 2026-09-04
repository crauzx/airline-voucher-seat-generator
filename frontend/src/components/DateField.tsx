import { ChangeEvent, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  MAX_FLIGHT_YEAR,
  MIN_FLIGHT_YEAR,
  applyDateInputEdit,
  isFlightYearInRange,
} from '../utils/date';

interface DateFieldProps {
  label: string;
  name: string;
  value: string;
  error?: string;
  required?: boolean;
  onChange: (value: string) => void;
}

const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DISPLAY_DATE_PATTERN = /^(\d{2})-(\d{2})-(\d{4})$/;

function parseDisplayDate(value: string): { day: number; month: number; year: number } | null {
  const match = DISPLAY_DATE_PATTERN.exec(value);
  if (!match) return null;
  return { day: Number(match[1]), month: Number(match[2]), year: Number(match[3]) };
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function pad4(value: number): string {
  return String(value).padStart(4, '0');
}

export function DateField({ label, name, value, error, required, onChange }: DateFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const today = new Date();
  const parsed = parseDisplayDate(value);
  const hasUsableYear = parsed !== null && isFlightYearInRange(parsed.year);
  const [viewYear, setViewYear] = useState(hasUsableYear ? parsed.year : today.getFullYear());
  const [viewMonth, setViewMonth] = useState(
    (hasUsableYear ? parsed.month : today.getMonth() + 1) - 1
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingCaretRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useLayoutEffect(() => {
    const caret = pendingCaretRef.current;
    if (caret === null) return;
    pendingCaretRef.current = null;
    inputRef.current?.setSelectionRange(caret, caret);
  });

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const { value: rawValue, selectionStart } = event.target;
    const edit = applyDateInputEdit(value, rawValue, selectionStart ?? rawValue.length);
    pendingCaretRef.current = edit.caret;
    onChange(edit.value);
  }

  function openCalendar() {
    const current = parseDisplayDate(value);
    if (current && isFlightYearInRange(current.year)) {
      setViewYear(current.year);
      setViewMonth(current.month - 1);
    }
    setIsOpen(true);
  }

  function selectDay(day: number) {
    onChange(`${pad2(day)}-${pad2(viewMonth + 1)}-${pad4(viewYear)}`);
    setIsOpen(false);
  }

  function goToPreviousMonth() {
    if (isAtRangeStart) return;
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((year) => year - 1);
    } else {
      setViewMonth((month) => month - 1);
    }
  }

  function goToNextMonth() {
    if (isAtRangeEnd) return;
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((year) => year + 1);
    } else {
      setViewMonth((month) => month + 1);
    }
  }

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const isAtRangeStart = viewYear <= MIN_FLIGHT_YEAR && viewMonth === 0;
  const isAtRangeEnd = viewYear >= MAX_FLIGHT_YEAR && viewMonth === 11;
  const dayCells: Array<number | null> = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  const inputClasses = `w-full rounded-md border px-3 py-2 pr-10 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 ${
    error ? 'border-red-400' : 'border-slate-300'
  }`;

  return (
    <div className="flex flex-col gap-1" ref={containerRef}>
      <label htmlFor={name} className="text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>

      <div className="relative">
        <input
          id={name}
          name={name}
          ref={inputRef}
          type="text"
          value={value}
          placeholder="DD-MM-YYYY"
          inputMode="numeric"
          onChange={handleInputChange}
          className={inputClasses}
        />
        <button
          type="button"
          aria-label="Open calendar"
          onClick={() => (isOpen ? setIsOpen(false) : openCalendar())}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600"
        >
          <CalendarIcon />
        </button>

        {isOpen && (
          <div className="absolute z-10 mt-1 w-64 rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={goToPreviousMonth}
                disabled={isAtRangeStart}
                aria-label="Previous month"
                className="rounded px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                &#8249;
              </button>
              <span className="text-sm font-medium text-slate-700">
                {MONTH_LABELS[viewMonth]} {viewYear}
              </span>
              <button
                type="button"
                onClick={goToNextMonth}
                disabled={isAtRangeEnd}
                aria-label="Next month"
                className="rounded px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                &#8250;
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-400">
              {WEEKDAY_LABELS.map((weekday) => (
                <span key={weekday}>{weekday}</span>
              ))}
            </div>

            <div className="mt-1 grid grid-cols-7 gap-1">
              {dayCells.map((day, index) => {
                if (day === null) {
                  return <span key={`empty-${index}`} />;
                }

                const isSelected =
                  parsed !== null &&
                  parsed.day === day &&
                  parsed.month === viewMonth + 1 &&
                  parsed.year === viewYear;

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => selectDay(day)}
                    className={`rounded-md py-1 text-sm hover:bg-sky-100 ${
                      isSelected ? 'bg-sky-600 text-white hover:bg-sky-600' : 'text-slate-700'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {error && (
        <span role="alert" className="text-sm text-red-600">
          {error}
        </span>
      )}
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
      <path
        fillRule="evenodd"
        d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2ZM3.5 8v7.25c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25V8h-13Z"
        clipRule="evenodd"
      />
    </svg>
  );
}
