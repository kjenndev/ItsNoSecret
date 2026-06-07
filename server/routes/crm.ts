import express from 'express';
import { prisma } from '../db.ts';
import { authenticateToken } from '../middleware/auth.ts';

const router = express.Router();

// Apply auth middleware to all routes in this router
router.use(authenticateToken);

// --- Users (for assignment) ---

router.get('/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        roles: true
      },
      orderBy: { name: 'asc' }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// --- Customers ---

router.get('/customers', async (req, res) => {
  try {
    const customers = await prisma.customer.findMany({
      include: {
        _count: {
          select: { tickets: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

router.get('/customers/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, email: true, roles: true }
        },
        tickets: {
          orderBy: { createdAt: 'desc' },
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
    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch customer details' });
  }
});

router.post('/customers', async (req, res) => {
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

router.put('/customers/:id', async (req, res) => {
  const { id } = req.params;
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
    const tickets = await prisma.ticket.findMany({
      include: {
        customer: true,
        assignedTo: {
          select: { id: true, name: true, email: true }
        },
        _count: {
          select: { comments: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

router.get('/tickets/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        customer: true,
        assignedTo: {
          select: { id: true, name: true, email: true }
        },
        comments: {
          include: {
            author: {
              select: { id: true, name: true, email: true }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });
    if (!ticket) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }
    res.json(ticket);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch ticket' });
  }
});

// --- Comments ---

router.post('/tickets/:id/comments', async (req, res) => {
  const { id: ticketId } = req.params;
  const { text } = req.body;
  const authorId = (req as any).user.userId;

  try {
    const comment = await prisma.comment.create({
      data: {
        text,
        ticketId,
        authorId
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

router.post('/tickets', async (req, res) => {
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

router.put('/tickets/:id', async (req, res) => {
  const { id } = req.params;
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
