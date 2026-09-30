import type { RequestHandler } from 'express';
export const roles = ['ADMIN', 'TECHNICIAN', 'CLIENT'];
export const ticketTypes = ['PC_BUILD', 'PC_REPAIR', 'SYSTEM_DIAGNOSTIC', 'MALWARE_REMOVAL', 'DATA_RECOVERY', 'TRAINING', 'OTHER'];
export function object(value: any): Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('JSON object required');
  return value;
}
export function text(value: any, field: string, max = 200, required = false): string | null {
  if (value == null || value === '') { if (required) throw new Error(`${field} is required`); return null; }
  if (typeof value !== 'string' || value.length > max) throw new Error(`${field} is invalid or too long`);
  const result = value.trim();
  if (!result && required) throw new Error(`${field} is required`);
  return result || null;
}
export function email(value: any, required = false) {
  const result = text(value, 'Email', 254, required)?.toLowerCase() ?? null;
  if (result && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) throw new Error('Email is invalid');
  return result;
}
export function password(value: any) {
  if (typeof value !== 'string' || value.length < 8 || Buffer.byteLength(value, 'utf8') > 72) throw new Error('Password must be 8–72 bytes');
  return value;
}
export function enumValue(value: any, allowed: readonly string[], field: string) {
  if (typeof value !== 'string' || !allowed.includes(value)) throw new Error(`${field} is invalid`);
  return value;
}
export function validate(parser: (body: any) => any): RequestHandler {
  return (req, res, next) => {
    try { req.body = parser(object(req.body)); next(); }
    catch (error) { res.status(400).json({error: (error as Error).message}); }
  };
}
export function userInput(body: any, create = false) {
  const data: any = {};
  if (create || 'email' in body) data.email = email(body.email, true);
  if ('name' in body) data.name = text(body.name, 'Name');
  if (create || ('password' in body && body.password !== '')) data.password = password(body.password);
  if ('roles' in body) {
    if (!Array.isArray(body.roles) || !body.roles.length || body.roles.length > 3) throw new Error('At least one valid role is required');
    data.roles = [...new Set(body.roles.map((r: any) => enumValue(r, roles, 'Role')))];
  } else if (create) data.roles = ['CLIENT'];
  if ('customerId' in body) data.customerId = text(body.customerId, 'Customer ID', 100);
  if ('isActive' in body) {
    if (typeof body.isActive !== 'boolean') throw new Error('isActive must be boolean');
    data.isActive = body.isActive;
  }
  return data;
}

export function customerInput(body: any, create = false) {
  const data: any = {};
  if (create || 'name' in body) data.name = text(body.name, 'Name', 200, true);
  if (create || 'email' in body) data.email = email(body.email);
  if ('phone' in body) data.phone = text(body.phone, 'Phone', 50);
  if ('address' in body) data.address = text(body.address, 'Address', 1000);
  return data;
}
export function ticketInput(body: any, create = false, portal = false) {
  const data: any = {};
  for (const [key, max] of [['title', 200], ['description', 10000]] as const) {
    if (create || key in body) data[key] = text(body[key], key, max, true);
  }
  if ('type' in body) data.type = enumValue(body.type, ticketTypes, 'Type');
  if (!portal) {
    if ('status' in body) data.status = enumValue(body.status, ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'], 'Status');
    if ('priority' in body) data.priority = enumValue(body.priority, ['LOW', 'MEDIUM', 'HIGH', 'URGENT'], 'Priority');
    if (create) data.customerId = text(body.customerId, 'Customer ID', 100, true);
    if ('assignedToId' in body) data.assignedToId = text(body.assignedToId, 'Assignee ID', 100);
  }
  return data;
}
export function commentInput(body: any, portal = false) {
  if ('isInternal' in body && typeof body.isInternal !== 'boolean') throw new Error('isInternal must be boolean');
  if (portal && body.isInternal === true) throw new Error('Portal comments must be public');
  return {text: text(body.text, 'Comment', 10000, true), isInternal: portal ? false : body.isInternal ?? true};
}
