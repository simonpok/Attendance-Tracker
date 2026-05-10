"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const date_fns_1 = require("date-fns");
const date_fns_tz_1 = require("date-fns-tz");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/holidays', async (req, res) => {
    try {
        const holidays = await db_1.prisma.holiday.findMany({ orderBy: { date: 'asc' } });
        res.json(holidays);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch holidays' });
    }
});
const TIMEZONE = 'Asia/Kathmandu';
const getTodayDateString = () => {
    const now = new Date();
    const zonedTime = (0, date_fns_tz_1.toZonedTime)(now, TIMEZONE);
    return (0, date_fns_1.format)(zonedTime, 'yyyy-MM-dd');
};
const getYesterdayDateString = () => {
    const now = new Date();
    const zonedTime = (0, date_fns_tz_1.toZonedTime)(now, TIMEZONE);
    return (0, date_fns_1.format)((0, date_fns_1.addDays)(zonedTime, -1), 'yyyy-MM-dd');
};
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};
// Validates Location and QR Code
const validateCheckIn = async (lat, lng, qrPayload) => {
    const settings = await db_1.prisma.settings.findFirst();
    if (!settings)
        throw new Error('Settings not found');
    if (qrPayload !== settings.qrCodePayload) {
        throw new Error('Invalid QR Code');
    }
    const distance = calculateDistance(lat, lng, settings.officeLat, settings.officeLng);
    if (distance > settings.allowedRadius) {
        throw new Error(`You must be within ${settings.allowedRadius} meters of the office. (Distance: ${Math.round(distance)}m)`);
    }
};
router.post('/check-in', async (req, res) => {
    try {
        const { lat, lng, qrPayload } = req.body;
        await validateCheckIn(lat, lng, qrPayload);
        const dateStr = getTodayDateString();
        // Find if there's an active session
        const latestRecord = await db_1.prisma.attendanceRecord.findFirst({
            where: {
                userId: req.user.userId,
                date: dateStr
            },
            orderBy: { createdAt: 'desc' }
        });
        if (latestRecord && !latestRecord.checkOutTime) {
            return res.status(400).json({ error: 'Already checked in today' });
        }
        // Count sessions for today to determine session number
        const sessionCount = await db_1.prisma.attendanceRecord.count({
            where: {
                userId: req.user.userId,
                date: dateStr
            }
        });
        const record = await db_1.prisma.attendanceRecord.create({
            data: {
                userId: req.user.userId,
                date: dateStr,
                checkInTime: new Date(),
                status: 'PRESENT',
                sessionNumber: sessionCount + 1
            }
        });
        res.json(record);
    }
    catch (error) {
        res.status(400).json({ error: error.message || 'Check-in failed' });
    }
});
router.post('/check-out', async (req, res) => {
    try {
        const { lat, lng, qrPayload } = req.body;
        await validateCheckIn(lat, lng, qrPayload);
        const dateStr = getTodayDateString();
        const latestRecord = await db_1.prisma.attendanceRecord.findFirst({
            where: {
                userId: req.user.userId,
                date: dateStr
            },
            orderBy: { createdAt: 'desc' }
        });
        if (!latestRecord || latestRecord.checkOutTime) {
            return res.status(400).json({ error: 'Cannot check out without checking in first' });
        }
        const record = await db_1.prisma.attendanceRecord.update({
            where: { id: latestRecord.id },
            data: { checkOutTime: new Date() }
        });
        res.json(record);
    }
    catch (error) {
        res.status(400).json({ error: error.message || 'Check-out failed' });
    }
});
router.post('/manual-check-out', async (req, res) => {
    try {
        const { date, time } = req.body; // time is HH:mm string
        const targetDateStr = date || getYesterdayDateString();
        const record = await db_1.prisma.attendanceRecord.findFirst({
            where: { userId: req.user.userId, date: targetDateStr },
            orderBy: { createdAt: 'desc' }
        });
        if (!record || !record.checkInTime) {
            return res.status(400).json({ error: 'No check-in record found for that date' });
        }
        // Parse the date and time strings into a Date object in the correct timezone
        // Simplified logic for local demonstration
        const checkOutTime = new Date(`${targetDateStr}T${time}:00`);
        const updated = await db_1.prisma.attendanceRecord.update({
            where: { id: record.id },
            data: {
                checkOutTime,
                isManualCheckout: true
            }
        });
        res.json(updated);
    }
    catch (error) {
        res.status(500).json({ error: 'Manual check-out failed' });
    }
});
router.get('/me', async (req, res) => {
    try {
        const records = await db_1.prisma.attendanceRecord.findMany({
            where: { userId: req.user.userId },
            orderBy: [
                { date: 'desc' },
                { createdAt: 'desc' }
            ]
        });
        // Calculate Enhanced Stats
        const holidays = await db_1.prisma.holiday.findMany();
        const holidayDates = new Set(holidays.map(h => h.date));
        // Get all unique dates where user was present
        const presentDates = new Set(records.filter(r => r.status === 'PRESENT').map(r => r.date));
        const totalPresent = presentDates.size;
        let totalAbsent = 0;
        let currentStreak = 0;
        if (records.length > 0) {
            // Find the first-ever record date to start counting absence
            // Records are sorted [date desc, createdAt desc], so the last one is the earliest
            const firstRecord = records[records.length - 1];
            const firstDate = new Date(firstRecord.date);
            const todayStr = getTodayDateString();
            const todayDate = new Date(todayStr);
            // 1. Calculate Absence (from firstDate to yesterday)
            let curr = new Date(firstDate);
            const yesterdayDate = (0, date_fns_1.addDays)(todayDate, -1);
            while (curr <= yesterdayDate) {
                const dStr = (0, date_fns_1.format)(curr, 'yyyy-MM-dd');
                const isSat = (0, date_fns_1.getDay)(curr) === 6;
                const isHolid = holidayDates.has(dStr);
                if (!isSat && !isHolid && !presentDates.has(dStr)) {
                    totalAbsent++;
                }
                curr = (0, date_fns_1.addDays)(curr, 1);
            }
            // 2. Calculate Streak (backwards from today)
            let now = new Date();
            // Re-calculate todayStr to ensure perfect sync with 'now'
            const todayStrStreak = (0, date_fns_tz_1.formatInTimeZone)(now, TIMEZONE, 'yyyy-MM-dd');
            let checkDate = now;
            for (let i = 0; i < 365; i++) {
                const dStr = (0, date_fns_tz_1.formatInTimeZone)(checkDate, TIMEZONE, 'yyyy-MM-dd');
                const zonedCheckDate = (0, date_fns_tz_1.toZonedTime)(checkDate, TIMEZONE);
                const isSat = (0, date_fns_1.getDay)(zonedCheckDate) === 6;
                const isHolid = holidayDates.has(dStr);
                const isPresent = presentDates.has(dStr);
                if (isPresent) {
                    currentStreak++;
                }
                else if (isSat || isHolid) {
                    // Skip
                }
                else if (dStr !== todayStrStreak) {
                    break;
                }
                checkDate = (0, date_fns_1.addDays)(checkDate, -1);
                if ((0, date_fns_tz_1.formatInTimeZone)(checkDate, TIMEZONE, 'yyyy-MM-dd') < (0, date_fns_1.format)((0, date_fns_1.addDays)(firstDate, -7), 'yyyy-MM-dd'))
                    break;
            }
        }
        // Check for today's record (latest)
        const todayStr = getTodayDateString();
        const todayRecord = records.find(r => r.date === todayStr); // records is sorted by date desc, but within same date it's by id/created desc? 
        // Wait, the query was orderBy: { date: 'desc' }. I should add createdAt desc.
        console.log('Attendance debug:', {
            todayStr,
            foundRecord: !!todayRecord,
            allDates: records.map(r => r.date).slice(0, 5)
        });
        // Check for missed checkout yesterday
        const yesterdayStr = getYesterdayDateString();
        const yesterdayRecord = records.find(r => r.date === yesterdayStr);
        const missedCheckout = yesterdayRecord && yesterdayRecord.checkInTime && !yesterdayRecord.checkOutTime;
        res.json({
            totalPresent,
            totalAbsent,
            currentStreak,
            missedCheckout: missedCheckout ? yesterdayRecord : null,
            todayRecord,
            recentRecords: records.slice(0, 10) // Only send 10 recent
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch personal stats' });
    }
});
exports.default = router;
//# sourceMappingURL=attendance.js.map