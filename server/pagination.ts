import type { RequestHandler, Response } from 'express';
export type Page = {take: number; skip: number; q: string};
function integer(value: unknown, fallback: number, min: number, max: number) {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^(0|[1-9]\d*)$/.test(value)) throw new Error('Pagination must use nonnegative integers');
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < min || number > max) throw new Error('Pagination is out of range');
  return number;
}
export const pagination: RequestHandler = (req, res, next) => {
  if (req.method !== 'GET') {next(); return;}
  try {
    const take = integer(req.query.limit, 50, 1, 100);
    const skip = integer(req.query.offset, 0, 0, 2147483647);
    if (req.query.q !== undefined && (typeof req.query.q !== 'string' || req.query.q.length > 200)) throw new Error('Search must be at most 200 characters');
    res.locals.page = {take, skip, q: (req.query.q as string | undefined)?.trim() || ''};
    next();
  } catch (error) {res.status(400).json({error: (error as Error).message});}
};
export function pageHeaders(res: Response, total: number) {
  const {take, skip} = res.locals.page as Page;
  res.set('X-Total-Count', String(total));
  res.set('X-Next-Offset', skip + take < total ? String(skip + take) : '');
}
export function search(q: string, fields: string[]): any {
  return q ? {OR: fields.map(field => ({[field]: {contains: q, mode: 'insensitive'}}))} : {};
}
export async function list(res: Response, model: any, args: any) {
  const {take, skip} = res.locals.page as Page;
  const [rows, total] = await Promise.all([model.findMany({...args, take, skip}), model.count({where: args.where})]);
  pageHeaders(res, total);
  res.json(rows);
}
