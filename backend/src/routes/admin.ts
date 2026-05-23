import { Router } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../db';
import { authenticate, requireAdmin } from '../middleware/auth';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

const TIMEZONE = 'Asia/Kathmandu';

const router = Router();
console.log('Admin routes initialized v3');
router.use(authenticate, requireAdmin);

router.post('/attendance-records-update', async (req, res) => {
  try {
    const { id, checkInTime, checkOutTime } = req.body;
    console.log('Backend updating record (BODY):', { id, checkInTime, checkOutTime });

    if (!id) return res.status(400).json({ error: 'Record ID is required' });

    const record = await prisma.attendanceRecord.findUnique({ where: { id } });
    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }

    const updateData: any = {};
    if (checkInTime) {
      updateData.checkInTime = fromZonedTime(`${record.date}T${checkInTime}:00`, TIMEZONE);
    }
    if (checkOutTime !== undefined) {
      updateData.checkOutTime = checkOutTime ? fromZonedTime(`${record.date}T${checkOutTime}:00`, TIMEZONE) : null;
    }

    const updated = await prisma.attendanceRecord.update({
      where: { id },
      data: updateData
    });

    res.json(updated);
  } catch (error) {
    console.error('Failed to update record:', error);
    res.status(500).json({ error: 'Failed to update record' });
  }
});

