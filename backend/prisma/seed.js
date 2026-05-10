"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
const prisma = new client_1.PrismaClient();
async function main() {
    const passwordHash = await bcrypt_1.default.hash('admin123', 10);
    const admin = await prisma.user.upsert({
        where: { email: 'admin@officetrack.com' },
        update: {},
        create: {
            email: 'admin@officetrack.com',
            name: 'Super Admin',
            role: 'ADMIN',
            employeeId: 'ADMIN-001',
            passwordHash,
        },
    });
    // Ensure default settings exist
    const settings = await prisma.settings.findFirst();
    if (!settings) {
        await prisma.settings.create({
            data: {
                officeLat: 27.7172,
                officeLng: 85.3240,
                allowedRadius: 100,
                qrCodePayload: 'officetrack-auth-123'
            }
        });
    }
    console.log({ admin });
}
main()
    .then(async () => {
    await prisma.$disconnect();
})
    .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
});
//# sourceMappingURL=seed.js.map