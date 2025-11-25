import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import forecastRouter from './routes/forecast';
import scenariosRouter from './routes/scenarios';
import projectsRouter from './routes/projects';
import { seedProjectsIfNeeded } from './services/projectStore';

// TODO(implementation-plan): Bootstrap HTTP server, expose health check, and mount
// forecast routes so the frontend can trigger simulations.

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/forecast', forecastRouter);
app.use('/api/scenarios', scenariosRouter);
app.use('/api/projects', projectsRouter);

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

const start = async () => {
  await seedProjectsIfNeeded();
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Forecast API listening on http://localhost:${PORT}`);
  });
};

void start();
