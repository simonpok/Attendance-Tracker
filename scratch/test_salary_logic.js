const { format, addDays, getDay } = require('date-fns');
const { toZonedTime, formatInTimeZone } = require('date-fns-tz');

const TIMEZONE = 'Asia/Kathmandu';

function calculateSalaryCount(user, holidayDates) {
    let salaryCount = 0;
    const now = new Date();
    const todayStr = formatInTimeZone(now, TIMEZONE, 'yyyy-MM-dd');
    
    const presentDates = new Set(user.attendanceRecords.filter(r => r.status === 'PRESENT').map(r => r.date));
    const startDate = toZonedTime(user.createdAt, TIMEZONE);
    let iterDate = startDate;
    
    let safetyCounter = 0;
    while (format(iterDate, 'yyyy-MM-dd') <= todayStr && safetyCounter < 1000) {
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
    return salaryCount;
}

// Mock Data
const holidayDates = new Set(['2026-05-10']); // Suppose May 10 was a holiday
const mockUser = {
    createdAt: new Date('2026-05-01T00:00:00Z'),
    attendanceAdjustment: 2,
    attendanceRecords: [
        { date: '2026-05-04', status: 'PRESENT' },
        { date: '2026-05-05', status: 'PRESENT' }
    ]
};

// Current Date for testing: 2026-05-12
// Days from May 1 to May 12:
// 01 Thu - no checkin
// 02 Fri - no checkin
// 03 Sat - no checkin -> +1 (Sat)
// 04 Sun - PRESENT -> +1
// 05 Mon - PRESENT -> +1
// 06 Tue - no checkin
// 07 Wed - no checkin
// 08 Thu - no checkin
// 09 Fri - no checkin
// 10 Sat - Holiday & Sat -> +1 (Sat/Holiday)
// 11 Sun - no checkin
// 12 Mon (today) - no checkin -> 0 (not past yet)
// Base: 1 (Sat) + 1 (PRESENT) + 1 (PRESENT) + 1 (Sat/Holiday) = 4
// Adjustment: +2
// Total: 6

console.log('Calculating salary count...');
const result = calculateSalaryCount(mockUser, holidayDates);
console.log('Result:', result);
if (result === 6) {
    console.log('SUCCESS: Logic works as expected.');
} else {
    console.log('FAILURE: Expected 6, got', result);
}
