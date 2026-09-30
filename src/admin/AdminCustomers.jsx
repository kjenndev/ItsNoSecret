import Pagination from '../components/Pagination.jsx';
import { usePagination } from '../components/usePagination.js';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { 
  Typography, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Button, Box, CircularProgress, Alert, 
  Dialog, DialogTitle, DialogContent, TextField, DialogActions, IconButton, Tooltip
} from '@mui/material';
import { Edit, DeleteOutlined } from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import apiFetch from './api';
import DeleteCustomerDialog from './DeleteCustomerDialog.jsx';
import { PageHeading, PolishedCard } from '../components/Shared.jsx';

const AdminCustomers = () => {
  const isAdmin = JSON.parse(localStorage.getItem('user') || '{}').roles?.includes('ADMIN') === true;
  const [deleteTarget, setDeleteTarget] = useState(null);
  const requestGeneration = useRef(0);
  const page = usePagination();
  const { offset, readPage } = page;
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', address: '' });

  const fetchCustomers = useCallback(async () => {
    const generation = ++requestGeneration.current;
    setLoading(true);
    setError('');
    try {
      const response = await apiFetch(`/api/crm/customers?limit=50&offset=${offset}`);
      if (generation !== requestGeneration.current) return;
      if (response.ok) {
        const data = await response.json();
        if (generation !== requestGeneration.current) return;
        setCustomers(data);
        readPage(response, data.length);
      } else {
        setError('Failed to fetch customers');
      }
    } catch {
      if (generation === requestGeneration.current) setError('Connection error');
    } finally {
      if (generation === requestGeneration.current) setLoading(false);
    }
  }, [offset, readPage]);

  useEffect(() => {
    let active = true;
    const init = async () => {
      if (!active) return;
      await fetchCustomers();
    };
    void Promise.resolve().then(init);
    return () => { active = false; requestGeneration.current += 1; };
  }, [fetchCustomers]);

  const handleOpen = (customer = null) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({ 
        name: customer.name, 
        email: customer.email || '', 
        phone: customer.phone || '', 
        address: customer.address || '' 
      });
    } else {
      setEditingCustomer(null);
      setFormData({ name: '', email: '', phone: '', address: '' });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingCustomer(null);
  };

  const handleSubmit = async () => {
    const url = editingCustomer ? `/api/crm/customers/${editingCustomer.id}` : '/api/crm/customers';
    const method = editingCustomer ? 'PUT' : 'POST';

    try {
      const response = await apiFetch(url, {
        method,
        body: JSON.stringify({ ...formData, email: formData.email.trim().toLowerCase() || null }),
      });

      if (response.ok) {
        handleClose();
        fetchCustomers();
      } else {
        const data = await response.json();
        alert(data.error || 'Operation failed');
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
          eyebrow="CRM"
          title="Customers"
          body="View and manage your client directory."
        />
        <Button variant="contained" color="secondary" onClick={() => handleOpen()}>Add Customer</Button>
      </Box>

      <PolishedCard sx={{ p: 0 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Tickets</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {customers.map((customer) => (
                <TableRow key={customer.id} hover>
                  <TableCell>
                    <Typography 
                      variant="subtitle2" 
                      sx={{ cursor: 'pointer', color: 'primary.light', '&:hover': { textDecoration: 'underline' } }}
                      component={RouterLink} to={`/admin/customers/${customer.id}`}
                    >
                      {customer.name}
                    </Typography>
                  </TableCell>
                  <TableCell>{customer.email || 'N/A'}</TableCell>
                  <TableCell>{customer.phone || 'N/A'}</TableCell>
                  <TableCell>{customer._count?.tickets || 0}</TableCell>
                  <TableCell>{new Date(customer.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell align="right">
                    <IconButton aria-label={`Edit customer ${customer.name}`} onClick={() => handleOpen(customer)} size="small" color="primary">
                      <Edit />
                    </IconButton>
                    {isAdmin && <Tooltip title="Delete customer"><IconButton aria-label={`Delete customer ${customer.name}`} onClick={() => setDeleteTarget({ id: customer.id, name: customer.name })} size="small" color="error"><DeleteOutlined /></IconButton></Tooltip>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <Pagination {...page} loading={loading} />
      </PolishedCard>

      {isAdmin && deleteTarget && <DeleteCustomerDialog customer={deleteTarget} onDeleted={() => { setDeleteTarget(null); void fetchCustomers(); }} onClose={() => setDeleteTarget(null)} />}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              autoFocus
              label="Name"
              fullWidth
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <TextField
              label="Email"
              fullWidth
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <TextField
              label="Phone"
              fullWidth
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            <TextField
              label="Address"
              fullWidth
              multiline
              rows={2}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingCustomer ? 'Save Changes' : 'Add Customer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminCustomers;
