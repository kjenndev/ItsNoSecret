import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, Chip, CircularProgress, FormControlLabel, Link, Switch, TextField, Typography } from '@mui/material';
import apiFetch from './api';
import { PageHeading, PolishedCard } from '../components/Shared.jsx';

const editableSettings = data => ({ enabled: data.enabled, fromEmail: data.fromEmail || '', fromName: data.fromName || '', replyTo: data.replyTo || '' });

export default function AdminSettings() {
  const [saved, setSaved] = useState(null);
  const [form, setForm] = useState(null);
  const [success, setSuccess] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [validation, setValidation] = useState({});
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    apiFetch('/api/settings/email').then(response => {
      if (!response.ok) throw new Error('Load failed');
      return response.json();
    }).then(data => {
      if (active) { setSaved(data); setForm(editableSettings(data)); }
    }).catch(() => { if (active) setLoadError(true); });
    return () => { active = false; };
  }, [loadAttempt]);
  const dirty = form && (apiKey.trim() !== '' || JSON.stringify(form) !== JSON.stringify(editableSettings(saved)));
  useEffect(() => {
    if (!dirty) return;
    const warnBeforeUnload = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [dirty]);
  const discard = () => {
    setForm(editableSettings(saved)); setApiKey(''); setValidation({}); setError(''); setSuccess(false);
  };
  const update = field => event => { setForm(current => ({ ...current, [field]: event.target.value })); setSuccess(false); };
  const save = async event => {
    event.preventDefault();
    if (saving || !dirty) return;
    const errors = {};
    const validEmail = value => /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value) && !/[\r\n]/.test(value);
    if ((form.enabled || form.fromEmail) && !validEmail(form.fromEmail)) errors.fromEmail = 'Enter a valid sender email.';
    if (form.replyTo && !validEmail(form.replyTo)) errors.replyTo = 'Enter a valid reply-to email or leave it blank.';
    if (form.enabled && !saved.apiKeyConfigured && !apiKey.trim()) errors.apiKey = 'Add a Resend API key before enabling notifications.';
    setValidation(errors);
    if (Object.keys(errors).length) return;
    setSaving(true); setError(''); setSuccess(false);
    try {
      const response = await apiFetch('/api/settings/email', { method: 'PUT', body: JSON.stringify({ ...form, ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}) }) });
      if (!response.ok) throw new Error('Save failed');
      const data = await response.json();
      setSaved(data); setForm(editableSettings(data)); setApiKey(''); setSuccess(true);
    } catch {
      setError('Could not save email settings. Please try again.');
    } finally { setSaving(false); }
  };
  return <Box>
    <PageHeading eyebrow="Configuration" title="App settings" body="Manage email notifications for your team." />
    {loadError ? <Alert severity="error" action={<Button color="inherit" onClick={() => { setLoadError(false); setLoadAttempt(attempt => attempt + 1); }}>Retry</Button>}>Could not load email settings. Please try again.</Alert> : !form ? <CircularProgress aria-label="Loading email settings" /> : <PolishedCard sx={{ p: { xs: 2, sm: 4 }, maxWidth: 720 }}>
      <Typography component="h2" variant="h6" sx={{ mb: 1 }}>Email · Resend</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>New leads from public requests and staff entries notify all active ADMINs.</Typography>
      <Alert severity="info" sx={{ mb: 3 }}>Resend requires a verified sender domain. <Link href="https://resend.com/docs/dashboard/domains/introduction" target="_blank" rel="noopener noreferrer">Domain verification guide</Link></Alert>
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3 }}>Email settings saved.</Alert>}
      <Box component="form" noValidate onSubmit={save} sx={{ display: 'grid', gap: 3, minWidth: 0 }}>
        <FormControlLabel control={<Switch disabled={saving} checked={form.enabled} onChange={event => { setForm(current => ({ ...current, enabled: event.target.checked })); setSuccess(false); }} />} label="Enable new-lead notifications" />
        <TextField disabled={saving} label="Sender email" type="email" error={!!validation.fromEmail} helperText={validation.fromEmail} value={form.fromEmail} onChange={update('fromEmail')} fullWidth />
        <TextField disabled={saving} label="Sender name (optional)" value={form.fromName} onChange={update('fromName')} fullWidth />
        <TextField disabled={saving} label="Reply-to email (optional)" type="email" error={!!validation.replyTo} helperText={validation.replyTo} value={form.replyTo} onChange={update('replyTo')} fullWidth />
        <TextField disabled={saving} label="Resend API key" error={!!validation.apiKey} helperText={validation.apiKey || 'Leave blank to keep the saved key. The saved key is never displayed.'} type="password" autoComplete="new-password" value={apiKey} onChange={event => { setApiKey(event.target.value); setSuccess(false); }} fullWidth />
        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Chip size="small" label={saved.apiKeyConfigured ? 'Configured' : 'Not configured'} color={saved.apiKeyConfigured ? 'success' : 'default'} variant="outlined" />
          <Link href="https://resend.com/docs/dashboard/api-keys/introduction" target="_blank" rel="noopener noreferrer" variant="body2">API key documentation</Link>
        </Box>
        {dirty && <Typography color="text.secondary">Unsaved changes</Typography>}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 1 }}>
          <Button type="button" disabled={!dirty || saving} onClick={discard}>Discard changes</Button>
          <Button type="submit" variant="contained" disabled={!dirty || saving}>{saving ? 'Saving…' : 'Save settings'}</Button>
        </Box>
      </Box>
    </PolishedCard>}
  </Box>;
}
