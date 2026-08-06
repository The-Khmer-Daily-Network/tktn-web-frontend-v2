"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import type { Category } from "@/types/category";

type CategorySelectProps = {
  categories: Category[];
  value: number | null;
  onChange: (categoryId: number | null) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
};

type FlatOption = {
  id: number;
  name: string;
  parentId: number | null;
  parentName: string | null;
  isParent: boolean;
};

function buildOptions(categories: Category[]): FlatOption[] {
  const options: FlatOption[] = [];
  categories.forEach((cat) => {
    options.push({
      id: cat.id,
      name: cat.name,
      parentId: null,
      parentName: null,
      isParent: true,
    });
    cat.subcategories.forEach((sub) => {
      options.push({
        id: sub.id,
        name: sub.name,
        parentId: cat.id,
        parentName: cat.name,
        isParent: false,
      });
    });
  });
  return options;
}

function labelFor(option: FlatOption | undefined): string {
  if (!option) return "";
  if (option.isParent || !option.parentName) return option.name;
  return `${option.parentName} / ${option.name}`;
}

export default function CategorySelect({
  categories,
  value,
  onChange,
  disabled = false,
  placeholder = "Select category",
  className = "",
}: CategorySelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  const options = useMemo(() => buildOptions(categories), [categories]);
  const selected = options.find((o) => o.id === value);

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return categories
      .map((cat) => {
        const parentMatches = !q || cat.name.toLowerCase().includes(q);
        const subs = cat.subcategories.filter(
          (sub) =>
            !q ||
            sub.name.toLowerCase().includes(q) ||
            parentMatches,
        );
        if (!parentMatches && subs.length === 0) return null;
        return { parent: cat, subs };
      })
      .filter(Boolean) as Array<{
      parent: Category;
      subs: Category["subcategories"];
    }>;
  }, [categories, query]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [open]);

  const selectOption = (id: number | null) => {
    onChange(id);
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <div
        className={`flex min-w-[220px] max-w-[320px] items-center rounded-md border bg-white transition-colors ${
          open
            ? "border-blue-500 ring-1 ring-blue-500"
            : "border-gray-300 hover:border-gray-400"
        } ${disabled ? "opacity-50" : ""}`}
      >
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((prev) => !prev)}
          className={`flex min-w-0 flex-1 items-center justify-between gap-2 px-3 py-2 text-left text-sm ${
            disabled ? "cursor-not-allowed" : "cursor-pointer"
          }`}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span
            className={`truncate ${
              selected ? "font-medium text-gray-900" : "text-gray-500"
            }`}
          >
            {selected ? labelFor(selected) : placeholder}
          </span>
          <ChevronDown
            size={16}
            className={`shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
        {selected && !disabled && (
          <button
            type="button"
            onClick={() => selectOption(null)}
            className="mr-1.5 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            title="Clear category"
            aria-label="Clear category"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute left-0 z-50 mt-1.5 w-[min(100vw-2rem,320px)] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="border-b border-gray-100 p-2">
            <div className="relative">
              <Search
                size={14}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search categories…"
                className="w-full rounded-md border border-gray-200 bg-gray-50 py-1.5 pl-8 pr-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto py-1" role="listbox">
            {filteredGroups.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-gray-500">
                No categories found
              </p>
            ) : (
              filteredGroups.map(({ parent, subs }) => (
                <div key={parent.id} className="py-1">
                  <div className="px-3 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    {parent.name}
                  </div>
                  <OptionRow
                    label={parent.name}
                    hint="Parent"
                    selected={value === parent.id}
                    onSelect={() => selectOption(parent.id)}
                  />
                  {subs.map((sub) => (
                    <OptionRow
                      key={sub.id}
                      label={sub.name}
                      selected={value === sub.id}
                      indented
                      onSelect={() => selectOption(sub.id)}
                    />
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function OptionRow({
  label,
  hint,
  selected,
  indented = false,
  onSelect,
}: {
  label: string;
  hint?: string;
  selected: boolean;
  indented?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onSelect}
      className={`flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors ${
        indented ? "pl-6" : ""
      } ${
        selected
          ? "bg-blue-50 text-blue-700"
          : "text-gray-800 hover:bg-gray-50"
      }`}
    >
      <span className="flex min-w-0 items-center gap-2">
        <span className={`truncate ${selected ? "font-medium" : ""}`}>
          {label}
        </span>
        {hint && (
          <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-500">
            {hint}
          </span>
        )}
      </span>
      {selected && <Check size={14} className="shrink-0 text-blue-600" />}
    </button>
  );
}
