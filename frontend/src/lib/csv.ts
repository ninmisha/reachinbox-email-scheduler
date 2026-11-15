const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

/** Extracts unique, lower-cased email addresses from any CSV / text content. */
export function extractEmails(text: string): { emails: string[]; duplicates: number } {
  const all = (text.match(EMAIL_RE) ?? []).map((e) => e.toLowerCase());
  const emails = [...new Set(all)];
  return { emails, duplicates: all.length - emails.length };
}
