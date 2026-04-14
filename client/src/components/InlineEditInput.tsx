import { useState } from 'react';
import { Input } from '@/components/Input';

interface InlineEditInputProps {
  value: string;
  onSave: (newValue: string) => void;
  onCancel: () => void;
  autoFocus?: boolean;
  onBlur?: () => void;
}

export function InlineEditInput({
  value,
  onSave,
  onCancel,
  autoFocus = true,
  onBlur,
}: InlineEditInputProps) {
  const [draft, setDraft] = useState(value);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const trimmed = draft.trim();
      if (trimmed) onSave(trimmed);
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <Input
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={onBlur}
      autoFocus={autoFocus}
    />
  );
}