router.post('/employees/:id/adjust-attendance', async (req, res) => {
  try {
    const { adjustment } = req.body;
    const { id } = req.params;
    console.log(`[Adjustment Request] User: ${id}, Val: ${adjustment}`);
    
    if (isNaN(Number(adjustment))) {
      return res.status(400).json({ error: 'Adjustment must be a number' });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const currentVal = user.attendanceAdjustment || 0;
    const change = Number(adjustment) || 0;
    const newVal = currentVal + change;

    console.log(`[Adjustment] User: ${user.name}, Current: ${currentVal}, Change: ${change}, New: ${newVal}`);

    const updated = await prisma.user.update({
      where: { id },
      data: { attendanceAdjustment: newVal },
      select: { id: true, name: true, attendanceAdjustment: true }
    });
    
    console.log('[Adjustment Success]', updated);
    res.json(updated);
  } catch (error: any) {
    console.error('[Adjustment Error]', error.message || error);
    res.status(500).json({ error: 'Failed to adjust attendance' });
  }
});

router.post('/employees/:id/adjust-absent', async (req, res) => {
  try {
    const { adjustment, month } = req.body;
    const { id } = req.params;
    
    let targetMonth = month;
    if (!targetMonth) {
      targetMonth = formatInTimeZone(new Date(), TIMEZONE, 'yyyy-MM');
    }
    
    console.log(`[Absent Adjustment Request] User: ${id}, Val: ${adjustment}, Month: ${targetMonth}`);
    
    if (isNaN(Number(adjustment))) {
      return res.status(400).json({ error: 'Adjustment must be a number' });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    let adjustmentsMap: Record<string, number> = {};
    try {
      adjustmentsMap = JSON.parse(user.absentAdjustments);
    } catch (e) {
      adjustmentsMap = {};
    }

    const currentVal = adjustmentsMap[targetMonth] || 0;
    const change = Number(adjustment) || 0;
    const newVal = currentVal + change;
    
    adjustmentsMap[targetMonth] = newVal;

    console.log(`[Absent Adjustment] User: ${user.name}, Month: ${targetMonth}, Current: ${currentVal}, Change: ${change}, New: ${newVal}`);

    const updated = await prisma.user.update({
      where: { id },
      data: { absentAdjustments: JSON.stringify(adjustmentsMap) },
      select: { id: true, name: true, absentAdjustments: true }
    });
    
    console.log('[Absent Adjustment Success]', updated);
    res.json(updated);
  } catch (error: any) {
    console.error('[Absent Adjustment Error]', error.message || error);
    res.status(500).json({ error: 'Failed to adjust absent days' });
  }
});

// === SALARY ADJUSTMENT ===
router.post('/employees/:id/adjust-salary', async (req, res) => {
  try {
    const { adjustment } = req.body;
    const { id } = req.params;
    console.log(`[Salary Adjustment Request] User: ${id}, Val: ${adjustment}`);
    
    if (isNaN(Number(adjustment))) {
      return res.status(400).json({ error: 'Adjustment must be a number' });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const currentVal = user.salaryAdjustment || 0;
    const change = Number(adjustment) || 0;
    const newVal = currentVal + change;

    console.log(`[Salary Adjustment] User: ${user.name}, Current: ${currentVal}, Change: ${change}, New: ${newVal}`);

    const updated = await prisma.user.update({
      where: { id },
      data: { salaryAdjustment: newVal },
      select: { id: true, name: true, salaryAdjustment: true }
    });
    
    console.log('[Salary Adjustment Success]', updated);
    res.json(updated);
  } catch (error: any) {
    console.error('[Salary Adjustment Error]', error.message || error);
    res.status(500).json({ error: 'Failed to adjust salary days' });
  }
});

// === EMPLOYEE MANAGEMENT ===
router.get('/employees', async (req, res) => {
  try {
    const employees = await prisma.user.findMany({
      where: { role: 'EMPLOYEE' },
      select: { id: true, name: true, employeeId: true, email: true, phone: true, isActive: true, createdAt: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

router.post('/employees', async (req, res) => {
  try {
    const { name, employeeId, email, password, phone } = req.body;
    
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { employeeId }] }
    });
    if (existing) {
      return res.status(400).json({ error: 'Email or Employee ID already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newEmployee = await prisma.user.create({
      data: {
        role: 'EMPLOYEE',
        name,
        employeeId,
        email,
        passwordHash,
        phone,
      },
      select: { id: true, name: true, employeeId: true, email: true, isActive: true }
    });
    
    res.json(newEmployee);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create employee' });
  }
});

router.put('/employees/:id/status', async (req, res) => {
  try {
    const { isActive } = req.body;
    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive },
      select: { id: true, name: true, isActive: true }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update employee status' });
  }
});

router.delete('/employees/:id', async (req, res) => {
  try {
    await prisma.user.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete employee' });
  }
});

// === SETTINGS ===
router.get('/settings', async (req, res) => {
  try {
    const settings = await prisma.settings.findFirst();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

router.put('/settings', async (req, res) => {
  try {
    const { officeLat, officeLng, allowedRadius, qrCodePayload } = req.body;
    const settings = await prisma.settings.findFirst();
    if (!settings) return res.status(404).json({ error: 'Settings not found' });
    
    const updated = await prisma.settings.update({
      where: { id: settings.id },
      data: { officeLat, officeLng, allowedRadius, qrCodePayload }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// === HOLIDAYS ===
router.get('/holidays', async (req, res) => {
  try {
    const holidays = await prisma.holiday.findMany({ orderBy: { date: 'asc' } });
    res.json(holidays);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch holidays' });
  }
});

router.post('/holidays', async (req, res) => {
  try {
    const { date, name, type } = req.body;
    console.log('Holiday payload:', { date, name, type });
    const holiday = await prisma.holiday.create({ 
      data: { date, name, type: type || 'Holiday' } 
    });
    res.json(holiday);
  } catch (error) {
    console.error('Create holiday error:', error);
    res.status(500).json({ error: 'Failed to create holiday' });
  }
});

router.delete('/holidays/:id', async (req, res) => {
  try {
    await prisma.holiday.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete holiday' });
  }
});

// === RECORDS ===
router.get('/records', async (req, res) => {
  try {
    const records = await prisma.attendanceRecord.findMany({
      include: { user: { select: { id: true, name: true, employeeId: true } } },
      orderBy: { date: 'desc' },
      take: 100 // Limit for simplicity
    });
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch records' });
  }
});

router.post('/records/mark-attendance', async (req, res) => {
  try {
    const { userId, date, type } = req.body;

    if (type === 'PRESENT') {
      // Create a default record for 9:00 AM
      const checkInTime = fromZonedTime(`${date}T09:00:00`, TIMEZONE);
      
      // Check if record already exists
      const existing = await prisma.attendanceRecord.findFirst({
        where: { userId, date }
      });

      if (existing) {
        return res.json(existing);
      }

      const record = await prisma.attendanceRecord.create({
        data: {
          userId,
          date,
          checkInTime,
          status: 'PRESENT',
          sessionNumber: 1
        }
      });
      return res.json(record);
    } else if (type === 'ABSENT') {
      // Delete all records for this user on this date
      await prisma.attendanceRecord.deleteMany({
        where: { userId, date }
      });
      return res.json({ success: true });
    }

    res.status(400).json({ error: 'Invalid type' });
  } catch (error) {
    console.error('Manual attendance error:', error);
    res.status(500).json({ error: 'Failed to mark attendance' });
  }
});

export default router;
