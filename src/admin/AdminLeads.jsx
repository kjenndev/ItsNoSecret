import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { Delete, Edit, PersonAddAlt } from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import apiFetch from './api';
import { PageHeading, PolishedCard } from '../components/Shared.jsx';

const initialForm = {
  name: '',
  email: '',
  phone: '',
  preferredContact: 'EITHER',
  serviceNeed: '',
  message: '',
  source: 'ADMIN_CREATED',
  status: 'NEW',
  notes: '',
};

const statusOptions = [
  ['NEW', 'New'],
  ['CONTACTED', 'Contacted'],
  ['QUALIFIED', 'Qualified'],
  ['CONVERTED', 'Converted'],
  ['CLOSED', 'Closed'],
];

const sourceOptions = [
  ['CONSULTATION_MODAL', 'Homepage'],
  ['ADMIN_CREATED', 'Admin'],
  ['PHONE', 'Phone'],
  ['EMAIL', 'Email'],
  ['REFERRAL', 'Referral'],
  ['OTHER', 'Other'],
];

const preferredContactOptions = [
  ['EITHER', 'Either is fine'],
  ['EMAIL', 'Email'],
  ['PHONE', 'Phone call'],
  ['TEXT', 'Text message'],
];

const serviceNeeds = [
  'Computer Repair',
  'Malware Removal',
  'Data Recovery Guidance',
  'Custom PC Builds',
  'Performance Tune-Ups',
  'Small Business Support',
  'Technology Training',
  'Other',
];

const statusMeta = {
  NEW: { label: 'New', color: 'secondary' },
  CONTACTED: { label: 'Contacted', color: 'info' },
  QUALIFIED: { label: 'Qualified', color: 'warning' },
  CONVERTED: { label: 'Converted', color: 'success' },
  CLOSED: { label: 'Closed', color: 'default' },
};

const sourceLabels = Object.fromEntries(sourceOptions);
const preferredLabels = {
  EMAIL: 'Email preferred',
  PHONE: 'Phone preferred',
  TEXT: 'Text preferred',
  EITHER: 'Either preferred',
};

function trimForm(form) {
  return {
    name: form.name.trim(),
    email: form.email.trim().toLowerCase(),
    phone: form.phone.trim(),
    preferredContact: form.preferredContact,
    serviceNeed: form.serviceNeed.trim(),
    message: form.message.trim(),
    source: form.source,
    status: form.status,
    notes: form.notes.trim(),
  };
}

