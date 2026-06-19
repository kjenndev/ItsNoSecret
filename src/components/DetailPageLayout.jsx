import React from 'react';
import { Box } from '@mui/material';

export const detailLeftColumnWidth = '650px';

const DetailPageLayout = ({ left, right }) => (
  <Box
    data-testid="detail-page-layout"
    style={{ '--detail-left-column-width': detailLeftColumnWidth }}
    sx={{
      mt: 1,
      display: 'grid',
      gridTemplateColumns: {
        xs: '1fr',
        lg: 'var(--detail-left-column-width) minmax(0, 1fr)',
      },
      gap: 3,
      alignItems: 'start',
    }}
  >
    <Box
      data-testid="detail-left-column"
      sx={{
        width: {
          xs: '100%',
          lg: 'var(--detail-left-column-width)',
        },
        maxWidth: '100%',
      }}
    >
      {left}
    </Box>
    <Box data-testid="detail-main-column" sx={{ minWidth: 0 }}>
      {right}
    </Box>
  </Box>
);

export default DetailPageLayout;
