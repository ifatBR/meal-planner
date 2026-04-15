import { useState } from "react";
import { Input } from "@/components/Input";

interface InlineEditInputProps {
  value: string;
  onSave: (newValue: string) => void;
  onCancel: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function InlineEditInput({
  value,
  onSave,
  onCancel,
  placeholder,
  autoFocus = true,
}: InlineEditInputProps) {
  const [draft, setDraft] = useState(value);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const trimmed = draft.trim();
      if (trimmed) onSave(trimmed);
    } else if (e.key === "Escape") {
      onCancel();
    }
  };

  return (
    <Input
      value={draft}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={onCancel}
      autoFocus={autoFocus}
    />
  );
}
