import { prisma } from '../db';
import * as XLSX from 'xlsx';
import nodemailer from 'nodemailer';
import { format, subMonths, getDay, parseISO } from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

const TIMEZONE = 'Asia/Kathmandu';

// Helper to format milliseconds into readable "Xh Ym"
export function formatDuration(ms: number): string {
  if (!ms || ms <= 0) return '0h 0m';
  const totalMinutes = Math.floor(ms / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

// Compute report data for a specific target month (YYYY-MM)
export async function generateMonthlyData(targetMonth: string) {
  const users = await prisma.user.findMany({
    where: { role: 'EMPLOYEE' },
    include: {
      attendanceRecords: true,
    },
    orderBy: { name: 'asc' },
  });

  const holidays = await prisma.holiday.findMany();
  const holidayDates = new Set(holidays.map(h => h.date));

  // Determine all days in the target month (e.g. 2026-05-01 to 2026-05-31)
  const [yyyyStr, mmStr] = targetMonth.split('-');
  const year = parseInt(yyyyStr, 10);
  const monthIndex = parseInt(mmStr, 10) - 1; // 0-indexed
  const firstDay = new Date(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0); // last day of month

  const daysInMonth: string[] = [];
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const dayStr = `${yyyyStr}-${String(monthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    daysInMonth.push(dayStr);
  }

  const tab1Rows: any[] = [];
  const tab2Rows: any[] = [];

  for (const user of users) {
    // Check user's join date (createdAt in Kathmandu timezone)
    const joinMonthStr = formatInTimeZone(user.createdAt, TIMEZONE, 'yyyy-MM');
    const joinDateStr = formatInTimeZone(user.createdAt, TIMEZONE, 'yyyy-MM-dd');

    // If employee joined after this month, skip them for this month's report
    if (joinMonthStr > targetMonth) {
      continue;
    }

    // Filter records for this month
    const monthRecords = user.attendanceRecords.filter(r => r.date.startsWith(targetMonth));
    const presentDates = new Set(monthRecords.filter(r => r.status === 'PRESENT').map(r => r.date));

    // Calculate absent days based on office calendar
    let absentDaysCount = 0;
    for (const dStr of daysInMonth) {
      if (dStr < joinDateStr) continue; // Not joined yet

      const dateObj = new Date(`${dStr}T12:00:00Z`);
      const isSaturday = getDay(dateObj) === 6;
      const isHoliday = holidayDates.has(dStr);
      const isPresent = presentDates.has(dStr);

      if (!isSaturday && !isHoliday && !isPresent) {
        absentDaysCount++;
      }
    }

    // Include manual absent adjustments if any
    let adjustmentsMap: Record<string, number> = {};
    try {
      adjustmentsMap = JSON.parse(user.absentAdjustments || '{}');
    } catch {
      adjustmentsMap = {};
    }
    const manualAbsentAdj = adjustmentsMap[targetMonth] || 0;
    const finalAbsentDays = Math.max(0, absentDaysCount + manualAbsentAdj);

    // Present days count
    const finalPresentDays = presentDates.size + (user.attendanceAdjustment || 0);

    // Calculate total presence time
    let totalPresenceMs = 0;
    const dailyDurations: Record<string, number> = {};

    for (const r of monthRecords) {
      if (r.checkInTime && r.checkOutTime) {
        const inTime = new Date(r.checkInTime).getTime();
        const outTime = new Date(r.checkOutTime).getTime();
        const diff = outTime - inTime;
        if (diff > 0) {
          dailyDurations[r.date] = (dailyDurations[r.date] || 0) + diff;
          totalPresenceMs += diff;
        }
      }
    }

    const uniquePresenceDays = Object.keys(dailyDurations).length;
    const avgDailyPresenceMs = uniquePresenceDays > 0 ? Math.round(totalPresenceMs / uniquePresenceDays) : 0;
    const totalPresenceHours = (totalPresenceMs / (1000 * 60 * 60)).toFixed(1);

    // Tab 1 Row: Attendance records
    tab1Rows.push({
      'Employee ID': user.employeeId,
      'Employee Name': user.name,
      'Email': user.email,
      'Month': targetMonth,
      'Total Present Days': finalPresentDays,
      'Total Absent Days': finalAbsentDays,
      'Status': user.isActive ? 'Active' : 'Inactive',
    });

    // Tab 2 Row: Detailed Presence Time records
    tab2Rows.push({
      'Employee ID': user.employeeId,
      'Employee Name': user.name,
      'Email': user.email,
      'Month': targetMonth,
      'Total Present Days': finalPresentDays,
      'Total Absent Days': finalAbsentDays,
      'Total Presence Time': formatDuration(totalPresenceMs),
      'Total Presence (Hours)': parseFloat(totalPresenceHours),
      'Average Daily Presence Time': formatDuration(avgDailyPresenceMs),
      'Status': user.isActive ? 'Active' : 'Inactive',
    });
  }

  return { tab1Rows, tab2Rows };
}

// Generate an Excel buffer containing both Tab 1 and Tab 2
export async function generateMonthlyExcelWorkbook(targetMonth: string): Promise<Buffer> {
  const { tab1Rows, tab2Rows } = await generateMonthlyData(targetMonth);

  const workbook = XLSX.utils.book_new();

  // Tab 1: Monthly Attendance
  const ws1 = XLSX.utils.json_to_sheet(tab1Rows);
  // Auto-fit column widths
  ws1['!cols'] = [
    { wch: 15 }, // Employee ID
    { wch: 22 }, // Employee Name
    { wch: 30 }, // Email
    { wch: 12 }, // Month
    { wch: 20 }, // Total Present Days
    { wch: 20 }, // Total Absent Days
    { wch: 12 }, // Status
  ];
  XLSX.utils.book_append_sheet(workbook, ws1, 'Attendance Summary');

  // Tab 2: Presence & Time Summary
  const ws2 = XLSX.utils.json_to_sheet(tab2Rows);
  ws2['!cols'] = [
    { wch: 15 }, // Employee ID
    { wch: 22 }, // Employee Name
    { wch: 30 }, // Email
    { wch: 12 }, // Month
    { wch: 18 }, // Total Present Days
    { wch: 18 }, // Total Absent Days
    { wch: 22 }, // Total Presence Time
    { wch: 22 }, // Total Presence (Hours)
    { wch: 26 }, // Average Daily Presence Time
    { wch: 12 }, // Status
  ];
  XLSX.utils.book_append_sheet(workbook, ws2, 'Presence & Duration');

  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
  return buffer;
}

// Create nodemailer transporter using environment variables
export function createMailTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });
}

// Send Monthly Report by Email
export async function sendMonthlyReportEmail(targetMonth?: string, customRecipient?: string) {
  // If no month is provided, default to the previous month
  const monthToSend = targetMonth || formatInTimeZone(subMonths(new Date(), 1), TIMEZONE, 'yyyy-MM');
  const recipient = customRecipient || process.env.REPORT_RECIPIENT_EMAIL || process.env.SMTP_USER;

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error('SMTP_USER and SMTP_PASS are not configured in environment variables');
  }

  if (!recipient) {
    throw new Error('No recipient email specified and REPORT_RECIPIENT_EMAIL is not set');
  }

  console.log(`[Monthly Report] Generating report for month: ${monthToSend}...`);
  const excelBuffer = await generateMonthlyExcelWorkbook(monthToSend);

  const transporter = createMailTransporter();
  const filename = `Attendance_Report_${monthToSend}.xlsx`;

  console.log(`[Monthly Report] Sending email from ${process.env.SMTP_USER} to ${recipient}...`);
  const info = await transporter.sendMail({
    from: `"Core Walkers Office Tracker" <${process.env.SMTP_USER}>`,
    to: recipient,
    subject: `Monthly Attendance & Presence Report - ${monthToSend}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #0f172a;">Core Walkers Monthly Attendance Report</h2>
        <p>Hello,</p>
        <p>Please find attached the official monthly attendance and presence report for <strong>${monthToSend}</strong>.</p>
        <div style="background-color: #f8fafc; border-left: 4px solid #10b981; padding: 12px; margin: 16px 0;">
          <strong>Included in the attached Excel Sheet:</strong>
          <ul>
            <li><strong>Tab 1 (Attendance Summary):</strong> Total present days count and absent days count for every employee.</li>
            <li><strong>Tab 2 (Presence & Duration):</strong> Total present count, absent count, total presence hours, and average daily presence time.</li>
          </ul>
        </div>
        <p style="font-size: 0.9em; color: #64748b;">Generated automatically by Core Walkers Office Tracker at the end of the month.</p>
      </div>
    `,
    attachments: [
      {
        filename,
        content: excelBuffer,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    ],
  });

  console.log(`[Monthly Report] Successfully sent to ${recipient}: ${info.messageId}`);
  return { success: true, messageId: info.messageId, recipient, month: monthToSend };
}

