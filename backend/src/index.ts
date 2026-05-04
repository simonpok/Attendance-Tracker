import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

if (!process.env.JWT_SECRET) {
  console.warn('WARNING: JWT_SECRET is not set. Using a temporary secret for now, but this will invalidate sessions on restart.');
  process.env.JWT_SECRET = 'temporary-emergency-secret-123';
}

app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[Request] ${req.method} ${req.path}`);
  next();
});

app.use('/api/auth', authRoutes);
import adminRoutes from './routes/admin';
app.use('/api/admin', adminRoutes);
import attendanceRoutes from './routes/attendance';
app.use('/api/attendance', attendanceRoutes);
import leaderboardRoutes from './routes/leaderboard';
app.use('/api/leaderboards', leaderboardRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Serve Frontend
const frontendPath = path.join(__dirname, '../../frontend/dist');
console.log(`[Diagnostic] Frontend path: ${frontendPath}`);
import fs from 'fs';
if (fs.existsSync(frontendPath)) {
  console.log(`[Diagnostic] Frontend directory exists.`);
  if (fs.existsSync(path.join(frontendPath, 'index.html'))) {
    console.log(`[Diagnostic] index.html exists.`);
  } else {
    console.warn(`[Diagnostic] index.html NOT found in ${frontendPath}`);
  }
} else {
  console.warn(`[Diagnostic] Frontend directory NOT found at ${frontendPath}`);
}

app.use(express.static(frontendPath));

app.get('/:path*', (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'API route not found' });
  const indexPath = path.join(frontendPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Frontend not built. Please check deployment logs.');
  }
});

app.listen(Number(PORT), '0.0.0.0', async () => {
  console.log(`Server is running on port ${PORT} (0.0.0.0)`);
  try {
    const { prisma } = await import('./db');
    await prisma.$connect();
    console.log('Database connected successfully');
  } catch (err) {
    console.error('Database connection failed:', err);
  }
});
