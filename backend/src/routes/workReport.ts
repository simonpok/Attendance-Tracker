import { Router } from 'express';
import { prisma } from '../db';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';
import { formatInTimeZone } from 'date-fns-tz';
import * as XLSX from 'xlsx';

const router = Router();
const TIMEZONE = 'Asia/Kathmandu';

const getTodayStr = () => formatInTimeZone(new Date(), TIMEZONE, 'yyyy-MM-dd');

// ── Employee: check whether today's report already submitted ──────────────────
router.get('/today-status', authenticate, async (req: AuthRequest, res) => {
  try {
    const dateStr = getTodayStr();
    const existing = await prisma.dailyWorkReport.findUnique({
      where: { userId_date: { userId: req.user!.userId, date: dateStr } }
    });
    res.json({ submitted: !!existing, date: dateStr });
  } catch (err) {
    res.status(500).json({ error: 'Failed to check report status' });
  }
});

// ── Employee: submit daily work report + complete check-out atomically ────────
router.post('/submit', authenticate, async (req: AuthRequest, res) => {
  try {
    const { summary, lat, lng, qrPayload } = req.body;

    if (!summary || typeof summary !== 'string' || summary.trim().length === 0) {
      return res.status(400).json({ error: 'Work summary is required.' });
    }
    if (summary.trim().length < 250) {
      return res.status(400).json({ error: "Come on! At least 250 characters of work. If nothing else, just go 'blah blah blah'" });
    }
    if (summary.length > 500) {
      return res.status(400).json({ error: 'Summary must not exceed 500 characters.' });
    }

    const dateStr = getTodayStr();

    // Validate location + QR (reuse settings)
    const settings = await prisma.settings.findFirst();
    if (!settings) return res.status(500).json({ error: 'Settings not configured' });

    if (qrPayload !== settings.qrCodePayload) {
      return res.status(400).json({ error: 'Invalid QR Code' });
    }

    // Check havent already submitted today (idempotency guard)
    const existingReport = await prisma.dailyWorkReport.findUnique({
      where: { userId_date: { userId: req.user!.userId, date: dateStr } }
    });
    if (existingReport) {
      // Report already done — just do the check-out if still checked in
      const latestRecord = await prisma.attendanceRecord.findFirst({
        where: { userId: req.user!.userId, date: dateStr },
        orderBy: { createdAt: 'desc' }
      });
      if (latestRecord && !latestRecord.checkOutTime) {
        const updated = await prisma.attendanceRecord.update({
          where: { id: latestRecord.id },
          data: { checkOutTime: new Date() }
        });
        return res.json({ checkOut: updated, report: existingReport, alreadySubmitted: true });
      }
      return res.json({ report: existingReport, alreadySubmitted: true });
    }

    // Find open check-in record for today
    const latestRecord = await prisma.attendanceRecord.findFirst({
      where: { userId: req.user!.userId, date: dateStr },
      orderBy: { createdAt: 'desc' }
    });

    if (!latestRecord || latestRecord.checkOutTime) {
      return res.status(400).json({ error: 'No active check-in found for today.' });
    }

    const checkOutTime = new Date();

    // Atomic: save report + update check-out time
    const [report, checkOut] = await prisma.$transaction([
      prisma.dailyWorkReport.create({
        data: {
          userId: req.user!.userId,
          date: dateStr,
          checkOutTime,
          summary: summary.trim()
        }
      }),
      prisma.attendanceRecord.update({
        where: { id: latestRecord.id },
        data: { checkOutTime }
      })
    ]);

    res.json({ report, checkOut });
  } catch (err: any) {
    console.error('[WorkReport] Submit error:', err);
    res.status(500).json({ error: err.message || 'Failed to submit work report' });
  }
});

