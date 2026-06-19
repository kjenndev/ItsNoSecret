import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db.ts';
import { validateAccountCredentialsPayload } from '../accountCredentials.ts';
import { authenticateToken, requireAdmin } from '../middleware/auth.ts';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

// All user routes require authentication. Self-service credentials are available to every signed-in user.
router.use(authenticateToken);

router.put('/me', async (req, res) => {
  const validation = validateAccountCredentialsPayload(req.body);
  if (!validation.success) {
    res.status(400).json({ error: validation.error });
    return;
  }

  try {
    const currentUser = await prisma.user.findUnique({
      where: { id: (req as any).user.userId },
    });

    if (!currentUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const currentPasswordMatches = await bcrypt.compare(validation.data.currentPassword, currentUser.passwordHash);
    if (!currentPasswordMatches) {
      res.status(400).json({ error: 'Current password is incorrect' });
      return;
    }

    const updateData: any = {
      name: validation.data.name,
      email: validation.data.email,
    };

    if (validation.data.newPassword) {
      updateData.passwordHash = await bcrypt.hash(validation.data.newPassword, 10);
    }

    const user = await prisma.user.update({
      where: { id: currentUser.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        roles: true,
      },
    });

    const token = jwt.sign(
      { userId: user.id, email: user.email, roles: user.roles },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ token, user });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      res.status(400).json({ error: 'Email address is already in use' });
      return;
    }
    console.error('Update own credentials error:', error);
    res.status(500).json({ error: 'Failed to update account credentials' });
  }
});

// Admin user management routes require admin role
router.use(requireAdmin);

// Get all users
router.get('/', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        roles: true,
        createdAt: true,
        _count: {
          select: { tickets: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Create new user
router.post('/', async (req, res) => {
  const { email, password, name, roles, customerId } = req.body;
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Preparation for customer link/create
    let customerData: any = undefined;
    
    if (roles?.includes('CLIENT')) {
      if (customerId) {
        customerData = { connect: { id: customerId } };
      } else {
        // Automatically create a customer profile if none linked
        customerData = {
          create: {
            name: name || email.split('@')[0],
            email: email,
          }
        };
      }
    }

    const user = await prisma.user.create({
      data: { 
        email, 
        passwordHash, 
        name, 
        roles: roles || ['TECHNICIAN'],
        customer: customerData
      },
      select: {
        id: true,
        email: true,
        name: true,
        roles: true,
        createdAt: true
      }
    });
    res.status(201).json(user);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(400).json({ error: 'Failed to create user. Email might be in use.' });
  }
});

// Update user
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { email, password, name, roles, customerId } = req.body;

  try {
    const updateData: any = { 
      email, 
      name, 
      roles,
      // Handle customer linking
      customer: roles?.includes('CLIENT') && customerId ? {
        connect: { id: customerId }
      } : {
        disconnect: true // Disconnect if not a client or no customerId
      }
    };

    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        roles: true
      }
    });
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update user' });
  }
});

// Delete user
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  
  // Prevent admin from deleting themselves
  if (id === (req as any).user.userId) {
    res.status(400).json({ error: 'You cannot delete your own account' });
    return;
  }

  try {
    await prisma.user.delete({
      where: { id }
    });
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: 'Failed to delete user' });
  }
});

export default router;
