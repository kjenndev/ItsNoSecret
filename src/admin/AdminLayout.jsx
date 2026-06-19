import React from 'react';
import { Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Toolbar, AppBar, Typography, IconButton } from '@mui/material';
import { ContactMail, Dashboard, People, ConfirmationNumber, ExitToApp, ManageAccounts, AccountCircle } from '@mui/icons-material';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import logoPrimary from '../assets/brand/logo-primary.svg';

const drawerWidth = 240;

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const menuItems = [
    { text: 'Dashboard', icon: <Dashboard />, path: '/admin' },
    { text: 'Customers', icon: <People />, path: '/admin/customers' },
    { text: 'Leads', icon: <ContactMail />, path: '/admin/leads' },
    { text: 'Tickets', icon: <ConfirmationNumber />, path: '/admin/tickets' },
    { text: 'Account', icon: <AccountCircle />, path: '/admin/account' },
  ];

  if (user.roles && user.roles.includes('ADMIN')) {
    menuItems.push({ text: 'Users', icon: <ManageAccounts />, path: '/admin/users' });
  }

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar sx={{ gap: 2 }}>
          <Box
            component="img"
            src={logoPrimary}
            alt="It’s No Secret"
            sx={{ height: 42, cursor: 'pointer', display: { xs: 'none', sm: 'block' } }}
            onClick={() => navigate('/admin')}
          />
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, ml: { sm: 2 } }}>
            Staff Portal
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mr: 2, display: { xs: 'none', md: 'block' } }}>
            Logged in as {user.name || user.email}
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
              <ListItem 
                key={item.text} 
                disablePadding
              >
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
                        fontWeight: location.pathname === item.path ? 600 : 400,
                        color: location.pathname === item.path ? 'secondary.main' : 'inherit'
                      }
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
        <Outlet />
      </Box>
    </Box>
  );
};

export default AdminLayout;
