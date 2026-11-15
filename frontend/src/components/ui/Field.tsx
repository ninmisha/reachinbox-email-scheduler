import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';

const base =
  'w-full rounded-lg border border-line bg-white px-3 py-2 text-sm placeholder:text-muted/70 focus:border-accent';

interface FieldProps {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
}
export function Field({ label, hint, children }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export const Input = (p: InputHTMLAttributes<HTMLInputElement>) => <input className={base} {...p} />;
export const Textarea = (p: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea className={`${base} min-h-32 resize-y`} {...p} />
);
