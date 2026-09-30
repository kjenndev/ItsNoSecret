import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';

import apiFetch from './api';

export default function DeleteCustomerDialog({ customer, onClose, onDeleted }) {
  // A list may change pages while this request is pending.
  const completed = useRef(onDeleted);
  useEffect(() => { completed.current = onDeleted; }, [onDeleted]);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);
  const submitting = useRef(false);
  const [pending, setPending] = useState(false);
  const close = () => { if (!submitting.current) onClose(); };
  const [error, setError] = useState('');
  const confirm = async () => {
    if (submitting.current) return;
    submitting.current = true;
    setPending(true);
    setError('');
    try {
      const response = await apiFetch(`/api/crm/customers/${customer.id}`, { method: 'DELETE' });
      if (!active.current) return;
      if (response.ok || response.status === 404) completed.current();
      else setError(response.status === 403 ? 'You do not have permission to delete this customer.' : 'Unable to delete this customer. Please try again.');
    } catch {
      if (!active.current) return;
      setError('Connection error. Unable to delete this customer. Please try again.');
    } finally {
      submitting.current = false;
      if (active.current) setPending(false);
    }
  };
  return <Dialog open onClose={close} maxWidth="sm" fullWidth aria-labelledby="delete-customer-title" aria-describedby="delete-customer-description">
    <DialogTitle id="delete-customer-title">Delete customer {customer.name}?</DialogTitle>
    <DialogContent><DialogContentText id="delete-customer-description">
      This will permanently delete this customer and all their tickets and comments. Leads will be retained and unlinked. Their login account will not be deleted. This cannot be undone.
    </DialogContentText>{error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}</DialogContent>
    <DialogActions><Button autoFocus disabled={pending} onClick={close}>Cancel</Button><Button color="error" variant="contained" disabled={pending} onClick={confirm}>{pending ? 'Deleting…' : 'Confirm delete'}</Button></DialogActions>
  </Dialog>;
}