function truncate(value, length = 110) {
  if (!value) return '';
  return value.length > length ? `${value.slice(0, length - 1)}…` : value;
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

export default function AdminLeads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [formData, setFormData] = useState(initialForm);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [snackbar, setSnackbar] = useState(null);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    if (statusFilter !== 'ALL') params.set('status', statusFilter);
    if (search.trim()) params.set('q', search.trim());
    try {
      const response = await apiFetch(`/api/crm/leads${params.toString() ? `?${params.toString()}` : ''}`);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to fetch leads');
      }
      setLeads(await response.json());
    } catch (fetchError) {
      setError(fetchError.message || 'Connection error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    void Promise.resolve().then(() => fetchLeads());
  }, [fetchLeads]);

  const handleOpen = (lead = null) => {
    setFormError('');
    if (lead) {
      setEditingLead(lead);
      setFormData({
        name: lead.name || '',
        email: lead.email || '',
        phone: lead.phone || '',
        preferredContact: lead.preferredContact || 'EITHER',
        serviceNeed: lead.serviceNeed || '',
        message: lead.message || '',
        source: lead.source || 'ADMIN_CREATED',
        status: lead.status || 'NEW',
        notes: lead.notes || '',
      });
    } else {
      setEditingLead(null);
      setFormData(initialForm);
    }
    setOpen(true);
  };

  const handleClose = () => {
    if (submitting) return;
    setOpen(false);
    setEditingLead(null);
    setFormError('');
  };

  const updateField = (field) => (event) => setFormData((current) => ({ ...current, [field]: event.target.value }));

  const handleSubmit = async () => {
    const payload = trimForm(formData);
    if (!payload.name || !payload.message || (!payload.email && !payload.phone)) {
      setFormError('Name, message, and at least one contact method are required.');
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      const response = await apiFetch(editingLead ? `/api/crm/leads/${editingLead.id}` : '/api/crm/leads', {
        method: editingLead ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Operation failed');
      handleClose();
      setSnackbar({ severity: 'success', message: editingLead ? 'Lead updated.' : 'Lead created.' });
      await fetchLeads();
    } catch (submitError) {
      setFormError(submitError.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmAction?.lead) return;
    setSubmitting(true);
    try {
      const response = await apiFetch(`/api/crm/leads/${confirmAction.lead.id}`, { method: 'DELETE' });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete lead');
      }
      setConfirmAction(null);
      setSnackbar({ severity: 'success', message: 'Lead deleted.' });
      await fetchLeads();
    } catch (deleteError) {
      setSnackbar({ severity: 'error', message: deleteError.message || 'Failed to delete lead' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleConvert = async () => {
    if (!confirmAction?.lead) return;
    setSubmitting(true);
    try {
      const response = await apiFetch(`/api/crm/leads/${confirmAction.lead.id}/convert`, { method: 'POST' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to convert lead');
      setConfirmAction(null);
      setSnackbar({
        severity: 'success',
        message: data.alreadyConverted
          ? 'Lead was already converted.'
          : `Lead converted to customer${data.customer?.name ? `: ${data.customer.name}` : ''}.`,
      });
      await fetchLeads();
    } catch (convertError) {
      setSnackbar({ severity: 'error', message: convertError.message || 'Failed to convert lead' });
    } finally {
      setSubmitting(false);
    }
  };

  const emptyMessage = useMemo(() => {
    if (statusFilter !== 'ALL' || search.trim()) return 'No leads match this filter.';
    return 'No leads yet. Consultation requests from the homepage will appear here. You can also add a lead manually.';
  }, [statusFilter, search]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
        <PageHeading eyebrow="CRM" title="Leads" body="Review consultation requests and convert qualified leads into customers." />
        <Button variant="contained" color="secondary" onClick={() => handleOpen()}>Add Lead</Button>
      </Box>

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

      <PolishedCard sx={{ p: 0 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ p: 2.5 }}>
          <TextField
            label="Search leads"
            placeholder="Name, email, phone, or message"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            fullWidth
          />
          <FormControl sx={{ minWidth: { xs: '100%', md: 200 } }}>
            <InputLabel id="lead-status-filter-label">Status</InputLabel>
            <Select labelId="lead-status-filter-label" label="Status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <MenuItem value="ALL">All statuses</MenuItem>
              {statusOptions.map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
            </Select>
          </FormControl>
        </Stack>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Need / Request</TableCell>
                  <TableCell>Source</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Converted Customer</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {leads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <Stack spacing={1} sx={{ alignItems: 'center', py: 5 }}>
                        <Typography variant="h6">{statusFilter === 'ALL' && !search.trim() ? 'No leads yet' : 'No matching leads'}</Typography>
                        <Typography color="text.secondary" align="center">{emptyMessage}</Typography>
                        <Button variant="contained" color="secondary" onClick={() => handleOpen()}>Add Lead</Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ) : leads.map((lead) => {
                  const meta = statusMeta[lead.status] || statusMeta.NEW;
                  return (
                    <TableRow key={lead.id} hover>
                      <TableCell><Typography variant="subtitle2">{lead.name}</Typography></TableCell>
                      <TableCell>
                        <Stack spacing={0.5}>
                          <Typography variant="body2">{lead.email || 'No email'}</Typography>
                          <Typography variant="body2" color="text.secondary">{lead.phone || 'No phone'}</Typography>
                          <Chip size="small" label={preferredLabels[lead.preferredContact] || 'Either preferred'} sx={{ alignSelf: 'flex-start' }} />
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ maxWidth: 280 }}>
                        <Typography variant="subtitle2">{lead.serviceNeed || 'General consultation'}</Typography>
                        <Typography variant="body2" color="text.secondary" title={lead.message}>{truncate(lead.message)}</Typography>
                      </TableCell>
                      <TableCell><Chip size="small" label={sourceLabels[lead.source] || lead.source || 'Other'} /></TableCell>
                      <TableCell><Chip size="small" color={meta.color} label={meta.label} /></TableCell>
                      <TableCell>{formatDate(lead.createdAt)}</TableCell>
                      <TableCell>
                        {lead.convertedCustomer ? (
                          <Button component={RouterLink} to={`/admin/customers/${lead.convertedCustomer.id}`} size="small" color="secondary">
                            Customer: {lead.convertedCustomer.name}
                          </Button>
                        ) : '—'}
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Convert to customer">
                          <span>
                            <IconButton aria-label="Convert to customer" size="small" color="secondary" disabled={lead.status === 'CONVERTED'} onClick={() => setConfirmAction({ type: 'convert', lead })}>
                              <PersonAddAlt />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Edit lead">
                          <IconButton aria-label="Edit lead" size="small" color="primary" onClick={() => handleOpen(lead)}><Edit /></IconButton>
                        </Tooltip>
                        <Tooltip title="Delete lead">
                          <span>
                            <IconButton aria-label="Delete lead" size="small" color="error" disabled={lead.status === 'CONVERTED'} onClick={() => setConfirmAction({ type: 'delete', lead })}>
                              <Delete />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </PolishedCard>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editingLead ? 'Edit Lead' : 'Add Lead'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {formError ? <Alert severity="error">{formError}</Alert> : null}
            <TextField autoFocus label="Full name" value={formData.name} onChange={updateField('name')} required fullWidth />
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}><TextField label="Email" value={formData.email} onChange={updateField('email')} fullWidth /></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><TextField label="Phone" value={formData.phone} onChange={updateField('phone')} fullWidth /></Grid>
            </Grid>
            <FormControl fullWidth>
              <InputLabel id="lead-preferred-contact-label">Preferred contact</InputLabel>
              <Select labelId="lead-preferred-contact-label" label="Preferred contact" value={formData.preferredContact} onChange={updateField('preferredContact')}>
                {preferredContactOptions.map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel id="lead-service-need-label">What do you need help with?</InputLabel>
              <Select labelId="lead-service-need-label" label="What do you need help with?" value={formData.serviceNeed} onChange={updateField('serviceNeed')}>
                <MenuItem value=""><em>General consultation</em></MenuItem>
                {serviceNeeds.map((need) => <MenuItem key={need} value={need}>{need}</MenuItem>)}
              </Select>
            </FormControl>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel id="lead-source-label">Source</InputLabel>
                  <Select labelId="lead-source-label" label="Source" value={formData.source} onChange={updateField('source')}>
                    {sourceOptions.map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel id="lead-status-label">Status</InputLabel>
                  <Select labelId="lead-status-label" label="Status" value={formData.status} onChange={updateField('status')} disabled={editingLead?.status === 'CONVERTED'}>
                    {statusOptions.map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <TextField label="Message / request details" value={formData.message} onChange={updateField('message')} required multiline rows={4} fullWidth />
            <TextField label="Internal notes" value={formData.notes} onChange={updateField('notes')} multiline rows={3} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={submitting}>{editingLead ? 'Save Changes' : 'Add Lead'}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(confirmAction)} onClose={() => !submitting && setConfirmAction(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{confirmAction?.type === 'delete' ? 'Delete lead?' : 'Convert lead?'}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirmAction?.type === 'delete'
              ? `Delete ${confirmAction.lead?.name}? This cannot be undone.`
              : `Convert ${confirmAction?.lead?.name} to a customer? Existing customers are matched by email first.`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmAction(null)} disabled={submitting}>Cancel</Button>
          {confirmAction?.type === 'delete' ? (
            <Button onClick={handleDelete} color="error" variant="contained" disabled={submitting}>Confirm Delete</Button>
          ) : (
            <Button onClick={handleConvert} color="secondary" variant="contained" disabled={submitting}>Confirm Convert</Button>
          )}
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(snackbar)} autoHideDuration={5000} onClose={() => setSnackbar(null)}>
        {snackbar ? <Alert severity={snackbar.severity} onClose={() => setSnackbar(null)}>{snackbar.message}</Alert> : undefined}
      </Snackbar>
    </Box>
  );
}
