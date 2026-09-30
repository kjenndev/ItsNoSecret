import express from 'express';
import { prisma } from '../db.ts';
import { authenticateToken, requireStaff } from '../middleware/auth.ts';
import { validateLeadPayload, LEAD_SOURCES, LEAD_STATUSES } from '../leadValidation.ts';

import { validate, customerInput, ticketInput, commentInput } from '../validation.ts';
import { pagination, list, search, pageHeaders } from '../pagination.ts';
const router = express.Router();
const validateAssignment: express.RequestHandler = async (req, res, next) => {
  if (!req.body.assignedToId) { next(); return; }
  try {
    const user = await prisma.user.findUnique({where: {id: req.body.assignedToId}});
    if (!user?.isActive || !user.roles.some(role => ['ADMIN', 'TECHNICIAN'].includes(role))) {
      res.status(400).json({error: 'Assignee must be an active staff member'}); return;
    }
    next();
  } catch { res.status(503).json({error: 'Could not validate assignment'}); }
};

// Apply auth middleware to all routes in this router
router.use(authenticateToken, requireStaff, pagination);

// --- Users (for assignment) ---

router.get('/users', async (_req, res) => {
  try {
    await list(res, prisma.user, {
      where: {isActive: true, roles: {hasSome: ['ADMIN', 'TECHNICIAN']}, ...search(res.locals.page.q, ['name','email'])},
      select: {id: true, name: true, email: true, roles: true}, orderBy: [{name: 'asc'}, {id: 'asc'}]
    });
  } catch { res.status(500).json({error: 'Failed to fetch users'}); }
});
router.get('/summary', async (_req, res) => {
  try {
    const where = {status: {in: ['OPEN', 'IN_PROGRESS'] as ('OPEN' | 'IN_PROGRESS')[]}};
    const [leadCount, customerCount, openTicketCount, recentOpenTickets] = await Promise.all([
      prisma.lead.count(), prisma.customer.count(), prisma.ticket.count({where}),
      prisma.ticket.findMany({where, take: 5, orderBy: [{createdAt: 'desc'}, {id: 'desc'}], include: {customer: true, assignedTo: {select: {id: true, name: true}}}})
    ]);
    res.json({leadCount, customerCount, openTicketCount, recentOpenTickets});
  } catch {res.status(503).json({error: 'Summary temporarily unavailable'});}
});

// --- Leads ---

const leadInclude = {
  convertedCustomer: {
    select: { id: true, name: true, email: true, phone: true }
  }
};

router.get('/leads', async (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status.toUpperCase() : undefined;
  const source = typeof req.query.source === 'string' ? req.query.source.toUpperCase() : undefined;
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';

  if (status && status !== 'ALL' && !LEAD_STATUSES.includes(status as any)) {
    res.status(400).json({ error: 'Lead status is invalid.' });
    return;
  }
  if (source && source !== 'ALL' && !LEAD_SOURCES.includes(source as any)) {
    res.status(400).json({ error: 'Lead source is invalid.' });
    return;
  }

  try {
    await list(res, prisma.lead, {
      where: {
        ...(status && status !== 'ALL' ? { status: status as any } : {}),
        ...(source && source !== 'ALL' ? { source: source as any } : {}),
        ...(q ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
            { phone: { contains: q, mode: 'insensitive' } },
            { message: { contains: q, mode: 'insensitive' } },
            { serviceNeed: { contains: q, mode: 'insensitive' } },
          ]
        } : {})
      },
      include: leadInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }]
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

router.post('/leads', async (req, res) => {
  const result = validateLeadPayload(req.body, { sourceDefault: 'ADMIN_CREATED' });
  if (!result.valid) {
    res.status(400).json({ error: result.error });
    return;
  }

  try {
    if (result.data.status === 'CONVERTED') { res.status(400).json({error: 'Use the dedicated conversion endpoint'}); return; }
    const lead = await prisma.lead.create({
      data: { ...result.data, source: result.data.source || 'ADMIN_CREATED' },
      include: leadInclude
    });
    res.status(201).json(lead);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create lead' });
  }
});

router.get('/leads/:id', async (req, res) => {
  try {
    const lead = await prisma.lead.findUnique({ where: { id: req.params.id as string }, include: leadInclude });
    if (!lead) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }
    res.json(lead);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch lead' });
  }
});

