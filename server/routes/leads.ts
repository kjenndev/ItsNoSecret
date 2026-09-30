import express from 'express';
import {enqueueLeadEmail} from '../leadEmail.ts';
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
    const lead = await prisma.$transaction(async tx => {
    const created = await tx.lead.create({
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
    });
    await enqueueLeadEmail(tx, created);
    return created;
    });
    res.status(201).json({id:lead.id,status:lead.status,createdAt:lead.createdAt});
  } catch (error) {
    console.error('Failed to create public lead', error);
    res.status(500).json({ error: 'We could not send your request. Please try again or call (210) 658-6964.' });
  }
});

export default router;
