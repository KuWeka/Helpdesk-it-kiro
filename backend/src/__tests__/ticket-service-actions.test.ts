import { AppError } from '../utils/AppError';

// Mock PrismaClient
const mockPrisma = {
  ticket: {
    findUnique: jest.fn(),
    updateMany: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma),
}));

jest.mock('../utils/ticketNumber', () => ({
  generateTicketNumber: jest.fn(),
}));

jest.mock('../utils/fileNaming', () => ({
  generateUniqueFilename: jest.fn(),
}));

// Mock auditService
const mockAuditLog = jest.fn().mockResolvedValue(undefined);
jest.mock('../services/auditService', () => ({
  log: (...args: any[]) => mockAuditLog(...args),
}));

import { assignToPadal, markComplete, cancel, reject } from '../services/ticketService';

describe('ticketService - assignToPadal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const baseTicket = {
    id: 'ticket-1',
    nomorTiket: 'TIK-2025-0001',
    status: 'PENDING',
    creatorId: 'user-1',
    padalId: null,
  };

  const basePadal = {
    id: 'padal-1',
    nama: 'Padal User',
    role: 'PADAL',
    deletedAt: null,
  };

  const baseAssigner = {
    id: 'assigner-1',
    nama: 'Bidtekkom User',
  };

  it('should assign a PENDING ticket to a valid Padal', async () => {
    mockPrisma.ticket.findUnique
      .mockResolvedValueOnce(baseTicket)
      .mockResolvedValueOnce({ ...baseTicket, status: 'PROSES', padalId: 'padal-1' });
    mockPrisma.user.findUnique
      .mockResolvedValueOnce(basePadal)
      .mockResolvedValueOnce(baseAssigner);
    mockPrisma.ticket.updateMany.mockResolvedValue({ count: 1 });

    const result = await assignToPadal('ticket-1', 'padal-1', 'assigner-1');

    expect(mockPrisma.ticket.updateMany).toHaveBeenCalledWith({
      where: { id: 'ticket-1', status: 'PENDING' },
      data: expect.objectContaining({
        padalId: 'padal-1',
        status: 'PROSES',
      }),
    });
    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'TICKET_ASSIGNMENT',
        actorId: 'assigner-1',
      })
    );
    expect(result).toBeDefined();
  });

  it('should throw 404 if ticket not found', async () => {
    mockPrisma.ticket.findUnique.mockResolvedValue(null);

    await expect(assignToPadal('nonexistent', 'padal-1', 'assigner-1'))
      .rejects.toThrow(AppError);

    try {
      await assignToPadal('nonexistent', 'padal-1', 'assigner-1');
    } catch (err: any) {
      expect(err.statusCode).toBe(404);
      expect(err.code).toBe('TICKET_NOT_FOUND');
    }
  });

  it('should throw 400 if ticket is not PENDING', async () => {
    mockPrisma.ticket.findUnique.mockResolvedValue({ ...baseTicket, status: 'PROSES' });

    await expect(assignToPadal('ticket-1', 'padal-1', 'assigner-1'))
      .rejects.toThrow(AppError);

    try {
      await assignToPadal('ticket-1', 'padal-1', 'assigner-1');
    } catch (err: any) {
      expect(err.statusCode).toBe(400);
      expect(err.code).toBe('INVALID_STATUS');
    }
  });

  it('should throw 404 if target Padal user not found', async () => {
    mockPrisma.ticket.findUnique.mockResolvedValue(baseTicket);
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await expect(assignToPadal('ticket-1', 'padal-1', 'assigner-1'))
      .rejects.toThrow(AppError);

    try {
      await assignToPadal('ticket-1', 'padal-1', 'assigner-1');
    } catch (err: any) {
      expect(err.statusCode).toBe(404);
      expect(err.code).toBe('USER_NOT_FOUND');
    }
  });

  it('should throw 400 if target user is not PADAL role', async () => {
    mockPrisma.ticket.findUnique.mockResolvedValue(baseTicket);
    mockPrisma.user.findUnique.mockResolvedValue({ ...basePadal, role: 'SATKER' });

    await expect(assignToPadal('ticket-1', 'padal-1', 'assigner-1'))
      .rejects.toThrow(AppError);

    try {
      await assignToPadal('ticket-1', 'padal-1', 'assigner-1');
    } catch (err: any) {
      expect(err.statusCode).toBe(400);
      expect(err.code).toBe('INVALID_ROLE');
    }
  });

  it('should throw 400 if target Padal is soft-deleted', async () => {
    mockPrisma.ticket.findUnique.mockResolvedValue(baseTicket);
    mockPrisma.user.findUnique.mockResolvedValue({ ...basePadal, deletedAt: new Date() });

    await expect(assignToPadal('ticket-1', 'padal-1', 'assigner-1'))
      .rejects.toThrow(AppError);

    try {
      await assignToPadal('ticket-1', 'padal-1', 'assigner-1');
    } catch (err: any) {
      expect(err.statusCode).toBe(400);
      expect(err.code).toBe('USER_DELETED');
    }
  });

  it('should throw 409 CONFLICT on optimistic locking failure', async () => {
    mockPrisma.ticket.findUnique.mockResolvedValue(baseTicket);
    mockPrisma.user.findUnique.mockResolvedValue(basePadal);
    mockPrisma.ticket.updateMany.mockResolvedValue({ count: 0 });

    await expect(assignToPadal('ticket-1', 'padal-1', 'assigner-1'))
      .rejects.toThrow(AppError);

    try {
      await assignToPadal('ticket-1', 'padal-1', 'assigner-1');
    } catch (err: any) {
      expect(err.statusCode).toBe(409);
      expect(err.code).toBe('CONFLICT');
    }
  });
});