// ── Admin: download all daily work reports as Excel (one tab per employee) ────
router.get('/download-excel', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const reports = await prisma.dailyWorkReport.findMany({
      include: { user: { select: { name: true, employeeId: true } } },
      orderBy: [{ userId: 'asc' }, { date: 'asc' }]
    });

    const workbook = XLSX.utils.book_new();

    // Group by employee
    const byEmployee: Record<string, typeof reports> = {};
    for (const r of reports) {
      const key = r.user.name;
      if (!byEmployee[key]) byEmployee[key] = [];
      byEmployee[key].push(r);
    }

    if (Object.keys(byEmployee).length === 0) {
      // Create a placeholder sheet if no reports yet
      const ws = XLSX.utils.aoa_to_sheet([['No daily work reports submitted yet.']]);
      XLSX.utils.book_append_sheet(workbook, ws, 'No Data');
    } else {
      for (const [empName, empReports] of Object.entries(byEmployee)) {
        const rows = empReports.map(r => ({
          'Date': r.date,
          'Employee ID': r.user.employeeId,
          'Check-out Time': formatInTimeZone(r.checkOutTime, TIMEZONE, 'hh:mm a'),
          'Daily Work Summary': r.summary
        }));

        const ws = XLSX.utils.json_to_sheet(rows);
        ws['!cols'] = [
          { wch: 14 }, // Date
          { wch: 14 }, // Employee ID
          { wch: 16 }, // Check-out Time
          { wch: 60 }, // Summary
        ];

        // Bold header row
        const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
        for (let C = range.s.c; C <= range.e.c; C++) {
          const addr = XLSX.utils.encode_cell({ r: 0, c: C });
          if (ws[addr]) ws[addr].s = { font: { bold: true } };
        }

        // Sanitize tab name (max 31 chars, no special chars)
        const tabName = empName.replace(/[:\\/?*[\]]/g, '').slice(0, 31);
        XLSX.utils.book_append_sheet(workbook, ws, tabName);
      }
    }

    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    const today = formatInTimeZone(new Date(), TIMEZONE, 'yyyy-MM-dd');

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="DailyWorkReports_${today}.xlsx"`);
    res.send(buffer);
  } catch (err: any) {
    console.error('[WorkReport] Excel error:', err);
    res.status(500).json({ error: 'Failed to generate Excel' });
  }
});

// ── Summary list: which employees submitted (accessible to employees & admins) ──
router.get('/daily-summary', authenticate, async (req: AuthRequest, res) => {
  try {
    const { date } = req.query;
    const dateStr = (date as string) || getTodayStr();

    const reports = await prisma.dailyWorkReport.findMany({
      where: { date: dateStr },
      include: { user: { select: { name: true, employeeId: true, id: true } } },
      orderBy: { createdAt: 'asc' }
    });

    // All active employees
    const allEmployees = await prisma.user.findMany({
      where: { role: 'EMPLOYEE', isActive: true },
      select: { id: true, name: true, employeeId: true }
    });

    const submittedIds = new Set(reports.map(r => r.userId));

    res.json({
      date: dateStr,
      submitted: reports.map(r => ({
        id: r.id,
        userId: r.userId,
        name: r.user.name,
        employeeId: r.user.employeeId,
        checkOutTime: r.checkOutTime,
        summary: r.summary,
        createdAt: r.createdAt
      })),
      notSubmitted: allEmployees
        .filter(e => !submittedIds.has(e.id))
        .map(e => ({ userId: e.id, name: e.name, employeeId: e.employeeId }))
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch work report summary' });
  }
});

// Alias for admin backwards compatibility
router.get('/admin-summary', authenticate, async (req: AuthRequest, res) => {
  const { date } = req.query;
  const dateStr = (date as string) || getTodayStr();

  try {
    const reports = await prisma.dailyWorkReport.findMany({
      where: { date: dateStr },
      include: { user: { select: { name: true, employeeId: true, id: true } } },
      orderBy: { createdAt: 'asc' }
    });

    const allEmployees = await prisma.user.findMany({
      where: { role: 'EMPLOYEE', isActive: true },
      select: { id: true, name: true, employeeId: true }
    });

    const submittedIds = new Set(reports.map(r => r.userId));

    res.json({
      date: dateStr,
      submitted: reports.map(r => ({
        id: r.id,
        userId: r.userId,
        name: r.user.name,
        employeeId: r.user.employeeId,
        checkOutTime: r.checkOutTime,
        summary: r.summary,
        createdAt: r.createdAt
      })),
      notSubmitted: allEmployees
        .filter(e => !submittedIds.has(e.id))
        .map(e => ({ userId: e.id, name: e.name, employeeId: e.employeeId }))
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch work report summary' });
  }
});

export default router;
