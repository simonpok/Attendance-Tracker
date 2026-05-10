"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcrypt_1 = __importDefault(require("bcrypt"));
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate, auth_1.requireAdmin);
// === EMPLOYEE MANAGEMENT ===
router.get('/employees', async (req, res) => {
    try {
        const employees = await db_1.prisma.user.findMany({
            where: { role: 'EMPLOYEE' },
            select: { id: true, name: true, employeeId: true, email: true, phone: true, isActive: true, createdAt: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(employees);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch employees' });
    }
});
router.post('/employees', async (req, res) => {
    try {
        const { name, employeeId, email, password, phone } = req.body;
        const existing = await db_1.prisma.user.findFirst({
            where: { OR: [{ email }, { employeeId }] }
        });
        if (existing) {
            return res.status(400).json({ error: 'Email or Employee ID already exists' });
        }
        const passwordHash = await bcrypt_1.default.hash(password, 10);
        const newEmployee = await db_1.prisma.user.create({
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
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create employee' });
    }
});
router.put('/employees/:id/status', async (req, res) => {
    try {
        const { isActive } = req.body;
        const updated = await db_1.prisma.user.update({
            where: { id: req.params.id },
            data: { isActive },
            select: { id: true, name: true, isActive: true }
        });
        res.json(updated);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update employee status' });
    }
});
router.delete('/employees/:id', async (req, res) => {
    try {
        await db_1.prisma.user.delete({
            where: { id: req.params.id }
        });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete employee' });
    }
});
// === SETTINGS ===
router.get('/settings', async (req, res) => {
    try {
        const settings = await db_1.prisma.settings.findFirst();
        res.json(settings);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});
router.put('/settings', async (req, res) => {
    try {
        const { officeLat, officeLng, allowedRadius, qrCodePayload } = req.body;
        const settings = await db_1.prisma.settings.findFirst();
        if (!settings)
            return res.status(404).json({ error: 'Settings not found' });
        const updated = await db_1.prisma.settings.update({
            where: { id: settings.id },
            data: { officeLat, officeLng, allowedRadius, qrCodePayload }
        });
        res.json(updated);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update settings' });
    }
});
// === HOLIDAYS ===
router.get('/holidays', async (req, res) => {
    try {
        const holidays = await db_1.prisma.holiday.findMany({ orderBy: { date: 'asc' } });
        res.json(holidays);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch holidays' });
    }
});
router.post('/holidays', async (req, res) => {
    try {
        const { date, name } = req.body;
        const holiday = await db_1.prisma.holiday.create({ data: { date, name } });
        res.json(holiday);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create holiday' });
    }
});
router.delete('/holidays/:id', async (req, res) => {
    try {
        await db_1.prisma.holiday.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete holiday' });
    }
});
// === RECORDS ===
router.get('/records', async (req, res) => {
    try {
        const records = await db_1.prisma.attendanceRecord.findMany({
            include: { user: { select: { id: true, name: true, employeeId: true } } },
            orderBy: { date: 'desc' },
            take: 100 // Limit for simplicity
        });
        res.json(records);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch records' });
    }
});
exports.default = router;
//# sourceMappingURL=admin.js.map