describe('ticketService - markComplete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const baseTicket = {
    id: 'ticket-1',
    nomorTiket: 'TIK-2025-0001',
    status: 'PROSES',
    creatorId: 'user-1',
    padalId: 'padal-1',
  };

  it('should mark a PROSES ticket as SELESAI', async () => {
    mockPrisma.ticket.findUnique
      .mockResolvedValueOnce(baseTicket)
      .mockResolvedValueOnce({ ...baseTicket, status: 'SELESAI' });
    mockPrisma.ticket.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'padal-1', nama: 'Padal User' });

    const result = await markComplete('ticket-1', 'padal-1');

    expect(mockPrisma.ticket.updateMany).toHaveBeenCalledWith({
      where: { id: 'ticket-1', status: 'PROSES' },
      data: expect.objectContaining({
        status: 'SELESAI',
      }),
    });
    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'TICKET_COMPLETION',
        actorId: 'padal-1',
      })
    );
    expect(result).toBeDefined();
  });

  it('should throw 404 if ticket not found', async () => {
    mockPrisma.ticket.findUnique.mockResolvedValue(null);

    try {
      await markComplete('nonexistent', 'padal-1');
    } catch (err: any) {
      expect(err.statusCode).toBe(404);
      expect(err.code).toBe('TICKET_NOT_FOUND');
    }
  });

  it('should throw 400 if ticket is not PROSES', async () => {
    mockPrisma.ticket.findUnique.mockResolvedValue({ ...baseTicket, status: 'PENDING' });

    try {
      await markComplete('ticket-1', 'padal-1');
    } catch (err: any) {
      expect(err.statusCode).toBe(400);
      expect(err.code).toBe('INVALID_STATUS');
    }
  });

  it('should throw 403 if actor is not the assigned Padal', async () => {
    mockPrisma.ticket.findUnique.mockResolvedValue(baseTicket);

    try {
      await markComplete('ticket-1', 'other-padal');
    } catch (err: any) {
      expect(err.statusCode).toBe(403);
      expect(err.code).toBe('FORBIDDEN');
    }
  });

  it('should throw 409 CONFLICT on optimistic locking failure', async () => {
    mockPrisma.ticket.findUnique.mockResolvedValue(baseTicket);
    mockPrisma.ticket.updateMany.mockResolvedValue({ count: 0 });

    try {
      await markComplete('ticket-1', 'padal-1');
    } catch (err: any) {
      expect(err.statusCode).toBe(409);
      expect(err.code).toBe('CONFLICT');
    }
  });
});

