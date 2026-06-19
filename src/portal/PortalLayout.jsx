import React from 'react';
import { Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Toolbar, AppBar, Typography, IconButton, Container } from '@mui/material';
import { Dashboard, AddCircle, ExitToApp } from '@mui/icons-material';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import logoPrimary from '../assets/brand/logo-primary.svg';

const drawerWidth = 240;

const PortalLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const menuItems = [
    { text: 'My Tickets', icon: <Dashboard />, path: '/portal' },
    { text: 'Submit Ticket', icon: <AddCircle />, path: '/portal/new-ticket' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" color="secondary" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar sx={{ gap: 2 }}>
          <Box
            component="img"
            src={logoPrimary}
            alt="It’s No Secret"
            sx={{ height: 42, cursor: 'pointer', display: { xs: 'none', sm: 'block' } }}
            onClick={() => navigate('/portal')}
          />
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, ml: { sm: 2 } }}>
            Client Portal
          </Typography>
          <Typography variant="body2" sx={{ mr: 2, display: { xs: 'none', md: 'block' }, color: 'rgba(255,255,255,.7)' }}>
            Welcome, {user.name || user.email}
          </Typography>
          <IconButton color="inherit" onClick={handleLogout}>
            <ExitToApp />
          </IconButton>
        </Toolbar>
      </AppBar>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto', py: 2 }}>
          <List>
            {menuItems.map((item) => (
              <ListItem key={item.text} disablePadding>
                <ListItemButton
                  onClick={() => navigate(item.path)}
                  selected={location.pathname === item.path}
                >
                  <ListItemIcon sx={{ color: location.pathname === item.path ? 'secondary.main' : 'inherit' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.text}
                    slotProps={{
                      primary: {
                        sx: {
                          fontWeight: location.pathname === item.path ? 600 : 400,
                          color: location.pathname === item.path ? 'secondary.main' : 'inherit',
                        },
                      },
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 4, minHeight: '100vh' }}>
        <Toolbar />
        <Box sx={{ py: 2 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default PortalLayout;
