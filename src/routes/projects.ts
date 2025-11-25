import { Router } from 'express';
import { z } from 'zod';
import { createProject, deleteProject, listProjects } from '../services/projectStore';

const router = Router();

const createSchema = z.object({
  name: z.string().min(1).max(120),
});

router.get('/', async (_req, res) => {
  try {
    const projects = await listProjects();
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/', async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.flatten() });
  }
  try {
    const project = await createProject(parsed.data.name);
    return res.status(201).json(project);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const success = await deleteProject(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Project not found' });
    }
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

export default router;

