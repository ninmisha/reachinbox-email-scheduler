import { useRef } from 'react';

interface Props {
  onChange: (html: string) => void;
  placeholder?: string;
}

const TOOLS: { cmd: string; label: string; title: string; cls?: string }[] = [
  { cmd: 'undo', label: '↶', title: 'Undo' },
  { cmd: 'redo', label: '↷', title: 'Redo' },
  { cmd: 'bold', label: 'B', title: 'Bold', cls: 'font-bold' },
  { cmd: 'italic', label: 'I', title: 'Italic', cls: 'italic' },
  { cmd: 'underline', label: 'U', title: 'Underline', cls: 'underline' },
  { cmd: 'insertUnorderedList', label: '• List', title: 'Bulleted list' },
  { cmd: 'insertOrderedList', label: '1. List', title: 'Numbered list' },
];

/** Small rich-text editor (contenteditable). Output is HTML, sent as the email body. */
export function RichTextEditor({ onChange, placeholder }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const run = (cmd: string, value?: string) => {
    ref.current?.focus();
    document.execCommand(cmd, false, value);
    onChange(ref.current?.innerHTML ?? '');
  };

  return (
    <div className="overflow-hidden rounded-lg border border-line focus-within:border-accent">
      <div className="flex flex-wrap items-center gap-1 border-b border-line bg-paper px-2 py-1.5" role="toolbar" aria-label="Formatting">
        {TOOLS.map((t) => (
          <button
            key={t.cmd}
            type="button"
            title={t.title}
            aria-label={t.title}
            // mousedown + preventDefault keeps the text selection while clicking the toolbar
            onMouseDown={(e) => {
              e.preventDefault();
              run(t.cmd);
            }}
            className={`rounded px-2 py-1 text-xs hover:bg-white ${t.cls ?? ''}`}
          >
            {t.label}
          </button>
        ))}
        <button
          type="button"
          title="Insert link"
          aria-label="Insert link"
          onMouseDown={(e) => {
            e.preventDefault();
            const url = window.prompt('Link URL (https://...)');
            if (url && /^https?:\/\//i.test(url)) run('createLink', url);
          }}
          className="rounded px-2 py-1 text-xs hover:bg-white"
        >
          Link
        </button>
      </div>
      <div
        ref={ref}
        contentEditable
        role="textbox"
        aria-multiline="true"
        aria-label="Email body"
        data-placeholder={placeholder}
        onInput={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
        className="rich min-h-64 px-3 py-3 text-sm outline-none"
      />
    </div>
  );
}
