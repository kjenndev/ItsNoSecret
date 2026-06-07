import React, { useState } from 'react';
import { Box, Button, TextField, Typography, Container, Paper, Alert, Stack } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import logoPrimary from '../assets/brand/logo-primary.svg';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Dynamic redirect based on roles
        const roles = data.user.roles || [];
        if (roles.includes('ADMIN') || roles.includes('TECHNICIAN')) {
          navigate('/admin');
        } else if (roles.includes('CLIENT')) {
          navigate('/portal');
        } else {
          navigate('/'); // Fallback
        }
      } else {
        setError(data.error || 'Login failed');
      }
    } catch {
      setError('Connection error. Is the server running?');
    }
  };

  return (
    <Box 
      sx={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        py: 4
      }}
    >
      <Container maxWidth="xs">
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Box
            component="img"
            src={logoPrimary}
            alt="It’s No Secret Computer Services"
            sx={{ width: 280, height: 'auto', mb: 6 }}
          />
          <Paper 
            elevation={0} 
            sx={{ 
              p: 4, 
              width: '100%',
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
            }}
          >
            <Typography component="h1" variant="h5" align="center" gutterBottom sx={{ fontWeight: 600 }}>
              Portal Login
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
              Secure access for staff and clients
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            
            <Stack component="form" onSubmit={handleSubmit} spacing={2.5}>
              <TextField
                required
                fullWidth
                label="Email Address"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <TextField
                required
                fullWidth
                label="Password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                sx={{ mt: 1 }}
              >
                Sign In
              </Button>
            </Stack>
          </Paper>
          <Button 
            variant="text" 
            color="secondary" 
            onClick={() => navigate('/')} 
            sx={{ mt: 3 }}
          >
            Back to Homepage
          </Button>
        </Box>
      </Container>
    </Box>
  );
};

export default LoginPage;
