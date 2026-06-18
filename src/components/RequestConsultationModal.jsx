import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormHelperText,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

const initialForm = {
  name: '',
  email: '',
  phone: '',
  preferredContact: 'EITHER',
  serviceNeed: '',
  message: '',
};

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

const preferredContactOptions = [
  ['EITHER', 'Either is fine'],
  ['EMAIL', 'Email'],
  ['PHONE', 'Phone call'],
  ['TEXT', 'Text message'],
];

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function trimForm(form) {
  return {
    name: form.name.trim(),
    email: form.email.trim().toLowerCase(),
    phone: form.phone.trim(),
    preferredContact: form.preferredContact,
    serviceNeed: form.serviceNeed.trim(),
    message: form.message.trim(),
    source: 'CONSULTATION_MODAL',
  };
}

function validate(form) {
  const values = trimForm(form);
  const errors = {};
  if (!values.name) errors.name = 'Please enter your name.';
  if (!values.email && !values.phone) errors.contact = 'Enter an email or phone number so we can follow up.';
  if (values.email && !emailPattern.test(values.email)) errors.email = 'Enter a valid email address.';
  if (!values.message) errors.message = 'Please describe what you need help with.';
  return errors;
}

export default function RequestConsultationModal({ open, onClose }) {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const isSuccess = feedback?.severity === 'success';
  const describedBy = useMemo(() => 'request-consultation-intro', []);

  const updateField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setErrors((current) => ({ ...current, [field]: undefined, contact: field === 'email' || field === 'phone' ? undefined : current.contact }));
  };

  const handleClose = () => {
    if (submitting) return;
    setErrors({});
    setFeedback(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (isSuccess) {
      handleClose();
      return;
    }

    const nextErrors = validate(form);
    setErrors(nextErrors);
    setFeedback(null);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      const payload = trimForm(form);
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'We could not send your request. Please try again or call (210) 658-6964.');
      }
      setForm(initialForm);
      setErrors({});
      setFeedback({ severity: 'success', message: 'Thanks — your consultation request was sent. We will follow up soon.' });
    } catch (error) {
      setFeedback({ severity: 'error', message: error.message || 'We could not send your request. Please try again or call (210) 658-6964.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      aria-describedby={describedBy}
      slotProps={{
        paper: {
          sx: {
            borderTop: '3px solid rgba(46,230,166,.78)',
            background:
              'radial-gradient(circle at 85% 0%, rgba(46,230,166,.13), transparent 18rem), linear-gradient(145deg, rgba(16,36,59,.98), rgba(7,17,31,.99))',
          },
        },
      }}
    >
      <DialogTitle>Request a Free Consultation</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <Typography id={describedBy} color="text.secondary" sx={{ lineHeight: 1.65 }}>
            Tell us what is going on and the best way to reach you. We will review your request and follow up with practical next steps.
          </Typography>

          {feedback ? <Alert severity={feedback.severity}>{feedback.message}</Alert> : null}

          {!isSuccess ? (
            <>
              <TextField
                autoFocus
                label="Full name"
                value={form.name}
                onChange={updateField('name')}
                error={Boolean(errors.name)}
                helperText={errors.name || ' '}
                required
                fullWidth
                disabled={submitting}
              />
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Email address"
                    value={form.email}
                    onChange={updateField('email')}
                    error={Boolean(errors.email || errors.contact)}
                    helperText={errors.email || errors.contact || ' '}
                    fullWidth
                    disabled={submitting}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Phone number"
                    value={form.phone}
                    onChange={updateField('phone')}
                    error={Boolean(errors.contact)}
                    helperText={errors.contact || ' '}
                    fullWidth
                    disabled={submitting}
                  />
                </Grid>
              </Grid>
              <FormControl fullWidth disabled={submitting}>
                <InputLabel id="preferred-contact-label">Preferred contact</InputLabel>
                <Select
                  labelId="preferred-contact-label"
                  label="Preferred contact"
                  value={form.preferredContact}
                  onChange={updateField('preferredContact')}
                >
                  {preferredContactOptions.map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl fullWidth disabled={submitting}>
                <InputLabel id="service-need-label">What do you need help with?</InputLabel>
                <Select
                  labelId="service-need-label"
                  label="What do you need help with?"
                  value={form.serviceNeed}
                  onChange={updateField('serviceNeed')}
                >
                  <MenuItem value=""><em>General consultation</em></MenuItem>
                  {serviceNeeds.map((need) => <MenuItem key={need} value={need}>{need}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField
                label="Message / request details"
                placeholder="Briefly describe the computer issue, symptoms, or question you have."
                value={form.message}
                onChange={updateField('message')}
                error={Boolean(errors.message)}
                helperText={errors.message || ' '}
                required
                multiline
                rows={4}
                fullWidth
                disabled={submitting}
              />
              <FormHelperText>No pressure and no scare tactics — just a clear next step for your computer issue.</FormHelperText>
            </>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, flexDirection: { xs: 'column-reverse', sm: 'row' }, gap: 1 }}>
        <Button onClick={handleClose} disabled={submitting} fullWidth={false}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" color="secondary" disabled={submitting} startIcon={submitting ? <CircularProgress size={16} /> : null}>
          {submitting ? 'Sending...' : isSuccess ? 'Done' : 'Send Consultation Request'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
