// A bounded display window only: financial calculations must use the full dataset.
export function pageWindow(total, requestedPage, size = 50) {
  if (!Number.isSafeInteger(total) || total < 0 || !Number.isSafeInteger(requestedPage) || !Number.isSafeInteger(size) || size < 1 || size > 100) throw new Error('Invalid pagination input.');
  const pages = Math.max(1, Math.ceil(total / size));
  const page = Math.max(0, Math.min(requestedPage, pages - 1));
  const start = page * size;
  const end = Math.min(total, start + size);
  return { page, pages, start, end, previous: page > 0, next: page + 1 < pages };
}
