import * as fc from 'fast-check';

/**
 * Property 13: Monthly Report Date Filtering
 *
 * For any month/year combination and any set of tickets in the database, the report
 * SHALL return exactly those tickets whose tanggalBuat falls within the specified
 * calendar month. For a Padal, the result SHALL be further filtered to only tickets
 * assigned to that Padal.
 *
 * **Validates: Requirements 12.1, 12.2**
 */

// ─── Types ───────────────────────────────────────────────────────────────────

type TicketStatus = 'PENDING' | 'PROSES' | 'SELESAI' | 'DIBATALKAN';

interface MockTicket {
  id: string;
  nomorTiket: string;
  judul: string;
  tanggalBuat: Date;
  status: TicketStatus;
  padalId: string | null;
  creatorId: string;
  divisiSatker: string | null;
  lokasi: string;
}

interface ReportParams {
  month: number; // 1-12
  year: number;  // 4-digit year
  padalId?: string;
}

// ─── Pure Filtering Logic (mirrors reportService.ts) ─────────────────────────

/**
 * Pure function that filters tickets by month/year and optional padalId.
 * This mirrors the date filtering logic in reportService.getMonthlyReport().
 */
function filterTicketsForReport(tickets: MockTicket[], params: ReportParams): MockTicket[] {
  const { month, year, padalId } = params;

  // Build date range: first day of month (inclusive) to first day of next month (exclusive)
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);

  return tickets.filter((ticket) => {
    // Date filter: tanggalBuat >= startDate AND tanggalBuat < endDate
    const inDateRange = ticket.tanggalBuat >= startDate && ticket.tanggalBuat < endDate;

    // Padal scope filter (Req 12.2)
    const matchesPadal = padalId ? ticket.padalId === padalId : true;

    return inDateRange && matchesPadal;
  });
}

/**
 * Checks if a date falls within a given month/year.
 */
function isInMonth(date: Date, month: number, year: number): boolean {
  return date.getMonth() === month - 1 && date.getFullYear() === year;
}

// ─── Arbitraries ─────────────────────────────────────────────────────────────

// Generate a valid month (1-12)
const monthArb = fc.integer({ min: 1, max: 12 });

// Generate a valid year (2020-2030)
const yearArb = fc.integer({ min: 2020, max: 2030 });

// Generate a random date within a reasonable range
const dateArb = fc.date({
  min: new Date(2020, 0, 1),
  max: new Date(2030, 11, 31),
});

const statusArb = fc.constantFrom<TicketStatus>('PENDING', 'PROSES', 'SELESAI', 'DIBATALKAN');

const padalIdArb = fc.constantFrom('padal-1', 'padal-2', 'padal-3');

const ticketIdArb = fc.uuid();

// Generate a mock ticket with a specific date
function mockTicketArb(dateGen: fc.Arbitrary<Date>): fc.Arbitrary<MockTicket> {
  return fc.record({
    id: ticketIdArb,
    nomorTiket: fc.string({ minLength: 5, maxLength: 15 }).map((s) => `TKT-2024-${s}`),
    judul: fc.string({ minLength: 1, maxLength: 50 }),
    tanggalBuat: dateGen,
    status: statusArb,
    padalId: fc.option(padalIdArb, { nil: null }),
    creatorId: fc.uuid(),
    divisiSatker: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: null }),
    lokasi: fc.string({ minLength: 1, maxLength: 50 }),
  });
}

