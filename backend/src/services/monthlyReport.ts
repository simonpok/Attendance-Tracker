import { prisma } from '../db';
import * as XLSX from 'xlsx';
import nodemailer, { SendMailOptions } from 'nodemailer';
import { format, subMonths, getDay, addDays } from 'date-fns';
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

// Retrieve email and reporting configuration from database or env fallbacks
export async function getEmailSettings() {
  const dbSettings = await prisma.settings.findFirst();
  return {
    smtpHost: dbSettings?.smtpHost || process.env.SMTP_HOST || 'smtp.titan.email',
    smtpPort: dbSettings?.smtpPort || parseInt(process.env.SMTP_PORT || '465', 10),
    smtpSecure: (dbSettings?.smtpPort === 465) || process.env.SMTP_SECURE === 'true' || true,
    smtpUser: dbSettings?.smtpUser || process.env.SMTP_USER || 'info@corewalkers.com',
    smtpPass: dbSettings?.smtpPass || process.env.SMTP_PASS || '',
    reportRecipient: dbSettings?.reportRecipient || process.env.REPORT_RECIPIENT_EMAIL || 'info@corewalkers.com',
    reportBcc: dbSettings?.reportBcc || process.env.REPORT_BCC_EMAILS || '',
  };
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
  const lastDayOfMonth = new Date(year, monthIndex + 1, 0); // last day of month

  const daysInMonth: string[] = [];
  for (let d = 1; d <= lastDayOfMonth.getDate(); d++) {
    const dayStr = `${yyyyStr}-${String(monthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    daysInMonth.push(dayStr);
  }

  // Target end date string (either last day of that month, or today if month is current)
  const now = new Date();
  const todayStr = formatInTimeZone(now, TIMEZONE, 'yyyy-MM-dd');
  const monthEndStr = `${yyyyStr}-${String(monthIndex + 1).padStart(2, '0')}-${String(lastDayOfMonth.getDate()).padStart(2, '0')}`;
  const asOfDateStr = monthEndStr < todayStr ? monthEndStr : todayStr;

  const tab1Rows: any[] = [];
  const tab2Rows: any[] = [];

  for (const user of users) {
    const joinDateStr = formatInTimeZone(user.createdAt, TIMEZONE, 'yyyy-MM-dd');
    const joinMonthStr = formatInTimeZone(user.createdAt, TIMEZONE, 'yyyy-MM');

    // If employee joined after this month, skip them for this month's summary
    if (joinMonthStr > targetMonth) {
      continue;
    }

    const allRecords = user.attendanceRecords;
    const allPresentDates = new Set(allRecords.filter(r => r.status === 'PRESENT').map(r => r.date));

    // -------------------------------------------------------------
    // TAB 1: Specific Month Attendance (Present & Absent Count)
    // -------------------------------------------------------------
    const monthRecords = allRecords.filter(r => r.date.startsWith(targetMonth));
    const monthPresentDates = new Set(monthRecords.filter(r => r.status === 'PRESENT').map(r => r.date));

    let monthAbsentDays = 0;
    for (const dStr of daysInMonth) {
      if (dStr < joinDateStr) continue; // Not joined yet
      if (dStr > todayStr) continue; // Future day

      const dateObj = new Date(`${dStr}T12:00:00Z`);
      const isSaturday = getDay(dateObj) === 6;
      const isHoliday = holidayDates.has(dStr);
      const isPresent = monthPresentDates.has(dStr);

      if (!isSaturday && !isHoliday && !isPresent) {
        monthAbsentDays++;
      }
    }

    // Apply manual absent adjustment for this specific month
    let adjustmentsMap: Record<string, number> = {};
    try {
      adjustmentsMap = JSON.parse(user.absentAdjustments || '{}');
    } catch {
      adjustmentsMap = {};
    }
    const monthAbsentAdj = adjustmentsMap[targetMonth] || 0;
    const finalMonthAbsentDays = Math.max(0, monthAbsentDays + monthAbsentAdj);
    const finalMonthPresentDays = monthPresentDates.size + (user.attendanceAdjustment || 0);

    tab1Rows.push({
      'Employee ID': user.employeeId,
      'Employee Name': user.name,
      'Email': user.email,
      'Month': targetMonth,
      'Month Present Days': finalMonthPresentDays,
      'Month Absent Days': finalMonthAbsentDays,
      'Status': user.isActive ? 'Active' : 'Inactive',
    });

    // -------------------------------------------------------------
    // TAB 2: Overall All-Time Details from Start Date to Date
    // -------------------------------------------------------------
    let overallWorkingDays = 0;
    let overallAbsentDays = 0;

    // Loop day-by-day from user's join date to asOfDateStr
    let iterDate = toZonedTime(user.createdAt, TIMEZONE);
    let safetyCounter = 0;
    while (format(iterDate, 'yyyy-MM-dd') <= asOfDateStr && safetyCounter < 1500) {
      const dStr = format(iterDate, 'yyyy-MM-dd');
      const isSaturday = getDay(iterDate) === 6;
      const isHoliday = holidayDates.has(dStr);
      const isPresent = allPresentDates.has(dStr);

      if (!isSaturday && !isHoliday) {
        overallWorkingDays++;
        if (!isPresent) {
          overallAbsentDays++;
        }
      }

      iterDate = addDays(iterDate, 1);
      safetyCounter++;
    }

    // Add all-time absent adjustments
    const totalAbsentAdjustments = Object.values(adjustmentsMap).reduce((acc: number, val: any) => acc + (Number(val) || 0), 0);
    const finalOverallAbsentDays = Math.max(0, overallAbsentDays + totalAbsentAdjustments);
    const finalOverallPresentDays = allPresentDates.size + (user.attendanceAdjustment || 0);

    // Calculate all-time overall presence duration
    let overallPresenceMs = 0;
    const allDailyDurations: Record<string, number> = {};

    for (const r of allRecords) {
      if (r.date <= asOfDateStr && r.checkInTime && r.checkOutTime) {
        const inTime = new Date(r.checkInTime).getTime();
        const outTime = new Date(r.checkOutTime).getTime();
        const diff = outTime - inTime;
        if (diff > 0) {
          allDailyDurations[r.date] = (allDailyDurations[r.date] || 0) + diff;
          overallPresenceMs += diff;
        }
      }
    }

    const totalDaysWithPresence = Object.keys(allDailyDurations).length;
    const overallAvgPresenceMs = totalDaysWithPresence > 0 ? Math.round(overallPresenceMs / totalDaysWithPresence) : 0;
    const overallTotalHours = (overallPresenceMs / (1000 * 60 * 60)).toFixed(1);

    tab2Rows.push({
      'Employee ID': user.employeeId,
      'Employee Name': user.name,
      'Email': user.email,
      'Start Date (Join Date)': joinDateStr,
      'As of Date': asOfDateStr,
      'Overall Total Working Days': overallWorkingDays,
      'Overall Total Present Days': finalOverallPresentDays,
      'Overall Total Absent Days': finalOverallAbsentDays,
      'Overall Total Presence Time': formatDuration(overallPresenceMs),
      'Overall Total Presence (Hours)': parseFloat(overallTotalHours),
      'Overall Avg Daily Presence': formatDuration(overallAvgPresenceMs),
      'Status': user.isActive ? 'Active' : 'Inactive',
    });
  }

  return { tab1Rows, tab2Rows };
}

// Generate an Excel buffer containing both Tab 1 (Month) and Tab 2 (Overall All-Time)
export async function generateMonthlyExcelWorkbook(targetMonth: string): Promise<Buffer> {
  const { tab1Rows, tab2Rows } = await generateMonthlyData(targetMonth);

  const workbook = XLSX.utils.book_new();

  // Tab 1: Last Month Attendance Summary
  const ws1 = XLSX.utils.json_to_sheet(tab1Rows);
  ws1['!cols'] = [
    { wch: 15 }, // Employee ID
    { wch: 22 }, // Employee Name
    { wch: 30 }, // Email
    { wch: 12 }, // Month
    { wch: 20 }, // Month Present Days
    { wch: 20 }, // Month Absent Days
    { wch: 12 }, // Status
  ];
  XLSX.utils.book_append_sheet(workbook, ws1, 'Month Attendance');

  // Tab 2: Overall All-Time Details from Start
  const ws2 = XLSX.utils.json_to_sheet(tab2Rows);
  ws2['!cols'] = [
    { wch: 15 }, // Employee ID
    { wch: 22 }, // Employee Name
    { wch: 30 }, // Email
    { wch: 20 }, // Start Date (Join Date)
    { wch: 14 }, // As of Date
    { wch: 24 }, // Overall Total Working Days
    { wch: 24 }, // Overall Total Present Days
    { wch: 24 }, // Overall Total Absent Days
    { wch: 24 }, // Overall Total Presence Time
    { wch: 24 }, // Overall Total Presence (Hours)
    { wch: 24 }, // Overall Avg Daily Presence
    { wch: 12 }, // Status
  ];
  XLSX.utils.book_append_sheet(workbook, ws2, 'Overall All-Time to Date');

  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
  return buffer;
}

// Send Monthly Report by Email
export async function sendMonthlyReportEmail(targetMonth?: string, customRecipient?: string, customBcc?: string | string[]) {
  const config = await getEmailSettings();

  const monthToSend = targetMonth || formatInTimeZone(subMonths(new Date(), 1), TIMEZONE, 'yyyy-MM');
  const recipient = customRecipient || config.reportRecipient || config.smtpUser;

  if (!config.smtpUser || !config.smtpPass) {
    throw new Error('Sender email password is not configured yet. Please enter and save your password in Admin Settings.');
  }

  if (!recipient) {
    throw new Error('No recipient email specified. Please set a recipient in Admin Settings.');
  }

  // Parse BCC: from customBcc or saved reportBcc
  let bccList: string | string[] | undefined = customBcc || config.reportBcc;
  if (typeof bccList === 'string' && bccList.trim()) {
    bccList = bccList.split(/[,;]/).map(e => e.trim()).filter(Boolean);
  }

  console.log(`[Monthly Report] Generating report for month: ${monthToSend}...`);
  const excelBuffer = await generateMonthlyExcelWorkbook(monthToSend);

  const transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass,
    },
  });

  const filename = `Attendance_Report_${monthToSend}.xlsx`;

  console.log(`[Monthly Report] Sending email from ${config.smtpUser} to ${recipient} (BCC: ${Array.isArray(bccList) ? bccList.join(', ') : 'none'})...`);
  const mailOptions: SendMailOptions = {
    from: `"Core Walkers Office Tracker" <${config.smtpUser}>`,
    to: recipient,
    subject: `Monthly Attendance & Overall Presence Report - ${monthToSend}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #0f172a;">Core Walkers Monthly & Overall Attendance Report</h2>
        <p>Hello,</p>
        <p>Please find attached the official attendance report for <strong>${monthToSend}</strong> with complete overall historical tracking.</p>
        <div style="background-color: #f8fafc; border-left: 4px solid #10b981; padding: 12px; margin: 16px 0;">
          <strong>Attached Excel Workbook Structure:</strong>
          <ul>
            <li><strong>Tab 1 (Month Attendance):</strong> Total present days count and absent days count for every employee for ${monthToSend}.</li>
            <li><strong>Tab 2 (Overall All-Time to Date):</strong> Complete attendance from start/join date to date, including overall working days, all-time present days, all-time absent days, total presence hours, and daily average time.</li>
          </ul>
        </div>
        <p style="font-size: 0.9em; color: #64748b;">Generated automatically by Core Walkers Office Tracker.</p>
      </div>
    `,
    attachments: [
      {
        filename,
        content: excelBuffer,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    ],
  };

  if (bccList && (Array.isArray(bccList) ? bccList.length > 0 : true)) {
    mailOptions.bcc = bccList;
  }

  const info = await transporter.sendMail(mailOptions);

  console.log(`[Monthly Report] Successfully sent to ${recipient}: ${info.messageId}`);
  return { success: true, messageId: info.messageId, recipient, bcc: bccList, month: monthToSend };
}
