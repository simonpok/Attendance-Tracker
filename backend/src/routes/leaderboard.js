"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const date_fns_1 = require("date-fns");
const date_fns_tz_1 = require("date-fns-tz");
const TIMEZONE = 'Asia/Kathmandu'; // Consistent with attendance routes
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/', async (req, res) => {
    try {
        const users = await db_1.prisma.user.findMany({
            where: { role: 'EMPLOYEE' },
            select: { id: true, name: true, attendanceRecords: true }
        });
        const holidays = await db_1.prisma.holiday.findMany();
        const holidayDates = new Set(holidays.map(h => h.date));
        const leaderboard = users.map(user => {
            const records = user.attendanceRecords;
            const presentDates = new Set(records.filter(r => r.status === 'PRESENT').map(r => r.date));
            const totalPresent = presentDates.size;
            let currentStreak = 0;
            if (records.length > 0) {
                // Find first record date
                const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
                const firstDate = new Date(sorted[0].date);
                // Use a consistent "today"
                const now = new Date();
                const todayStr = (0, date_fns_tz_1.formatInTimeZone)(now, TIMEZONE, 'yyyy-MM-dd');
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
                    else if (dStr !== todayStr) {
                        break;
                    }
                    checkDate = (0, date_fns_1.addDays)(checkDate, -1);
                    if ((0, date_fns_tz_1.formatInTimeZone)(checkDate, TIMEZONE, 'yyyy-MM-dd') < (0, date_fns_1.format)((0, date_fns_1.addDays)(firstDate, -7), 'yyyy-MM-dd'))
                        break;
                }
            }
            return {
                id: user.id,
                name: user.name,
                totalPresent,
                currentStreak
            };
        });
        // Sort by Highest Attendance
        const highestAttendance = [...leaderboard].sort((a, b) => b.totalPresent - a.totalPresent).slice(0, 10);
        // Sort by Highest Streak
        const highestStreak = [...leaderboard].sort((a, b) => b.currentStreak - a.currentStreak).slice(0, 10);
        const userId = req.user.userId;
        const myStats = leaderboard.find(u => u.id === userId) || null;
        res.json({ highestAttendance, highestStreak, myStats });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});
exports.default = router;
//# sourceMappingURL=leaderboard.js.map