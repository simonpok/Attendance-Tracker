"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret123';
router.post('/login', async (req, res) => {
    try {
        const { email, password, role } = req.body;
        const user = await db_1.prisma.user.findUnique({
            where: { email },
        });
        if (!user || !user.isActive) {
            return res.status(401).json({ error: 'Invalid credentials or inactive account' });
        }
        if (user.role !== role) {
            return res.status(401).json({ error: 'Role mismatch' });
        }
        const isValidPassword = await bcrypt_1.default.compare(password, user.passwordHash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const token = jsonwebtoken_1.default.sign({ userId: user.id, role: user.role }, JWT_SECRET, {
            expiresIn: '7d',
        });
        res.json({ token, user: { id: user.id, name: user.name, role: user.role, email: user.email } });
    }
    catch (error) {
        console.error('Login error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/me', auth_1.authenticate, async (req, res) => {
    try {
        const user = await db_1.prisma.user.findUnique({
            where: { id: req.user?.userId },
            select: { id: true, name: true, role: true, email: true, employeeId: true }
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map