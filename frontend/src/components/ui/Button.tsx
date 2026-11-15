import type { ButtonHTMLAttributes } from 'react';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
}

const styles: Record<Variant, string> = {
  primary: 'bg-accent text-white hover:bg-accent-dark',
  secondary: 'bg-white text-ink border border-line hover:bg-paper',
  outline: 'bg-white text-accent-dark border border-accent hover:bg-accent-soft',
  ghost: 'text-muted hover:text-ink hover:bg-paper',
  danger: 'text-danger border border-line bg-white hover:bg-danger-soft',
};

export function Button({ variant = 'primary', loading, disabled, children, className = '', ...rest }: Props) {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${styles[variant]} ${className}`}
      {...rest}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}
