import express from 'express';
import { prisma } from '../db.ts';
import { validateLeadPayload } from '../leadValidation.ts';

import { rateLimit } from '../rateLimit.ts';
const router = express.Router();

router.post('/', rateLimit(), async (req, res) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const {name, email, phone, preferredContact, serviceNeed, message} = body;
  const result = validateLeadPayload({name, email, phone, preferredContact, serviceNeed, message}, { sourceDefault: 'CONSULTATION_MODAL' });
  if (!result.valid) {
    res.status(400).json({ error: result.error });
    return;
  }

  try {
    const lead = await prisma.lead.create({
      data: {
        name: result.data.name,
        email: result.data.email,
        phone: result.data.phone,
        preferredContact: result.data.preferredContact,
        serviceNeed: result.data.serviceNeed,
        message: result.data.message,
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
