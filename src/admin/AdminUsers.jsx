import Pagination from '../components/Pagination.jsx';
import { usePagination } from '../components/usePagination.js';
import PagedSelect from '../components/PagedSelect.jsx';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { 
  Typography, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Button, Box, CircularProgress, Alert, Chip,
  Dialog, DialogTitle, DialogContent, TextField, DialogActions,
  MenuItem, Select, FormControl, InputLabel, IconButton, Checkbox, ListItemText, FormControlLabel
} from '@mui/material';
import { Edit, Delete, PersonAdd } from '@mui/icons-material';
import apiFetch from './api';
import { PageHeading, PolishedCard } from '../components/Shared.jsx';

const AdminUsers = () => {
  const requestGeneration = useRef(0);
  const page = usePagination();
  const { offset, readPage } = page;
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({ email: '', password: '', name: '', roles: ['TECHNICIAN'], customerId: '', isActive: true });

  const isAdmin = JSON.parse(localStorage.getItem('user') || '{}').roles?.includes('ADMIN') === true;

  const fetchUsers = useCallback(async () => {
    const generation = ++requestGeneration.current;
    setLoading(true);
    setError('');
    if (!isAdmin) {
      setError('Access denied. Admin privileges required.');
      setLoading(false);
      return;
    }

    try {
      const usersRes = await apiFetch(`/api/users?limit=50&offset=${offset}`);

      if (generation !== requestGeneration.current) return;
      if (usersRes.ok) {
        const data = await usersRes.json();
        if (generation !== requestGeneration.current) return;
        setUsers(data);
        readPage(usersRes, data.length);
      } else {
        setError('Failed to fetch management data');
      }
    } catch {
      if (generation === requestGeneration.current) setError('Connection error');
    } finally {
      if (generation === requestGeneration.current) setLoading(false);
    }
  }, [isAdmin, offset, readPage]);

  useEffect(() => {
    let active = true;
    const init = async () => {
      if (!active) return;
      await fetchUsers();
    };
    void Promise.resolve().then(init);
    return () => { active = false; requestGeneration.current += 1; };
  }, [fetchUsers]);

  const handleOpen = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({ 
        email: user.email, 
        password: '', 
        name: user.name || '', 
        roles: user.roles || [],
        customerId: user.customer?.id || '',
        isActive: user.isActive !== false
      });
    } else {
      setEditingUser(null);
      setFormData({ email: '', password: '', name: '', roles: ['TECHNICIAN'], customerId: '', isActive: true });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingUser(null);
  };

  const handleRoleChange = (event) => {
    const {
      target: { value },
    } = event;
    let newRoles = typeof value === 'string' ? value.split(',') : value;

    // Mutually exclusive CLIENT role logic
    const wasClient = formData.roles.includes('CLIENT');
    const isClient = newRoles.includes('CLIENT');

    if (isClient && !wasClient) {
      newRoles = ['CLIENT'];
    } else if (isClient && newRoles.length > 1) {
      newRoles = newRoles.filter(role => role !== 'CLIENT');
    }

    setFormData({
      ...formData,
      roles: newRoles,
    });
  };

  const handleSubmit = async () => {
    const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
    const method = editingUser ? 'PUT' : 'POST';

    try {
      const response = await apiFetch(url, {
        method,
        body: JSON.stringify({ ...formData, customerId: formData.roles.includes('CLIENT') ? formData.customerId || null : undefined }),
      });

      if (response.ok) {
        handleClose();
        fetchUsers();
      } else {
        const data = await response.json();
        alert(data.error || 'Operation failed');
      }
    } catch {
      alert('Connection error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Deactivate this account? Its history will be preserved and sign-in will be blocked.')) return;

    try {
      const response = await apiFetch(`/api/users/${id}`, { method: 'DELETE' });
      if (response.ok) {
        fetchUsers();
      } else {
        const data = await response.json();
        alert(data.error || 'Delete failed');
      }
    } catch {
      alert('Connection error');
    }
  };


  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box>
      {loading && <CircularProgress aria-label="Loading page" />}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <PageHeading 
          eyebrow="Internal"
          title="User Management"
          body="Manage staff accounts and client portal access."
        />
        <Button variant="contained" startIcon={<PersonAdd />} onClick={() => handleOpen()}>
          Add New User
        </Button>
      </Box>

      <PolishedCard sx={{ p: 0 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Roles</TableCell>
                <TableCell>Assigned Tickets</TableCell>
                <TableCell>Joined</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} hover>
                  <TableCell>{user.name || 'N/A'} {user.isActive === false && <Chip label="Inactive" size="small" />}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {(user.roles || []).map(role => (
                        <Chip 
                          key={role}
                          label={role} 
                          color={role === 'ADMIN' ? 'primary' : role === 'TECHNICIAN' ? 'success' : role === 'CLIENT' ? 'secondary' : 'default'} 
                          size="small" 
                          sx={{ height: 20, fontSize: 10, fontFamily: '"IBM Plex Mono"' }}
                        />
                      ))}
                    </Box>
                  </TableCell>
                  <TableCell>{user._count?.tickets || 0}</TableCell>
                  <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell align="right">
                    <IconButton aria-label={`Edit user ${user.name || user.email}`} onClick={() => handleOpen(user)} size="small" color="primary">
                      <Edit />
                    </IconButton>
                    <IconButton aria-label={`Deactivate user ${user.name || user.email}`} onClick={() => handleDelete(user.id)} size="small" color="error">
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <Pagination {...page} loading={loading} />
      </PolishedCard>

      <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
        <DialogTitle>{editingUser ? 'Edit User' : 'Add New User'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Full Name"
              fullWidth
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <TextField
              label="Email Address"
              fullWidth
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <TextField
              label={editingUser ? "New Password (leave blank to keep current)" : "Password"}
              fullWidth
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
            <FormControlLabel control={<Checkbox checked={formData.isActive} onChange={e => setFormData({ ...formData, isActive: e.target.checked })} />} label="Account active" />
            <FormControl fullWidth>
              <InputLabel id="roles-label">Roles</InputLabel>
              <Select labelId="roles-label"
                multiple
                value={formData.roles}
                label="Roles"
                onChange={handleRoleChange}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
              >
                <MenuItem value="ADMIN">
                  <Checkbox checked={formData.roles.indexOf("ADMIN") > -1} />
                  <ListItemText primary="Administrator" />
                </MenuItem>
                <MenuItem value="TECHNICIAN">
                  <Checkbox checked={formData.roles.indexOf("TECHNICIAN") > -1} />
                  <ListItemText primary="Technician" />
                </MenuItem>
                <MenuItem value="CLIENT">
                  <Checkbox checked={formData.roles.indexOf("CLIENT") > -1} />
                  <ListItemText primary="Client" />
                </MenuItem>
              </Select>
            </FormControl>

            {formData.roles.includes('CLIENT') && (
              <PagedSelect endpoint="/api/crm/customers" label="Link to CRM Customer" value={formData.customerId} selected={editingUser?.customer} onChange={e => setFormData({ ...formData, customerId: e.target.value })} />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingUser ? 'Update User' : 'Create User'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminUsers;
