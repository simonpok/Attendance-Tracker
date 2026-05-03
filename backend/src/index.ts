import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';

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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
