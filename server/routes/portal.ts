import express from 'express';
import { prisma } from '../db.ts';
import { authenticateToken } from '../middleware/auth.ts';

const router = express.Router();

// Helper to ensure the user has a CLIENT role
const requireClient = (req: any, res: any, next: any) => {
  if (!req.user.roles.includes('CLIENT')) {
    return res.status(403).json({ error: 'Client portal access required' });
  }
  next();
};

router.use(authenticateToken);
router.use(requireClient);

// Get the customer profile and tickets for the logged-in user
router.get('/me', async (req: any, res) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { userId: req.user.userId },
      include: {
        tickets: {
          orderBy: { createdAt: 'desc' },
          include: {
            assignedTo: {
              select: { name: true }
            },
            _count: {
              select: { comments: true }
            }
          }
        }
      }
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer profile not found. Please contact support.' });
    }

    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch portal data' });
  }
});

// Submit a new ticket
router.post('/tickets', async (req: any, res) => {
  const { title, description, type } = req.body;
  
  try {
    const customer = await prisma.customer.findUnique({
      where: { userId: req.user.userId }
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer profile not found' });
    }

    const ticket = await prisma.ticket.create({
      data: {
        title,
        description,
        type: type || 'OTHER',
        customerId: customer.id,
        status: 'OPEN',
        priority: 'MEDIUM'
      }
    });

    res.status(201).json(ticket);
  } catch (error) {
    res.status(400).json({ error: 'Failed to submit ticket' });
  }
});

// Get single ticket details
router.get('/tickets/:id', async (req: any, res) => {
  const { id } = req.params;
  
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        customer: true,
        assignedTo: {
          select: { name: true }
        },
        comments: {
          include: {
            author: {
              select: { name: true, roles: true }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!ticket || ticket.customer.userId !== req.user.userId) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json(ticket);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch ticket' });
  }
});

// Post a comment
router.post('/tickets/:id/comments', async (req: any, res) => {
  const { id: ticketId } = req.params;
  const { text } = req.body;

  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { customer: true }
    });

    if (!ticket || ticket.customer.userId !== req.user.userId) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const comment = await prisma.comment.create({
      data: {
        text,
        ticketId,
        authorId: req.user.userId
      },
      include: {
        author: {
          select: { name: true, roles: true }
        }
      }
    });

    res.status(201).json(comment);
  } catch (error) {
    res.status(400).json({ error: 'Failed to post comment' });
  }
});

export default router;
