"use client";

import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";

const MAX_TAGS = 10;
const MAX_TAG_LENGTH = 50;

type TagInputProps = {
  value: string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
};

function normalizeTag(raw: string): string {
  return raw.trim().slice(0, MAX_TAG_LENGTH);
}

export default function TagInput({
  value,
  onChange,
  disabled = false,
  placeholder = "Type a tag and press Enter",
  className = "",
}: TagInputProps) {
  const [draft, setDraft] = useState("");

  const addTag = (raw: string) => {
    const tag = normalizeTag(raw);
    if (!tag || disabled) return;
    if (value.length >= MAX_TAGS) return;

    const exists = value.some((t) => t.toLowerCase() === tag.toLowerCase());
    if (exists) {
      setDraft("");
      return;
    }

    onChange([...value, tag]);
    setDraft("");
  };

  const removeTag = (index: number) => {
    if (disabled) return;
    onChange(value.filter((_, i) => i !== index));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addTag(draft);
      return;
    }
    if (event.key === "Backspace" && !draft && value.length > 0) {
      removeTag(value.length - 1);
    }
  };

  const atLimit = value.length >= MAX_TAGS;

  return (
    <div className={className}>
      <div className="mb-1 flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">Tags</label>
        <span className="text-xs text-gray-500">
          {value.length}/{MAX_TAGS}
        </span>
      </div>
      <div
        className={`flex min-h-[42px] flex-wrap items-center gap-1.5 rounded-md border bg-white px-2 py-1.5 transition-colors ${
          disabled
            ? "border-gray-200 opacity-60"
            : "border-gray-300 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500"
        }`}
      >
        {value.map((tag, index) => (
          <span
            key={`${tag}-${index}`}
            className="inline-flex max-w-full items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700"
          >
            <span className="truncate">{tag}</span>
            {!disabled && (
              <button
                type="button"
                onClick={() => removeTag(index)}
                className="shrink-0 rounded text-blue-500 hover:text-blue-800"
                aria-label={`Remove ${tag}`}
              >
                <X size={12} />
              </button>
            )}
          </span>
        ))}
        <input
          type="text"
          value={draft}
          disabled={disabled || atLimit}
          maxLength={MAX_TAG_LENGTH}
          placeholder={value.length === 0 ? placeholder : atLimit ? "Max tags reached" : ""}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => {
            if (draft.trim()) addTag(draft);
          }}
          className="min-w-[140px] flex-1 border-0 bg-transparent px-1 py-1 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none disabled:cursor-not-allowed"
        />
      </div>
      <p className="mt-1 text-xs text-gray-500">
        Press Enter to add a tag. Up to {MAX_TAGS} tags.
      </p>
    </div>
  );
}