router.put('/leads/:id', async (req, res) => {
  const result = validateLeadPayload(req.body, { sourceDefault: 'ADMIN_CREATED', requireContact: true });
  if (!result.valid) {
    res.status(400).json({ error: result.error });
    return;
  }

  try {
    const existing = await prisma.lead.findUnique({ where: { id: req.params.id as string } });
    if (!existing) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }
    if (existing.status !== 'CONVERTED' && result.data.status === 'CONVERTED') { res.status(409).json({error: 'Use the dedicated conversion endpoint'}); return; }
    if (existing.status === 'CONVERTED' && result.data.status !== 'CONVERTED') {
      res.status(409).json({ error: 'Converted leads cannot be changed away from converted status.' });
      return;
    }

    const lead = await prisma.lead.update({
      where: { id: req.params.id as string },
      data: {
        name: result.data.name,
        email: result.data.email,
        phone: result.data.phone,
        preferredContact: result.data.preferredContact,
        serviceNeed: result.data.serviceNeed,
        message: result.data.message,
        source: result.data.source,
        status: existing.status === 'CONVERTED' ? 'CONVERTED' : result.data.status,
        notes: result.data.notes,
      },
      include: leadInclude
    });
    res.json(lead);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update lead' });
  }
});

router.delete('/leads/:id', async (req, res) => {
  try {
    // PostgreSQL rechecks this predicate after waiting for a concurrent conversion.
    const deleted = await prisma.lead.deleteMany({where: {
      id: req.params.id as string, status: {not: 'CONVERTED'},
      convertedCustomerId: null, convertedAt: null
    }});
    if (deleted.count === 1) { res.status(204).send(); return; }
    const existing = await prisma.lead.findUnique({where: {id: req.params.id as string}, select: {id: true}});
    res.status(existing ? 409 : 404).json({error: existing
      ? 'Converted leads are linked to a customer and cannot be deleted.' : 'Lead not found'});
  } catch (error) {
    res.status(400).json({ error: 'Failed to delete lead' });
  }
});

router.post('/leads/:id/convert', async (req, res) => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // PostgreSQL row lock serializes same-lead conversion across all API processes.
      await tx.$queryRaw`SELECT id FROM \"Lead\" WHERE id = ${req.params.id} FOR UPDATE`;
      const lead = await tx.lead.findUnique({ where: { id: req.params.id as string }, include: leadInclude });
      if (!lead) return { statusCode: 404, body: { error: 'Lead not found' } };
      if (lead.convertedCustomerId && lead.convertedCustomer) {
        return { statusCode: 200, body: { lead, customer: lead.convertedCustomer, createdCustomer: false, alreadyConverted: true } };
      }

      let customer = null;
      let createdCustomer = false;
      if (lead.email) {
        const matches = await tx.customer.findMany({where: {email: {equals: lead.email, mode: 'insensitive'}}, take: 2});
        if (matches.length > 1) return {statusCode: 409, body: {error: 'Multiple customers match this email; resolve the duplicate before converting'}};
        customer = matches[0] ?? null;
      }
      if (!customer && lead.phone) {
        const phoneMatches = await tx.customer.findMany({ where: { phone: lead.phone }, take: 2 });
        if (phoneMatches.length === 1) customer = phoneMatches[0];
        if (phoneMatches.length > 1) {
          return { statusCode: 409, body: { error: 'Multiple customers match this phone number. Please update the lead with a unique email before converting.' } };
        }
      }
      if (!customer) {
        customer = await tx.customer.create({
          data: { name: lead.name, email: lead.email, phone: lead.phone, address: null }
        });
        createdCustomer = true;
      }

      const convertedLead = await tx.lead.update({
        where: { id: lead.id },
        data: { status: 'CONVERTED', convertedCustomerId: customer.id, convertedAt: new Date() },
        include: leadInclude
      });
      return { statusCode: createdCustomer ? 201 : 200, body: { lead: convertedLead, customer, createdCustomer, alreadyConverted: false } };
    });
    res.status(result.statusCode).json(result.body);
  } catch (error: any) {
    if (error?.code === 'P2002' || error?.code === 'P2034') { res.status(409).json({error: 'Conversion conflicted with another update; retry'}); return; }
    res.status(400).json({ error: 'Failed to convert lead' });
  }
});

