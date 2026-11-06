import { prisma } from '../db';
import * as XLSX from 'xlsx';
import nodemailer, { SendMailOptions, Transporter } from 'nodemailer';
import { format, subMonths, getDay, addDays } from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

const TIMEZONE = 'Asia/Kathmandu';
const PAID_LEAVE_DAYS = 2; // Number of paid leave days per month, consistent with leaderboard.ts

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
  const port = dbSettings?.smtpPort || parseInt(process.env.SMTP_PORT || '587', 10);
  return {
    smtpHost: dbSettings?.smtpHost || process.env.SMTP_HOST || 'smtp.titan.email',
    smtpPort: port,
    smtpSecure: port === 465, // ONLY port 465 uses SSL direct; port 587 uses STARTTLS
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

  // Determine all days in the target month (e.g. 2026-10-01 to 2026-10-31)
  const [yyyyStr, mmStr] = targetMonth.split('-');
  const year = parseInt(yyyyStr, 10);
  const monthIndex = parseInt(mmStr, 10) - 1; // 0-indexed
  const monthStart = new Date(year, monthIndex, 1);
  const monthEnd = new Date(year, monthIndex + 1, 0); // last day of month

  const now = new Date();
  const todayStr = formatInTimeZone(now, TIMEZONE, 'yyyy-MM-dd');
  const nowZonedDate = toZonedTime(now, TIMEZONE);
  const todayDateOnly = new Date(nowZonedDate.getFullYear(), nowZonedDate.getMonth(), nowZonedDate.getDate());

  const monthEndStr = `${yyyyStr}-${String(monthIndex + 1).padStart(2, '0')}-${String(monthEnd.getDate()).padStart(2, '0')}`;
  const asOfDateStr = monthEndStr < todayStr ? monthEndStr : todayStr;

  const tab1Rows: any[] = [];
  const tab2Rows: any[] = [];

  for (const user of users) {
    const joinZonedDate = toZonedTime(user.createdAt, TIMEZONE);
    const joinDateOnly = new Date(joinZonedDate.getFullYear(), joinZonedDate.getMonth(), joinZonedDate.getDate());
    const joinDateStr = formatInTimeZone(user.createdAt, TIMEZONE, 'yyyy-MM-dd');
    const joinMonthStr = formatInTimeZone(user.createdAt, TIMEZONE, 'yyyy-MM');

    // If employee joined after this month, skip them for this month's summary
    if (joinMonthStr > targetMonth) {
      continue;
    }

    const allRecords = user.attendanceRecords || [];
    const allPresentDates = new Set(allRecords.filter((r: any) => r.status === 'PRESENT').map((r: any) => r.date));

    // Parse absent adjustments
    let adjustmentsMap: Record<string, number> = {};
    try {
      adjustmentsMap = JSON.parse(user.absentAdjustments || '{}');
    } catch {
      adjustmentsMap = {};
    }

    // -------------------------------------------------------------
    // TAB 1: Specific Month Attendance (Salary Count & Absent Count)
    // Formula identical to backend/src/routes/leaderboard.ts
    // -------------------------------------------------------------
    const monthRecords = allRecords.filter((r: any) => r.date.startsWith(targetMonth));
    const monthPresentDates = new Set(monthRecords.filter((r: any) => r.status === 'PRESENT').map((r: any) => r.date));

    // Count unexcused absent days in target month
    let unexcusedMonthAbsent = 0;
    const lastDayNum = monthEnd.getDate();
    for (let d = 1; d <= lastDayNum; d++) {
      const dStr = `${yyyyStr}-${String(monthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      if (dStr < joinDateStr) continue; // Before employee joined
      if (dStr > todayStr) continue; // Future date

      const dateObj = new Date(`${dStr}T12:00:00Z`);
      const isSat = getDay(dateObj) === 6;
      const isHolid = holidayDates.has(dStr);
      const isPresent = monthPresentDates.has(dStr);

      if (!isSat && !isHolid && !isPresent) {
        unexcusedMonthAbsent++;
      }
    }

    const manualMonthAbsentAdj = adjustmentsMap[targetMonth] || 0;
    const totalAbsentForMonth = Math.max(0, unexcusedMonthAbsent + manualMonthAbsentAdj);

    // Calculate Salary Count (Payable Present Count) for target month
    const actualStart = monthStart > joinDateOnly ? monthStart : joinDateOnly;
    const actualEnd = monthEnd < todayDateOnly ? monthEnd : todayDateOnly;

    let salaryCount = 0;
    if (actualStart <= actualEnd) {
      const diffTime = actualEnd.getTime() - actualStart.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
      const billableAbsences = Math.max(0, totalAbsentForMonth - PAID_LEAVE_DAYS);
      salaryCount = Math.max(0, diffDays - billableAbsences);
    }

    const physicalPresentDays = monthPresentDates.size + (user.attendanceAdjustment || 0);

    tab1Rows.push({
      'Employee ID': user.employeeId,
      'Employee Name': user.name,
      'Email': user.email,
      'Month': targetMonth,
      'Total Salary / Present Count': salaryCount,
      'Total Absent Count': totalAbsentForMonth,
      'Physical Present Count': physicalPresentDays,
      'Status': user.isActive ? 'Active' : 'Inactive',
    });

    // -------------------------------------------------------------
    // TAB 2: Overall All-Time Details from Start Date to Date
    // -------------------------------------------------------------
    let overallWorkingDays = 0;
    let overallUnexcusedAbsent = 0;

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
          overallUnexcusedAbsent++;
        }
      }

      iterDate = addDays(iterDate, 1);
      safetyCounter++;
    }

    const totalAbsentAdjustments = Object.values(adjustmentsMap).reduce((acc: number, val: any) => acc + (Number(val) || 0), 0);
    const finalOverallAbsentDays = Math.max(0, overallUnexcusedAbsent + totalAbsentAdjustments);
    const finalOverallPresentDays = allPresentDates.size + (user.attendanceAdjustment || 0);

    // Calculate all-time presence duration
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

// Generate an Excel buffer containing Tab 1 (Month) and Tab 2 (Overall)
export async function generateMonthlyExcelWorkbook(targetMonth: string): Promise<Buffer> {
  const { tab1Rows, tab2Rows } = await generateMonthlyData(targetMonth);

  const workbook = XLSX.utils.book_new();

  // Tab 1: Month Attendance Summary (Salary / Present Count)
  const ws1 = XLSX.utils.json_to_sheet(tab1Rows);
  ws1['!cols'] = [
    { wch: 15 }, // Employee ID
    { wch: 22 }, // Employee Name
    { wch: 30 }, // Email
    { wch: 12 }, // Month
    { wch: 28 }, // Total Salary / Present Count
    { wch: 20 }, // Total Absent Count
    { wch: 22 }, // Physical Present Count
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

// Helper to create transport with specific port
function createTransportForPort(config: any, port: number) {
  const isSecure = port === 465;
  return nodemailer.createTransport({
    host: config.smtpHost,
    port: port,
    secure: isSecure,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass,
    },
    connectionTimeout: 12000, // 12 seconds timeout
    greetingTimeout: 12000,
    socketTimeout: 20000,
    tls: {
      rejectUnauthorized: false,
    },
  });
}

// Send Monthly Report by Email with auto-fallback between port 587 and port 465
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

  let bccList: string | string[] | undefined = customBcc || config.reportBcc;
  if (typeof bccList === 'string' && bccList.trim()) {
    bccList = bccList.split(/[,;]/).map(e => e.trim()).filter(Boolean);
  }

  console.log(`[Monthly Report] Generating Excel workbook for month: ${monthToSend}...`);
  const excelBuffer = await generateMonthlyExcelWorkbook(monthToSend);

  const filename = `Attendance_Report_${monthToSend}.xlsx`;

  const mailOptions: SendMailOptions = {
    from: `"Core Walkers Office Tracker" <${config.smtpUser}>`,
    to: recipient,
    subject: `Monthly Attendance & Overall Presence Report - ${monthToSend}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #0f172a;">Core Walkers Monthly Attendance & Overall Report</h2>
        <p>Hello,</p>
        <p>Please find attached the official attendance report for <strong>${monthToSend}</strong> with complete overall historical tracking.</p>
        <div style="background-color: #f8fafc; border-left: 4px solid #10b981; padding: 12px; margin: 16px 0;">
          <strong>Attached Excel Workbook Structure:</strong>
          <ul>
            <li><strong>Tab 1 (Month Attendance):</strong> Total Salary / Present Count (including paid leave) and Absent Count for ${monthToSend}.</li>
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

  // Primary port to try (from config or default 587)
  const primaryPort = Number(config.smtpPort) || 587;
  // Alternative fallback port if primary times out or fails connection
  const fallbackPort = primaryPort === 465 ? 587 : 465;

  console.log(`[Monthly Report] Attempting to send email via ${config.smtpHost}:${primaryPort} (secure: ${primaryPort === 465})...`);

  try {
    const transporter = createTransportForPort(config, primaryPort);
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Monthly Report] Successfully sent via port ${primaryPort}: ${info.messageId}`);
    return { success: true, messageId: info.messageId, recipient, bcc: bccList, month: monthToSend, portUsed: primaryPort };
  } catch (primaryErr: any) {
    console.warn(`[Monthly Report] Sending via port ${primaryPort} failed (${primaryErr.message}). Retrying via fallback port ${fallbackPort}...`);
    try {
      const fallbackTransporter = createTransportForPort(config, fallbackPort);
      const fallbackInfo = await fallbackTransporter.sendMail(mailOptions);
      console.log(`[Monthly Report] Successfully sent via fallback port ${fallbackPort}: ${fallbackInfo.messageId}`);
      return { success: true, messageId: fallbackInfo.messageId, recipient, bcc: bccList, month: monthToSend, portUsed: fallbackPort };
    } catch (fallbackErr: any) {
      console.error(`[Monthly Report] Both ports ${primaryPort} and ${fallbackPort} failed:`, fallbackErr);
      throw new Error(`Failed to send email on ports ${primaryPort} & ${fallbackPort}. Reason: ${fallbackErr.message || primaryErr.message}`);
    }
  }
}
