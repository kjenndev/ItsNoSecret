import express from 'express';
import { prisma } from '../db.ts';
import { validateLeadPayload } from '../leadValidation.ts';

const router = express.Router();

router.post('/', async (req, res) => {
  const result = validateLeadPayload(req.body, { sourceDefault: 'CONSULTATION_MODAL' });
  if (!result.valid) {
    res.status(400).json({ error: result.error });
    return;
  }

  try {
    const lead = await prisma.lead.create({
      data: {
        ...result.data,
        source: 'CONSULTATION_MODAL',
        status: 'NEW',
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
      },
    });
    res.status(201).json(lead);
  } catch (error) {
    console.error('Failed to create public lead', error);
    res.status(500).json({ error: 'We could not send your request. Please try again or call (210) 658-6964.' });
  }
});

export default router;
