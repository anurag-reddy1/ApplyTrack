import { Router } from 'express';
import {
  getAllInterviews,
  getInterviewById,
  createInterview,
  updateInterview,
  deleteInterview,
} from '../db/interviews.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const interviews = await getAllInterviews();
    res.json(interviews);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch interviews' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const interview = await getInterviewById(req.params.id);
    if (!interview) return res.status(404).json({ error: 'Not found' });
    res.json(interview);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch interview' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { company, role, round } = req.body;
    if (!company || !role || !round) {
      return res.status(400).json({ error: 'company, role, and round are required' });
    }
    const created = await createInterview(req.body);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create interview' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const updated = await updateInterview(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update interview' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await deleteInterview(req.params.id);
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Interview deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete interview' });
  }
});

export default router;