describe('ticketService - cancel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const pendingTicket = {
    id: 'ticket-1',
    nomorTiket: 'TIK-2025-0001',
    status: 'PENDING',
    creatorId: 'satker-1',
    padalId: null,
  };

  const prosesTicket = {
    id: 'ticket-2',
    nomorTiket: 'TIK-2025-0002',
    status: 'PROSES',
    creatorId: 'satker-1',
    padalId: 'padal-1',
  };

  it('should allow SATKER to cancel their own PENDING ticket', async () => {
    mockPrisma.ticket.findUnique
      .mockResolvedValueOnce(pendingTicket)
      .mockResolvedValueOnce({ ...pendingTicket, status: 'DIBATALKAN' });
    mockPrisma.ticket.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'satker-1', nama: 'Satker User' });

    const result = await cancel('ticket-1', 'satker-1', 'SATKER', 'Tidak jadi');

    expect(mockPrisma.ticket.updateMany).toHaveBeenCalledWith({
      where: { id: 'ticket-1', status: { in: ['PENDING', 'PROSES'] } },
      data: expect.objectContaining({
        status: 'DIBATALKAN',
        alasanBatal: 'Tidak jadi',
      }),
    });
    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'TICKET_CANCELLATION',
        actorId: 'satker-1',
      })
    );
    expect(result).toBeDefined();
  });

  it('should allow BIDTEKKOM to cancel any PENDING ticket', async () => {
    mockPrisma.ticket.findUnique
      .mockResolvedValueOnce(pendingTicket)
      .mockResolvedValueOnce({ ...pendingTicket, status: 'DIBATALKAN' });
    mockPrisma.ticket.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'bidtekkom-1', nama: 'Bidtekkom User' });

    const result = await cancel('ticket-1', 'bidtekkom-1', 'BIDTEKKOM', 'Duplikat');

    expect(result).toBeDefined();
    expect(mockPrisma.ticket.updateMany).toHaveBeenCalled();
  });

  it('should allow BIDTEKKOM to cancel any PROSES ticket', async () => {
    mockPrisma.ticket.findUnique
      .mockResolvedValueOnce(prosesTicket)
      .mockResolvedValueOnce({ ...prosesTicket, status: 'DIBATALKAN' });
    mockPrisma.ticket.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'bidtekkom-1', nama: 'Bidtekkom User' });

    const result = await cancel('ticket-2', 'bidtekkom-1', 'BIDTEKKOM', 'Sistem error');

    expect(result).toBeDefined();
  });

  it('should throw 403 if SATKER tries to cancel another users ticket', async () => {
    mockPrisma.ticket.findUnique.mockResolvedValue(pendingTicket);

    try {
      await cancel('ticket-1', 'other-satker', 'SATKER');
    } catch (err: any) {
      expect(err.statusCode).toBe(403);
      expect(err.code).toBe('FORBIDDEN');
      expect(err.message).toContain('milik Anda sendiri');
    }
  });

  it('should throw 400 if ticket status is SELESAI', async () => {
    mockPrisma.ticket.findUnique.mockResolvedValue({ ...pendingTicket, status: 'SELESAI' });

    try {
      await cancel('ticket-1', 'satker-1', 'SATKER');
    } catch (err: any) {
      expect(err.statusCode).toBe(400);
      expect(err.code).toBe('INVALID_STATUS');
    }
  });

  it('should throw 400 if ticket status is DIBATALKAN', async () => {
    mockPrisma.ticket.findUnique.mockResolvedValue({ ...pendingTicket, status: 'DIBATALKAN' });

    try {
      await cancel('ticket-1', 'satker-1', 'SATKER');
    } catch (err: any) {
      expect(err.statusCode).toBe(400);
      expect(err.code).toBe('INVALID_STATUS');
    }
  });

  it('should throw 404 if ticket not found', async () => {
    mockPrisma.ticket.findUnique.mockResolvedValue(null);

    try {
      await cancel('nonexistent', 'satker-1', 'SATKER');
    } catch (err: any) {
      expect(err.statusCode).toBe(404);
      expect(err.code).toBe('TICKET_NOT_FOUND');
    }
  });

  it('should throw 409 CONFLICT on optimistic locking failure', async () => {
    mockPrisma.ticket.findUnique.mockResolvedValue(pendingTicket);
    mockPrisma.ticket.updateMany.mockResolvedValue({ count: 0 });

    try {
      await cancel('ticket-1', 'satker-1', 'SATKER');
    } catch (err: any) {
      expect(err.statusCode).toBe(409);
      expect(err.code).toBe('CONFLICT');
    }
  });
});

