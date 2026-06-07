import React from 'react';
import { Card, Stack, Typography, Box } from '@mui/material';

const polishedAccentSx = {
  position: 'relative',
  borderTop: '3px solid rgba(46,230,166,.78)',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: -3,
    left: 0,
    right: 0,
    height: 3,
    background: 'linear-gradient(90deg, #2EE6A6 0%, #38D6FF 58%, rgba(56,214,255,0) 100%)',
    opacity: 0.9,
  },
};

export function PolishedCard({ children, sx = {}, color = 'secondary', ...props }) {
  const accentColor = color === 'primary' ? 'rgba(24,119,242,.78)' : 'rgba(46,230,166,.78)';
  const gradient = color === 'primary' 
    ? 'linear-gradient(90deg, #1877F2 0%, #38D6FF 100%)'
    : 'linear-gradient(90deg, #2EE6A6 0%, #38D6FF 58%, rgba(56,214,255,0) 100%)';

  return (
    <Card 
      {...props} 
      sx={{ 
        ...polishedAccentSx, 
        borderTop: `3px solid ${accentColor}`,
        '&::before': { ...polishedAccentSx['&::before'], background: gradient },
        ...sx 
      }}
    >
      {children}
    </Card>
  );
}

export function PageHeading({ eyebrow, title, body, sx = {} }) {
  return (
    <Stack spacing={1} sx={{ mb: 4, ...sx }}>
      {eyebrow && (
        <Typography
          variant="overline"
          sx={{
            color: 'secondary.light',
            fontFamily: '"IBM Plex Mono", monospace',
            fontWeight: 500,
            letterSpacing: '.12em',
          }}
        >
          {eyebrow}
        </Typography>
      )}
      <Typography variant="h4" sx={{ fontWeight: 600 }}>
        {title}
      </Typography>
      {body && (
        <Typography color="text.secondary">
          {body}
        </Typography>
      )}
    </Stack>
  );
}
