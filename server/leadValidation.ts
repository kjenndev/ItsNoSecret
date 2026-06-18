export const LEAD_STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'CLOSED'] as const;
export const LEAD_SOURCES = ['CONSULTATION_MODAL', 'ADMIN_CREATED', 'PHONE', 'EMAIL', 'REFERRAL', 'OTHER'] as const;
export const PREFERRED_CONTACTS = ['EMAIL', 'PHONE', 'TEXT', 'EITHER'] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];
export type LeadSource = (typeof LEAD_SOURCES)[number];
export type PreferredContact = (typeof PREFERRED_CONTACTS)[number];

export type LeadPayload = {
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  preferredContact?: unknown;
  serviceNeed?: unknown;
  message?: unknown;
  source?: unknown;
  status?: unknown;
  notes?: unknown;
};

export type NormalizedLeadPayload = {
  name: string;
  email: string | null;
  phone: string | null;
  preferredContact: PreferredContact;
  serviceNeed: string | null;
  message: string;
  source: LeadSource;
  status: LeadStatus;
  notes: string | null;
};

export type LeadValidationOptions = {
  sourceDefault: LeadSource;
  statusDefault?: LeadStatus;
  requireContact?: boolean;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cleanString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function cleanEnum<T extends readonly string[]>(value: unknown, allowed: T, fallback: T[number]): T[number] | null {
  if (value == null || value === '') return fallback;
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toUpperCase();
  return allowed.includes(normalized) ? normalized : null;
}

export function normalizeLeadPayload(payload: LeadPayload, options?: Partial<LeadValidationOptions>): NormalizedLeadPayload {
  const email = cleanString(payload.email)?.toLowerCase() ?? null;
  return {
    name: cleanString(payload.name) ?? '',
    email,
    phone: cleanString(payload.phone),
    preferredContact: cleanEnum(payload.preferredContact, PREFERRED_CONTACTS, 'EITHER') ?? 'EITHER',
    serviceNeed: cleanString(payload.serviceNeed),
    message: cleanString(payload.message) ?? '',
    source: cleanEnum(payload.source, LEAD_SOURCES, options?.sourceDefault ?? 'CONSULTATION_MODAL') ?? (options?.sourceDefault ?? 'CONSULTATION_MODAL'),
    status: cleanEnum(payload.status, LEAD_STATUSES, options?.statusDefault ?? 'NEW') ?? (options?.statusDefault ?? 'NEW'),
    notes: cleanString(payload.notes),
  };
}

export function validateLeadPayload(payload: LeadPayload, options: LeadValidationOptions):
  | { valid: true; data: NormalizedLeadPayload }
  | { valid: false; error: string } {
  const data = normalizeLeadPayload(payload, options);

  if (!data.name) return { valid: false, error: 'Full name is required.' };
  if (options.requireContact !== false && !data.email && !data.phone) {
    return { valid: false, error: 'Enter an email or phone number so we can follow up.' };
  }
  if (data.email && !emailPattern.test(data.email)) {
    return { valid: false, error: 'Enter a valid email address.' };
  }
  if (!data.message) return { valid: false, error: 'Message / request details are required.' };

  const preferredContact = cleanEnum(payload.preferredContact, PREFERRED_CONTACTS, 'EITHER');
  if (preferredContact === null) return { valid: false, error: 'Preferred contact is invalid.' };

  const source = cleanEnum(payload.source, LEAD_SOURCES, options.sourceDefault);
  if (source === null) return { valid: false, error: 'Lead source is invalid.' };

  const status = cleanEnum(payload.status, LEAD_STATUSES, options.statusDefault ?? 'NEW');
  if (status === null) return { valid: false, error: 'Lead status is invalid.' };

  return { valid: true, data };
}
