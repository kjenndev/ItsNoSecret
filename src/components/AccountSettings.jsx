import React, { useState } from 'react';
import { Alert, Box, Button, TextField, Typography } from '@mui/material';
import apiFetch from '../admin/api';
import { PageHeading, PolishedCard } from './Shared.jsx';

const getStoredUser = () => JSON.parse(localStorage.getItem('user') || '{}');

const AccountSettings = () => {
  const storedUser = getStoredUser();
  const [formData, setFormData] = useState({
    name: storedUser.name || '',
    email: storedUser.email || '',
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const updateField = (field) => (event) => {
    setFormData((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setSuccess('');
    setError('');

    try {
      const response = await apiFetch('/api/users/me', {
        method: 'PUT',
        body: JSON.stringify(formData),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to update credentials');
        return;
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setFormData({
        name: data.user.name || '',
        email: data.user.email || '',
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: '',
      });
      setSuccess('Credentials updated');
    } catch {
      setError('Connection error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <PageHeading
        eyebrow="Security"
        title="Account Settings"
        body="Update your login email, display name, or password."
      />

      <PolishedCard sx={{ p: 4, maxWidth: 640 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Enter your current password to confirm account changes. Leave the new password fields blank to keep your current password.
        </Typography>
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'grid', gap: 2 }}>
          <TextField
            label="Full Name"
            value={formData.name}
            onChange={updateField('name')}
            fullWidth
          />
          <TextField
            label="Email Address"
            type="email"
            value={formData.email}
            onChange={updateField('email')}
            fullWidth
            required
          />
          <TextField
            label="Current Password"
            type="password"
            value={formData.currentPassword}
            onChange={updateField('currentPassword')}
            fullWidth
            required
          />
          <TextField
            label="New Password"
            type="password"
            value={formData.newPassword}
            onChange={updateField('newPassword')}
            fullWidth
            helperText="Optional. Must be at least 8 characters."
          />
          <TextField
            label="Confirm New Password"
            type="password"
            value={formData.confirmNewPassword}
            onChange={updateField('confirmNewPassword')}
            fullWidth
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? 'Saving…' : 'Save Credentials'}
            </Button>
          </Box>
        </Box>
      </PolishedCard>
    </Box>
  );
};

export default AccountSettings;
