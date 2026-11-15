/** Strips scripts and event handlers from rich-text HTML before rendering it. */
export function sanitizeHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script,style,iframe,object,embed,link,meta').forEach((n) => n.remove());
  doc.body.querySelectorAll('*').forEach((el) => {
    [...el.attributes].forEach((a) => {
      const bad = a.name.startsWith('on') || (['href', 'src'].includes(a.name) && /^\s*javascript:/i.test(a.value));
      if (bad) el.removeAttribute(a.name);
    });
  });
  return doc.body.innerHTML;
}

export const htmlToText = (html: string): string =>
  new DOMParser().parseFromString(html, 'text/html').body.textContent?.replace(/\s+/g, ' ').trim() ?? '';