// Generate a list of tickets with random dates
const ticketListArb = fc.array(mockTicketArb(dateArb), { minLength: 0, maxLength: 30 });

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Property 13: Monthly Report Date Filtering', () => {
  describe('Tickets within the specified month/year are included', () => {
    it('for any ticket with tanggalBuat in month M/year Y, it should be included in report for M/Y', () => {
      fc.assert(
        fc.property(
          monthArb,
          yearArb,
          fc.array(mockTicketArb(dateArb), { minLength: 1, maxLength: 20 }),
          (month, year, tickets) => {
            // Add at least one ticket that IS in the target month
            const inMonthDate = new Date(year, month - 1, 15); // mid-month
            const guaranteedTicket: MockTicket = {
              id: 'guaranteed-in-month',
              nomorTiket: 'TKT-2024-00001',
              judul: 'Test ticket',
              tanggalBuat: inMonthDate,
              status: 'PENDING',
              padalId: null,
              creatorId: 'creator-1',
              divisiSatker: 'Divisi A',
              lokasi: 'Lokasi A',
            };

            const allTickets = [...tickets, guaranteedTicket];
            const result = filterTicketsForReport(allTickets, { month, year });

            // The guaranteed ticket must be in the result
            expect(result.some((t) => t.id === 'guaranteed-in-month')).toBe(true);

            // Every ticket in the result must have tanggalBuat in the target month
            for (const ticket of result) {
              expect(isInMonth(ticket.tanggalBuat, month, year)).toBe(true);
            }
          }
        ),
        { numRuns: 200 }
      );
    });
  });

  describe('Tickets outside the specified month/year are excluded', () => {
    it('for any ticket with tanggalBuat NOT in month M/year Y, it should be excluded from report for M/Y', () => {
      fc.assert(
        fc.property(
          monthArb,
          yearArb,
          (month, year) => {
            // Create tickets that are definitely NOT in the target month
            const prevMonth = month === 1 ? 12 : month - 1;
            const prevYear = month === 1 ? year - 1 : year;
            const nextMonth = month === 12 ? 1 : month + 1;
            const nextYear = month === 12 ? year + 1 : year;

            const outsideTickets: MockTicket[] = [
              {
                id: 'prev-month',
                nomorTiket: 'TKT-2024-00001',
                judul: 'Previous month',
                tanggalBuat: new Date(prevYear, prevMonth - 1, 15),
                status: 'PENDING',
                padalId: null,
                creatorId: 'creator-1',
                divisiSatker: null,
                lokasi: 'Lokasi',
              },
              {
                id: 'next-month',
                nomorTiket: 'TKT-2024-00002',
                judul: 'Next month',
                tanggalBuat: new Date(nextYear, nextMonth - 1, 15),
                status: 'PROSES',
                padalId: 'padal-1',
                creatorId: 'creator-2',
                divisiSatker: 'Divisi B',
                lokasi: 'Lokasi B',
              },
            ];

            const result = filterTicketsForReport(outsideTickets, { month, year });

            // No tickets should be in the result
            expect(result.length).toBe(0);
          }
        ),
        { numRuns: 200 }
      );
    });
  });

  describe('Padal-scoped report only includes matching padalId', () => {
    it('for any Padal-scoped report, only tickets with matching padalId are included', () => {
      fc.assert(
        fc.property(
          monthArb,
          yearArb,
          padalIdArb,
          (month, year, targetPadalId) => {
            const inMonthDate = new Date(year, month - 1, 10);

            // Create tickets: some assigned to target Padal, some to others, some unassigned
            const tickets: MockTicket[] = [
              {
                id: 'matching-padal',
                nomorTiket: 'TKT-2024-00001',
                judul: 'Matching padal',
                tanggalBuat: inMonthDate,
                status: 'PROSES',
                padalId: targetPadalId,
                creatorId: 'creator-1',
                divisiSatker: 'Divisi A',
                lokasi: 'Lokasi A',
              },
              {
                id: 'different-padal',
                nomorTiket: 'TKT-2024-00002',
                judul: 'Different padal',
                tanggalBuat: inMonthDate,
                status: 'PROSES',
                padalId: targetPadalId === 'padal-1' ? 'padal-2' : 'padal-1',
                creatorId: 'creator-2',
                divisiSatker: 'Divisi B',
                lokasi: 'Lokasi B',
              },
              {
                id: 'no-padal',
                nomorTiket: 'TKT-2024-00003',
                judul: 'No padal',
                tanggalBuat: inMonthDate,
                status: 'PENDING',
                padalId: null,
                creatorId: 'creator-3',
                divisiSatker: 'Divisi C',
                lokasi: 'Lokasi C',
              },
            ];

            const result = filterTicketsForReport(tickets, {
              month,
              year,
              padalId: targetPadalId,
            });

            // Only the matching padal ticket should be included
            expect(result.length).toBe(1);
            expect(result[0].id).toBe('matching-padal');
            expect(result[0].padalId).toBe(targetPadalId);

            // All results must have the target padalId
            for (const ticket of result) {
              expect(ticket.padalId).toBe(targetPadalId);
            }
          }
        ),
        { numRuns: 200 }
      );
    });
  });

  describe('Date range boundaries', () => {
    it('first day of month (inclusive) is included in the report', () => {
      fc.assert(
        fc.property(monthArb, yearArb, (month, year) => {
          // First moment of the month (00:00:00.000)
          const firstDayStart = new Date(year, month - 1, 1, 0, 0, 0, 0);

          const tickets: MockTicket[] = [
            {
              id: 'first-day-start',
              nomorTiket: 'TKT-2024-00001',
              judul: 'First day start',
              tanggalBuat: firstDayStart,
              status: 'PENDING',
              padalId: null,
              creatorId: 'creator-1',
              divisiSatker: null,
              lokasi: 'Lokasi',
            },
          ];

          const result = filterTicketsForReport(tickets, { month, year });
          expect(result.length).toBe(1);
          expect(result[0].id).toBe('first-day-start');
        }),
        { numRuns: 100 }
      );
    });

    it('last moment of the month (23:59:59.999 on last day) is included', () => {
      fc.assert(
        fc.property(monthArb, yearArb, (month, year) => {
          // Last moment of the month: one millisecond before the first day of next month
          const endOfMonth = new Date(new Date(year, month, 1).getTime() - 1);

          const tickets: MockTicket[] = [
            {
              id: 'last-moment',
              nomorTiket: 'TKT-2024-00001',
              judul: 'Last moment of month',
              tanggalBuat: endOfMonth,
              status: 'SELESAI',
              padalId: 'padal-1',
              creatorId: 'creator-1',
              divisiSatker: 'Divisi A',
              lokasi: 'Lokasi',
            },
          ];

          const result = filterTicketsForReport(tickets, { month, year });
          expect(result.length).toBe(1);
          expect(result[0].id).toBe('last-moment');
        }),
        { numRuns: 100 }
      );
    });

    it('first moment of the NEXT month (exclusive boundary) is excluded', () => {
      fc.assert(
        fc.property(monthArb, yearArb, (month, year) => {
          // First moment of the next month (this is the exclusive upper bound)
          const firstDayNextMonth = new Date(year, month, 1, 0, 0, 0, 0);

          const tickets: MockTicket[] = [
            {
              id: 'next-month-start',
              nomorTiket: 'TKT-2024-00001',
              judul: 'First moment of next month',
              tanggalBuat: firstDayNextMonth,
              status: 'PENDING',
              padalId: null,
              creatorId: 'creator-1',
              divisiSatker: null,
              lokasi: 'Lokasi',
            },
          ];

          const result = filterTicketsForReport(tickets, { month, year });
          expect(result.length).toBe(0);
        }),
        { numRuns: 100 }
      );
    });

    it('one millisecond before the month starts is excluded', () => {
      fc.assert(
        fc.property(monthArb, yearArb, (month, year) => {
          // One millisecond before the start of the target month
          const beforeMonthStart = new Date(new Date(year, month - 1, 1).getTime() - 1);

          const tickets: MockTicket[] = [
            {
              id: 'before-month',
              nomorTiket: 'TKT-2024-00001',
              judul: 'Before month starts',
              tanggalBuat: beforeMonthStart,
              status: 'PENDING',
              padalId: null,
              creatorId: 'creator-1',
              divisiSatker: null,
              lokasi: 'Lokasi',
            },
          ];

          const result = filterTicketsForReport(tickets, { month, year });
          expect(result.length).toBe(0);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Random dates with correct inclusion/exclusion', () => {
    it('for any set of random tickets, the filter returns exactly those in the target month', () => {
      fc.assert(
        fc.property(monthArb, yearArb, ticketListArb, (month, year, tickets) => {
          const result = filterTicketsForReport(tickets, { month, year });

          // Every returned ticket must be in the target month
          for (const ticket of result) {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 1);
            expect(ticket.tanggalBuat.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
            expect(ticket.tanggalBuat.getTime()).toBeLessThan(endDate.getTime());
          }

          // Every ticket in the target month must be in the result
          const expectedIds = tickets
            .filter((t) => {
              const startDate = new Date(year, month - 1, 1);
              const endDate = new Date(year, month, 1);
              return t.tanggalBuat >= startDate && t.tanggalBuat < endDate;
            })
            .map((t) => t.id);

          const resultIds = result.map((t) => t.id);
          expect(resultIds.sort()).toEqual(expectedIds.sort());
        }),
        { numRuns: 200 }
      );
    });

    it('for any set of random tickets with Padal filter, returns only matching month AND padalId', () => {
      fc.assert(
        fc.property(
          monthArb,
          yearArb,
          padalIdArb,
          ticketListArb,
          (month, year, targetPadalId, tickets) => {
            const result = filterTicketsForReport(tickets, {
              month,
              year,
              padalId: targetPadalId,
            });

            // Every returned ticket must be in the target month AND have matching padalId
            for (const ticket of result) {
              const startDate = new Date(year, month - 1, 1);
              const endDate = new Date(year, month, 1);
              expect(ticket.tanggalBuat.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
              expect(ticket.tanggalBuat.getTime()).toBeLessThan(endDate.getTime());
              expect(ticket.padalId).toBe(targetPadalId);
            }

            // Every ticket matching both criteria must be in the result
            const expectedIds = tickets
              .filter((t) => {
                const startDate = new Date(year, month - 1, 1);
                const endDate = new Date(year, month, 1);
                return (
                  t.tanggalBuat >= startDate &&
                  t.tanggalBuat < endDate &&
                  t.padalId === targetPadalId
                );
              })
              .map((t) => t.id);

            const resultIds = result.map((t) => t.id);
            expect(resultIds.sort()).toEqual(expectedIds.sort());
          }
        ),
        { numRuns: 200 }
      );
    });
  });

  describe('Bidtekkom vs Padal scoping', () => {
    it('Bidtekkom report (no padalId) returns all tickets in the month regardless of assignment', () => {
      fc.assert(
        fc.property(monthArb, yearArb, (month, year) => {
          const inMonthDate = new Date(year, month - 1, 20);

          const tickets: MockTicket[] = [
            {
              id: 'assigned-padal-1',
              nomorTiket: 'TKT-2024-00001',
              judul: 'Assigned to padal 1',
              tanggalBuat: inMonthDate,
              status: 'PROSES',
              padalId: 'padal-1',
              creatorId: 'creator-1',
              divisiSatker: 'Divisi A',
              lokasi: 'Lokasi A',
            },
            {
              id: 'assigned-padal-2',
              nomorTiket: 'TKT-2024-00002',
              judul: 'Assigned to padal 2',
              tanggalBuat: inMonthDate,
              status: 'PROSES',
              padalId: 'padal-2',
              creatorId: 'creator-2',
              divisiSatker: 'Divisi B',
              lokasi: 'Lokasi B',
            },
            {
              id: 'unassigned',
              nomorTiket: 'TKT-2024-00003',
              judul: 'Unassigned ticket',
              tanggalBuat: inMonthDate,
              status: 'PENDING',
              padalId: null,
              creatorId: 'creator-3',
              divisiSatker: 'Divisi C',
              lokasi: 'Lokasi C',
            },
          ];

          // Bidtekkom: no padalId filter
          const result = filterTicketsForReport(tickets, { month, year });

          // All 3 tickets should be included
          expect(result.length).toBe(3);
        }),
        { numRuns: 100 }
      );
    });

    it('Padal report only returns tickets assigned to that specific Padal', () => {
      fc.assert(
        fc.property(monthArb, yearArb, padalIdArb, (month, year, targetPadal) => {
          const inMonthDate = new Date(year, month - 1, 5);

          const tickets: MockTicket[] = [
            {
              id: 'target-padal-ticket',
              nomorTiket: 'TKT-2024-00001',
              judul: 'Target padal ticket',
              tanggalBuat: inMonthDate,
              status: 'PROSES',
              padalId: targetPadal,
              creatorId: 'creator-1',
              divisiSatker: 'Divisi A',
              lokasi: 'Lokasi A',
            },
            {
              id: 'other-padal-ticket',
              nomorTiket: 'TKT-2024-00002',
              judul: 'Other padal ticket',
              tanggalBuat: inMonthDate,
              status: 'PROSES',
              padalId: targetPadal === 'padal-1' ? 'padal-2' : 'padal-1',
              creatorId: 'creator-2',
              divisiSatker: 'Divisi B',
              lokasi: 'Lokasi B',
            },
            {
              id: 'null-padal-ticket',
              nomorTiket: 'TKT-2024-00003',
              judul: 'Null padal ticket',
              tanggalBuat: inMonthDate,
              status: 'PENDING',
              padalId: null,
              creatorId: 'creator-3',
              divisiSatker: 'Divisi C',
              lokasi: 'Lokasi C',
            },
          ];

          // Padal-scoped report
          const result = filterTicketsForReport(tickets, {
            month,
            year,
            padalId: targetPadal,
          });

          // Only the target padal's ticket should be included
          expect(result.length).toBe(1);
          expect(result[0].id).toBe('target-padal-ticket');
          expect(result[0].padalId).toBe(targetPadal);
        }),
        { numRuns: 100 }
      );
    });
  });
});
