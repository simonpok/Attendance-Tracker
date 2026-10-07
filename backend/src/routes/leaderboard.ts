import { Router } from 'express';
import { prisma } from '../db';
import { authenticate } from '../middleware/auth';
import { format, addDays, isWeekend, getDay } from 'date-fns';
import { toZonedTime, formatInTimeZone } from 'date-fns-tz';

const TIMEZONE = 'Asia/Kathmandu'; // Consistent with attendance routes
const PAID_LEAVE_DAYS = 2; // Number of paid leave days per month

const router = Router();

router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const targetMonth = req.query.absentMonth as string; // e.g. "2026-05"
    const targetSalaryMonth = req.query.salaryMonth as string;
    let users = await prisma.user.findMany({
      where: { role: 'EMPLOYEE' },
      select: { id: true, name: true, attendanceAdjustment: true, absentAdjustments: true, salaryAdjustment: true, attendanceRecords: true, createdAt: true }
    });

    if (targetMonth) {
      users = users.filter(user => {
        const userMonth = formatInTimeZone(user.createdAt, TIMEZONE, 'yyyy-MM');
        return userMonth <= targetMonth;
      });
    }

    if (targetSalaryMonth) {
      users = users.filter(user => {
        const userMonth = formatInTimeZone(user.createdAt, TIMEZONE, 'yyyy-MM');
        return userMonth <= targetSalaryMonth;
      });
    }

    const holidays = await prisma.holiday.findMany();
    const holidayDates = new Set(holidays.map(h => h.date));

    const leaderboard = users.map(user => {
      const records = user.attendanceRecords;
      const presentDates = new Set(records.filter(r => r.status === 'PRESENT').map(r => r.date));
      const totalPresent = presentDates.size + (user.attendanceAdjustment || 0);
      
      let currentStreak = 0;
      
      // Salary counting logic
      let salaryCount = 0;
      let adjustmentsMap: Record<string, number> = {};
      try {
        adjustmentsMap = JSON.parse((user as any).absentAdjustments || "{}");
      } catch (e) {
        adjustmentsMap = {};
      }
      
      let totalAbsent = 0;
      if (targetMonth) {
        totalAbsent = adjustmentsMap[targetMonth] || 0;
      } else {
        totalAbsent = Object.values(adjustmentsMap).reduce((acc, val) => acc + val, 0);
      }
      
      let totalAbsentForSalaryMonth = 0;
      if (targetSalaryMonth) {
        totalAbsentForSalaryMonth = adjustmentsMap[targetSalaryMonth] || 0;
      }
      
      const now = new Date();
      const todayStr = formatInTimeZone(now, TIMEZONE, 'yyyy-MM-dd');
      
      // Use user.createdAt as the join date
      const startDate = toZonedTime(user.createdAt, TIMEZONE);
      let iterDate = startDate;
      
      // Limit the loop to avoid infinite loops in case of issues
      let safetyCounter = 0;
      while (format(iterDate, 'yyyy-MM-dd') <= todayStr && safetyCounter < 1000) {
        const dStr = format(iterDate, 'yyyy-MM-dd');
        const isPresent = presentDates.has(dStr);
        const isPast = dStr < todayStr;
        const isSat = getDay(iterDate) === 6;
        const isHolid = holidayDates.has(dStr);
        
        
        const isTargetMonth = targetMonth ? dStr.startsWith(targetMonth) : true;
        const isSalaryTargetMonth = targetSalaryMonth ? dStr.startsWith(targetSalaryMonth) : true;
        
        if (!targetSalaryMonth) {
          if (isPresent) {
            salaryCount++;
          } else if (isPast && (isSat || isHolid)) {
            salaryCount++;
          } 
        }
        
        if (isPast && !isSat && !isHolid && !isPresent) {
          if (isTargetMonth) {
            totalAbsent++;
          }
          if (targetSalaryMonth && isSalaryTargetMonth) {
            totalAbsentForSalaryMonth++;
          }
        }
        
        iterDate = addDays(iterDate, 1);
        safetyCounter++;
      }
      
      if (targetSalaryMonth) {
        const [yyyyStr, mmStr] = targetSalaryMonth.split('-');
        
        const year = parseInt(yyyyStr);
        const monthIndex = parseInt(mmStr) - 1;
        const monthStart = new Date(year, monthIndex, 1);
        const monthEnd = new Date(year, monthIndex + 1, 0); // last day of month
        
        const joinZonedDate = toZonedTime(user.createdAt, TIMEZONE);
        const joinDateOnly = new Date(joinZonedDate.getFullYear(), joinZonedDate.getMonth(), joinZonedDate.getDate());
        
        const nowZonedDate = toZonedTime(now, TIMEZONE);
        const todayDateOnly = new Date(nowZonedDate.getFullYear(), nowZonedDate.getMonth(), nowZonedDate.getDate());
        
        const actualStart = monthStart > joinDateOnly ? monthStart : joinDateOnly;
        const actualEnd = monthEnd < todayDateOnly ? monthEnd : todayDateOnly;
        
        if (actualStart <= actualEnd) {
          const diffTime = actualEnd.getTime() - actualStart.getTime();
          const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
          // Apply paid leave: up to PAID_LEAVE_DAYS absences are covered and don't reduce salary
          const billableAbsences = Math.max(0, totalAbsentForSalaryMonth - PAID_LEAVE_DAYS);
          salaryCount = diffDays - billableAbsences;
        } else {
          salaryCount = 0;
        }
      } else {
        salaryCount += (user.salaryAdjustment || 0);
      }

      if (records.length > 0) {
        // Find first record date
        const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
        const firstDate = new Date(sorted[0].date);
        
        let checkDate = now;
        for (let i = 0; i < 365; i++) {
          const dStr = formatInTimeZone(checkDate, TIMEZONE, 'yyyy-MM-dd');
          const zonedCheckDate = toZonedTime(checkDate, TIMEZONE);
          const isSat = getDay(zonedCheckDate) === 6;
          const isHolid = holidayDates.has(dStr);
          const isPresent = presentDates.has(dStr);

          if (isPresent) {
            currentStreak++;
          } else if (isSat || isHolid) {
            // Skip
          } else if (dStr !== todayStr) {
            break;
          }

          checkDate = addDays(checkDate, -1);
          if (formatInTimeZone(checkDate, TIMEZONE, 'yyyy-MM-dd') < format(addDays(firstDate, -7), 'yyyy-MM-dd')) break;
        }
      }

      // Calculate Average Presence Time
      const dailyPresenceDurations: Record<string, number> = {};
      records.forEach(r => {
        if (r.checkInTime && r.checkOutTime) {
          const checkIn = new Date(r.checkInTime).getTime();
          const checkOut = new Date(r.checkOutTime).getTime();
          const duration = checkOut - checkIn;
          if (duration > 0) {
            dailyPresenceDurations[r.date] = (dailyPresenceDurations[r.date] || 0) + duration;
          }
        }
      });

      const presenceDays = Object.keys(dailyPresenceDurations).length;
      const totalPresenceMs = Object.values(dailyPresenceDurations).reduce((acc, val) => acc + val, 0);
      const averagePresence = presenceDays > 0 ? Math.round(totalPresenceMs / presenceDays) : 0;

      return {
        id: user.id,
        name: user.name,
        totalPresent,
        totalAbsent,
        salaryCount,
        currentStreak,
        attendanceAdjustment: user.attendanceAdjustment,
        absentAdjustments: (user as any).absentAdjustments,
        salaryAdjustment: user.salaryAdjustment,
        averagePresence,
        attendanceCount: presentDates.size
      };
    });

    // Sort by Highest Attendance
    const highestAttendance = [...leaderboard].sort((a, b) => b.totalPresent - a.totalPresent);
    // Sort by Highest Streak
    const highestStreak = [...leaderboard].sort((a, b) => b.currentStreak - a.currentStreak);
    // Sort by Salary Count
    const highestSalary = [...leaderboard].sort((a, b) => b.salaryCount - a.salaryCount);
    // Sort by Highest Absent
    const highestAbsent = [...leaderboard].sort((a, b) => b.totalAbsent - a.totalAbsent);
    // Sort by Highest Presence Time
    const highestPresence = [...leaderboard].sort((a, b) => b.averagePresence - a.averagePresence);

    const userId = (req as any).user.userId;
    const myStats = leaderboard.find(u => u.id === userId) || null;

    res.json({ highestAttendance, highestStreak, highestSalary, highestAbsent, highestPresence, myStats });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

export default router;
