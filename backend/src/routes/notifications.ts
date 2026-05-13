import { Router } from 'express';
import { prisma } from '../db';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';
import { format, addDays, getDay } from 'date-fns';
import { toZonedTime, formatInTimeZone } from 'date-fns-tz';

const router = Router();

router.use((req, res, next) => {
  console.log(`[Notifications Router DEBUG] ${req.method} ${req.path}`);
  next();
});

router.use(authenticate, requireAdmin);

const TIMEZONE = 'Asia/Kathmandu';

router.get('/', async (req: AuthRequest, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { role: 'EMPLOYEE' },
      include: { 
        attendanceRecords: true,
        salaryPayments: true
      }
    });

    const holidays = await prisma.holiday.findMany();
    const holidayDates = new Set(holidays.map(h => h.date));

    const pending: any[] = [];
    const cleared: any[] = [];

    users.forEach(user => {
      // Calculate salaryCount
      const records = user.attendanceRecords;
      const presentDates = new Set(records.filter(r => r.status === 'PRESENT').map(r => r.date));
      
      let salaryCount = 0;
      const now = new Date();
      const todayStr = formatInTimeZone(now, TIMEZONE, 'yyyy-MM-dd');
      const startDate = toZonedTime(user.createdAt, TIMEZONE);
      let iterDate = startDate;
      
      let safetyCounter = 0;
      while (format(iterDate, 'yyyy-MM-dd') <= todayStr && safetyCounter < 2000) {
        const dStr = format(iterDate, 'yyyy-MM-dd');
        const isPresent = presentDates.has(dStr);
        const isPast = dStr < todayStr;
        const isSat = getDay(iterDate) === 6;
        const isHolid = holidayDates.has(dStr);
        
        if (isPresent) {
          salaryCount++;
        } else if (isPast && (isSat || isHolid)) {
          salaryCount++;
        }
        
        iterDate = addDays(iterDate, 1);
        safetyCounter++;
      }
      salaryCount += (user.attendanceAdjustment || 0);

      // Check milestones
      const clearedMilestones = new Set(user.salaryPayments.map(p => p.milestone));
      
      // Add cleared payments to cleared list
      user.salaryPayments.forEach(p => {
        cleared.push({
          id: p.id,
          userName: user.name,
          milestone: p.milestone,
          clearedAt: p.clearedAt
        });
      });

      // Find pending milestones (30, 60, 90...)
      for (let m = 30; m <= salaryCount; m += 30) {
        if (!clearedMilestones.has(m)) {
          pending.push({
            userId: user.id,
            userName: user.name,
            milestone: m,
            currentDays: salaryCount
          });
        }
      }
    });

    res.json({ 
      pending, 
      cleared: cleared.sort((a, b) => new Date(b.clearedAt).getTime() - new Date(a.clearedAt).getTime()) 
    });
  } catch (error) {
    console.error('Fetch notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

router.post('/clear', async (req: AuthRequest, res) => {
  try {
    const { userId, milestone } = req.body;
    const payment = await prisma.salaryPayment.create({
      data: {
        userId,
        milestone: Number(milestone)
      }
    });
    res.json(payment);
  } catch (error) {
    console.error('Clear salary error:', error);
    res.status(500).json({ error: 'Failed to clear salary payment' });
  }
});

export default router;
