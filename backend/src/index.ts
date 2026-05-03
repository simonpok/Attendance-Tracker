import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
import adminRoutes from './routes/admin';
app.use('/api/admin', adminRoutes);
import attendanceRoutes from './routes/attendance';
app.use('/api/attendance', attendanceRoutes);
import leaderboardRoutes from './routes/leaderboard';
app.use('/api/leaderboards', leaderboardRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Serve Frontend
const frontendPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendPath));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'API route not found' });
  res.sendFile(path.join(frontendPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
