// The page numbers to show: first, last, and the current one with a neighbour each side, the
// gaps as "…" — a section's "ver todos" or a search can run to hundreds of pages, and a button
// for each overflowed the screen.
export const pageWindow = (current: number, total: number): (number | 'gap')[] => {
  const shown = new Set([1, total, current - 1, current, current + 1].filter(p => p >= 1 && p <= total));
  // A gap of a single page shows that page instead of "…".
  if (shown.has(3) && !shown.has(2) && total >= 3) shown.add(2);
  if (shown.has(total - 2) && !shown.has(total - 1) && total >= 3) shown.add(total - 1);
  const pages = [...shown].sort((a, b) => a - b);
  const result: (number | 'gap')[] = [];
  pages.forEach((p, i) => {
    if (i > 0 && p - pages[i - 1] > 1) result.push('gap');
    result.push(p);
  });
  return result;
};
