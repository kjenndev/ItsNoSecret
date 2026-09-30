type AccountCredentialsPayload = {
  name?: unknown;
  email?: unknown;
  currentPassword?: unknown;
  newPassword?: unknown;
  confirmNewPassword?: unknown;
};

type AccountCredentialsData = {
  name: string | null;
  email: string;
  currentPassword: string;
  newPassword?: string;
};

type ValidationResult =
  | { success: true; data: AccountCredentialsData }
  | { success: false; error: string };

const normalizeOptionalString = (value: unknown) => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

export const validateAccountCredentialsPayload = (payload: AccountCredentialsPayload): ValidationResult => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return {success: false, error: 'JSON object required'};
  for (const [field, max] of [['name', 200], ['email', 254], ['currentPassword', 72], ['newPassword', 72], ['confirmNewPassword', 72]] as const) {
    const value = payload[field];
    if (value != null && (typeof value !== 'string' || (field.includes('Password') ? Buffer.byteLength(value, 'utf8') : value.length) > max)) return {success: false, error: `${field} is invalid or too long`};
  }
  const name = normalizeOptionalString(payload.name);
  const email = normalizeOptionalString(payload.email).toLowerCase();
  const currentPassword = typeof payload.currentPassword === 'string' ? payload.currentPassword : '';
  const newPassword = typeof payload.newPassword === 'string' ? payload.newPassword : '';
  const confirmNewPassword = typeof payload.confirmNewPassword === 'string' ? payload.confirmNewPassword : '';

  if (!currentPassword) {
    return { success: false, error: 'Current password is required to update account credentials' };
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: 'A valid email address is required' };
  }

  if (newPassword || confirmNewPassword) {
    if (newPassword.length < 8) {
      return { success: false, error: 'New password must be at least 8 characters' };
    }

    if (newPassword !== confirmNewPassword) {
      return { success: false, error: 'New passwords do not match' };
    }
  }

  return {
    success: true,
    data: {
      name: name || null,
      email,
      currentPassword,
      ...(newPassword ? { newPassword } : {}),
    },
  };
};
