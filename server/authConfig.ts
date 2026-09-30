// Runtime-only config: Prisma generation must not import this module.
function requireJwtSecret(value: string | undefined): string {
  if (!value || Buffer.byteLength(value, 'utf8') < 32 || value.trim() !== value ||
      new Set(value).size < 8 ||
      /your[-_ ]|super[-_ ]secret|replace[-_ ]?me|change[-_ ]?me|example|placeholder/i.test(value)) {
    throw new Error('JWT_SECRET must be a randomly generated secret of at least 32 bytes, not a default or example value');
  }
  return value;
}

// One immutable validated value shared by token signing and verification.
export const JWT_SECRET = requireJwtSecret(process.env.JWT_SECRET);
