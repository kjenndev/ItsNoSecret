import { useCallback, useState } from 'react';
export function usePagination() {
  const [offset, setOffset] = useState(0);
  const [meta, setMeta] = useState({ total: 0, next: null, count: 0, loadedOffset: null });
  const readPage = useCallback((response, count) => {
    const headerTotal = response.headers?.get('X-Total-Count');
    const total = headerTotal == null ? count : Number(headerTotal);
    const next = response.headers?.get('X-Next-Offset');
    setMeta({ total, next: next ? Number(next) : null, count, loadedOffset: offset });
    if (headerTotal != null) {
      const lastOffset = Math.max(0, Math.floor((total - 1) / 50) * 50);
      if (offset > lastOffset) setOffset(lastOffset);
    }
  }, [offset]);
  return { offset, setOffset, readPage, ...meta };
}