// --- Customers ---

router.get('/customers', async (req, res) => {
  try {
    await list(res, prisma.customer, {
      where: search(res.locals.page.q, ['name', 'email', 'phone']),
      include: {
        _count: {
          select: { tickets: true }
        }
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }]
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

router.get('/customers/:id', async (req, res) => {
  const id = req.params.id as string;
  try {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, email: true, roles: true }
        },
        tickets: {
          take: res.locals.page.take, skip: res.locals.page.skip,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          include: {
            assignedTo: {
              select: { id: true, name: true }
            }
          }
        }
      }
    });
    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }
    pageHeaders(res, await prisma.ticket.count({where: {customerId: customer.id}}));
    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch customer details' });
  }
});

router.post('/customers', validate(body => customerInput(body, true)), async (req, res) => {
  const { name, email, phone, address } = req.body;
  try {
    const customer = await prisma.customer.create({
      data: { name, email, phone, address }
    });
    res.status(201).json(customer);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create customer' });
  }
});

router.put('/customers/:id', validate(body => customerInput(body)), async (req, res) => {
  const id = req.params.id as string;
  const { name, email, phone, address } = req.body;
  try {
    const customer = await prisma.customer.update({
      where: { id },
      data: { name, email, phone, address }
    });
    res.json(customer);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update customer' });
  }
});

// --- Tickets ---

router.get('/tickets', async (req, res) => {
  try {
    await list(res, prisma.ticket, {
      where: search(res.locals.page.q, ['title', 'description']),
      include: {
        customer: true,
        assignedTo: {
          select: { id: true, name: true, email: true }
        },
        _count: {
          select: { comments: true }
        }
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }]
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

router.get('/tickets/:id', async (req, res) => {
  const id = req.params.id as string;
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        customer: true,
        assignedTo: {
          select: { id: true, name: true, email: true }
        },
        comments: {
          take: res.locals.page.take, skip: res.locals.page.skip,
          include: {
            author: {
              select: { id: true, name: true, email: true }
            }
          },
          orderBy: [{createdAt: 'asc'}, {id: 'asc'}]
        }
      }
    });
    if (!ticket) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }
    pageHeaders(res, await prisma.comment.count({where: {ticketId: ticket.id}}));
    res.json(ticket);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch ticket' });
  }
});

// --- Comments ---

router.post('/tickets/:id/comments', validate(body => commentInput(body)), async (req, res) => {
  const ticketId = req.params.id as string;
  const { text, isInternal } = req.body;
  const authorId = (req as any).user.userId;

  try {
    const comment = await prisma.comment.create({
      data: {
        text,
        ticketId,
        authorId,
        isInternal
      },
      include: {
        author: {
          select: { id: true, name: true, email: true }
        }
      }
    });
    res.status(201).json(comment);
  } catch (error) {
    res.status(400).json({ error: 'Failed to add comment' });
  }
});

router.post('/tickets', validate(body => ticketInput(body, true)), validateAssignment, async (req, res) => {
  const { title, description, status, priority, type, customerId, assignedToId } = req.body;
  try {
    const ticket = await prisma.ticket.create({
      data: { title, description, status, priority, type, customerId, assignedToId }
    });
    res.status(201).json(ticket);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create ticket' });
  }
});

router.put('/tickets/:id', validate(body => ticketInput(body)), validateAssignment, async (req, res) => {
  const id = req.params.id as string;
  const { title, description, status, priority, type, assignedToId } = req.body;
  try {
    const ticket = await prisma.ticket.update({
      where: { id },
      data: { title, description, status, priority, type, assignedToId }
    });
    res.json(ticket);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update ticket' });
  }
});

export default router;
