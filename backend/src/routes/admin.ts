import { Router } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../db';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();
router.use(authenticate, requireAdmin);

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
    const { date, name } = req.body;
    const holiday = await prisma.holiday.create({ data: { date, name } });
    res.json(holiday);
  } catch (error) {
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

export default router;
