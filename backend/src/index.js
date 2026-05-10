"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_1 = __importDefault(require("./routes/auth"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
if (!process.env.JWT_SECRET) {
    console.warn('WARNING: JWT_SECRET is not set. Using a temporary secret for now, but this will invalidate sessions on restart.');
    process.env.JWT_SECRET = 'temporary-emergency-secret-123';
}
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Request logging middleware
app.use((req, res, next) => {
    console.log(`[Request] ${req.method} ${req.path}`);
    next();
});
app.use('/api/auth', auth_1.default);
const admin_1 = __importDefault(require("./routes/admin"));
app.use('/api/admin', admin_1.default);
const attendance_1 = __importDefault(require("./routes/attendance"));
app.use('/api/attendance', attendance_1.default);
const leaderboard_1 = __importDefault(require("./routes/leaderboard"));
app.use('/api/leaderboards', leaderboard_1.default);
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});
// Serve Frontend
const frontendPath = path_1.default.join(__dirname, '../../frontend/dist');
console.log(`[Diagnostic] Frontend path: ${frontendPath}`);
const fs_1 = __importDefault(require("fs"));
if (fs_1.default.existsSync(frontendPath)) {
    console.log(`[Diagnostic] Frontend directory exists.`);
    if (fs_1.default.existsSync(path_1.default.join(frontendPath, 'index.html'))) {
        console.log(`[Diagnostic] index.html exists.`);
    }
    else {
        console.warn(`[Diagnostic] index.html NOT found in ${frontendPath}`);
    }
}
else {
    console.warn(`[Diagnostic] Frontend directory NOT found at ${frontendPath}`);
}
app.use(express_1.default.static(frontendPath));
app.use((req, res, next) => {
    if (req.method !== 'GET')
        return next();
    if (req.path.startsWith('/api'))
        return res.status(404).json({ error: 'API route not found' });
    const indexPath = path_1.default.join(frontendPath, 'index.html');
    if (fs_1.default.existsSync(indexPath)) {
        res.sendFile(indexPath);
    }
    else {
        res.status(404).send('Frontend not built. Please check deployment logs.');
    }
});
app.listen(Number(PORT), '0.0.0.0', async () => {
    console.log(`Server is running on port ${PORT} (0.0.0.0)`);
    try {
        const { prisma } = await import('./db');
        await prisma.$connect();
        console.log('Database connected successfully');
    }
    catch (err) {
        console.error('Database connection failed:', err);
    }
});
//# sourceMappingURL=index.js.map