describe('ticketService - reject', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const pendingTicket = {
    id: 'ticket-1',
    nomorTiket: 'TIK-2025-0001',
    status: 'PENDING',
    creatorId: 'satker-1',
    padalId: null,
  };

  it('should reject a PENDING ticket with a mandatory reason', async () => {
    mockPrisma.ticket.findUnique
      .mockResolvedValueOnce(pendingTicket)
      .mockResolvedValueOnce({ ...pendingTicket, status: 'DITOLAK', alasanBatal: 'Data tiket tidak valid' });
    mockPrisma.ticket.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'bidtekkom-1', nama: 'Bidtekkom User' });

    const result = await reject('ticket-1', 'bidtekkom-1', 'Data tiket tidak valid');

    expect(mockPrisma.ticket.updateMany).toHaveBeenCalledWith({
      where: { id: 'ticket-1', status: 'PENDING' },
      data: expect.objectContaining({
        status: 'DITOLAK',
        alasanBatal: 'Data tiket tidak valid',
      }),
    });
    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'TICKET_REJECTION',
        actorId: 'bidtekkom-1',
      })
    );
    expect(result).toBeDefined();
  });

  it('should throw 400 when reason is empty', async () => {
    await expect(reject('ticket-1', 'bidtekkom-1', '   ')).rejects.toThrow(AppError);
  });

  it('should throw 404 if ticket not found', async () => {
    mockPrisma.ticket.findUnique.mockResolvedValue(null);

    try {
      await reject('nonexistent', 'bidtekkom-1', 'Invalid ticket');
    } catch (err: any) {
      expect(err.statusCode).toBe(404);
      expect(err.code).toBe('TICKET_NOT_FOUND');
    }
  });

  it('should throw 400 if ticket is not PENDING', async () => {
    mockPrisma.ticket.findUnique.mockResolvedValue({ ...pendingTicket, status: 'PROSES' });

    try {
      await reject('ticket-1', 'bidtekkom-1', 'Tidak valid');
    } catch (err: any) {
      expect(err.statusCode).toBe(400);
      expect(err.code).toBe('INVALID_STATUS');
    }
  });

  it('should throw 409 CONFLICT on optimistic locking failure', async () => {
    mockPrisma.ticket.findUnique.mockResolvedValue(pendingTicket);
    mockPrisma.ticket.updateMany.mockResolvedValue({ count: 0 });

    try {
      await reject('ticket-1', 'bidtekkom-1', 'Tidak valid');
    } catch (err: any) {
      expect(err.statusCode).toBe(409);
      expect(err.code).toBe('CONFLICT');
    }
  });
});
