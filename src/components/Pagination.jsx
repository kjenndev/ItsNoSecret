import React from 'react';
import { Box, Button, Typography } from '@mui/material';
export default function Pagination({ offset, setOffset, total, next, loading = false, count = 50, loadedOffset = offset }) {
  const pending = loading || loadedOffset !== offset || (total > 0 && offset >= total);
  return <Box aria-label="Pagination" sx={{ p: 2, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
    <Button disabled={pending || offset === 0} onClick={() => setOffset(Math.max(0, offset - 50))}>Previous page</Button>
    <Typography variant="body2">{pending ? 'Loading results…' : total && count ? `${offset + 1}–${Math.min(offset + count, total)} of ${total}` : 'No results'}</Typography>
    <Button disabled={pending || next === null} onClick={() => setOffset(next)}>Next page</Button>
  </Box>;
}
