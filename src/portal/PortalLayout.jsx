import React, { useState } from 'react';
import { useMediaQuery, useTheme } from '@mui/material';
import { Menu } from '@mui/icons-material';
import { Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Toolbar, AppBar, Typography, IconButton, Container } from '@mui/material';
import { Dashboard, AddCircle, ExitToApp, AccountCircle } from '@mui/icons-material';
import { useNavigate, useLocation, Outlet, Link as RouterLink } from 'react-router-dom';
import logoPrimary from '../assets/brand/logo-primary.svg';

const drawerWidth = 240;

const PortalLayout = () => {
  const navigate = useNavigate();
  const desktop = useMediaQuery(useTheme().breakpoints.up('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const menuItems = [
    { text: 'My Tickets', icon: <Dashboard />, path: '/portal' },
    { text: 'Submit Ticket', icon: <AddCircle />, path: '/portal/new-ticket' },
    { text: 'Account', icon: <AccountCircle />, path: '/portal/account' },
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
          {!desktop && <IconButton color="inherit" aria-label="Open navigation" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)}><Menu /></IconButton>}
          <Box component={RouterLink} to="/portal" aria-label="Workspace home" sx={{ display: { xs: 'none', sm: 'block' } }}><Box
            component="img"
            src={logoPrimary}
            alt="It’s No Secret"
            sx={{ height: 42, cursor: 'pointer', display: { xs: 'none', sm: 'block' } }}
          /></Box>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, ml: { sm: 2 } }}>
            Client Portal
          </Typography>
          <Typography variant="body2" sx={{ mr: 2, display: { xs: 'none', md: 'block' }, color: 'rgba(255,255,255,.7)' }}>
            Welcome, {user.name || user.email}
          </Typography>
          <IconButton aria-label="Sign out" color="inherit" onClick={handleLogout}>
            <ExitToApp />
          </IconButton>
        </Toolbar>
      </AppBar>
      <Drawer
        variant={desktop ? "permanent" : "temporary"}
        open={desktop || mobileOpen}
        onClose={() => setMobileOpen(false)}
        slotProps={{ paper: { component: 'nav', 'aria-label': 'Workspace navigation' } }}
        sx={{
          width: desktop ? drawerWidth : 0,
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
                  component={RouterLink}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
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
      <Box component="main" sx={{ flexGrow: 1, minWidth: 0, width: '100%', p: { xs: 2, md: 4 }, minHeight: '100vh' }}>
        <Toolbar />
        <Box sx={{ py: 2 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default PortalLayout;
