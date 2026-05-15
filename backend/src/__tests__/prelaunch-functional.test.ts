const mockPrisma = {
  user: {
    findUnique: jest.fn(),
  },
  ticket: {
    count: jest.fn(),
    findMany: jest.fn(),
  },
  notification: {
    create: jest.fn(),
  },
};

const mockSocketEmit = jest.fn();
const mockSocketTo = jest.fn(() => ({ emit: mockSocketEmit }));

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma),
}));

jest.mock('../lib/socket', () => ({
  getIO: () => ({
    to: mockSocketTo,
  }),
}));

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
}));

jest.mock('../services/auditService', () => ({
  log: jest.fn(),
}));

jest.mock('../utils/ticketNumber', () => ({
  generateTicketNumber: jest.fn(),
}));

jest.mock('../utils/fileNaming', () => ({
  generateUniqueFilename: jest.fn(),
}));

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { login } from '../services/authService';
import { listForBidtekkom } from '../services/ticketService';
import { exportPDF, exportExcel } from '../services/reportService';
import { create as createNotification } from '../services/notificationService';

describe('pre-launch functional verification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('blocks login for soft-deleted users', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      nama: 'Satker One',
      email: 'satker@example.com',
      role: 'SATKER',
      password: 'hashed-password',
      deletedAt: new Date('2026-05-15T00:00:00.000Z'),
    });

    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    await expect(
      login({
        email: 'satker@example.com',
        password: 'Password123',
      })
    ).rejects.toMatchObject({
      statusCode: 401,
      code: 'ACCOUNT_INACTIVE',
    });

    expect(jwt.sign).not.toHaveBeenCalled();
  });

  it('applies search filters with pagination for cross-page ticket listing', async () => {
    mockPrisma.ticket.count.mockResolvedValue(41);
    mockPrisma.ticket.findMany.mockResolvedValue([]);

    await listForBidtekkom(
      { page: 2, pageSize: 20 },
      { search: 'Printer', status: 'PENDING' }
    );

    expect(mockPrisma.ticket.count).toHaveBeenCalledWith({
      where: {
        status: 'PENDING',
        OR: [
          { judul: { contains: 'Printer' } },
          { nomorTiket: { contains: 'Printer' } },
        ],
      },
    });

    expect(mockPrisma.ticket.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: 'PENDING',
          OR: [
            { judul: { contains: 'Printer' } },
            { nomorTiket: { contains: 'Printer' } },
          ],
        },
        skip: 20,
        take: 20,
      })
    );
  });

  it('exports monthly report to PDF and Excel buffers', async () => {
    mockPrisma.ticket.findMany.mockResolvedValue([
      {
        nomorTiket: 'TIK-2026-0001',
        judul: 'Printer Error',
        divisiSatker: 'SDM',
        lokasi: 'Gedung A',
        tanggalBuat: new Date('2026-05-01T08:00:00.000Z'),
        tanggalAssign: new Date('2026-05-01T09:00:00.000Z'),
        tanggalSelesai: new Date('2026-05-02T12:00:00.000Z'),
        status: 'SELESAI',
        creator: { nama: 'Satker One' },
        rating: { bintang: 5, feedback: 'Sangat cepat' },
      },
    ]);

    const pdf = await exportPDF({ month: 5, year: 2026 });
    const excel = await exportExcel({ month: 5, year: 2026 });

    expect(pdf.length).toBeGreaterThan(100);
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');

    expect(excel.length).toBeGreaterThan(100);
    expect(excel.subarray(0, 2).toString()).toBe('PK');
  });

  it('emits realtime notification payload to the user room', async () => {
    const createdAt = new Date('2026-05-15T10:00:00.000Z');
    mockPrisma.notification.create.mockResolvedValue({
      id: 'notif-1',
      type: 'TICKET_COMPLETED',
      ticketNumber: 'TIK-2026-0001',
      message: 'Tiket telah selesai',
      isRead: false,
      createdAt,
    });

    const result = await createNotification({
      userId: 'user-1',
      type: 'TICKET_COMPLETED',
      ticketNumber: 'TIK-2026-0001',
      message: 'Tiket telah selesai',
    });

    expect(mockSocketTo).toHaveBeenCalledWith('user_user-1');
    expect(mockSocketEmit).toHaveBeenCalledWith(
      'notification',
      expect.objectContaining({
        id: 'notif-1',
        type: 'TICKET_COMPLETED',
        ticketNumber: 'TIK-2026-0001',
      })
    );
    expect(result.id).toBe('notif-1');
  });
});
