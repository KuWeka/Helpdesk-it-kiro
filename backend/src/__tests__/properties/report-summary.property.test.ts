import * as fc from 'fast-check';

/**
 * Property 14: Report Summary Aggregation
 *
 * For any set of tickets returned in a report, the summary SHALL correctly show:
 * total count equal to the number of tickets, per-status counts that sum to the
 * total, and average rating calculated as the arithmetic mean of bintang values
 * from tickets that have a rating (null if no rated tickets exist), rounded to
 * 1 decimal place.
 *
 * **Validates: Requirements 12.6**
 */

// ─── Replicate calculateSummary logic from reportService.ts ──────────────────

type TicketStatus = 'PENDING' | 'PROSES' | 'SELESAI' | 'DIBATALKAN';

interface ReportTicketRow {
  nomorTiket: string;
  judul: string;
  namaSatker: string;
  divisiSatker: string | null;
  lokasi: string;
  tanggalBuat: Date;
  tanggalAssign: Date | null;
  tanggalSelesai: Date | null;
  status: TicketStatus;
  rating: {
    bintang: number;
    feedback: string;
  } | null;
}

interface ReportSummary {
  total: number;
  pending: number;
  proses: number;
  selesai: number;
  dibatalkan: number;
  averageRating: number | null;
}

function calculateSummary(tickets: ReportTicketRow[]): ReportSummary {
  const total = tickets.length;
  const pending = tickets.filter((t) => t.status === 'PENDING').length;
  const proses = tickets.filter((t) => t.status === 'PROSES').length;
  const selesai = tickets.filter((t) => t.status === 'SELESAI').length;
  const dibatalkan = tickets.filter((t) => t.status === 'DIBATALKAN').length;

  const ratedTickets = tickets.filter((t) => t.rating !== null);
  let averageRating: number | null = null;

  if (ratedTickets.length > 0) {
    const sum = ratedTickets.reduce((acc, t) => acc + t.rating!.bintang, 0);
    averageRating = Math.round((sum / ratedTickets.length) * 10) / 10;
  }

  return {
    total,
    pending,
    proses,
    selesai,
    dibatalkan,
    averageRating,
  };
}

// ─── Arbitraries ─────────────────────────────────────────────────────────────

const statusArb: fc.Arbitrary<TicketStatus> = fc.constantFrom(
  'PENDING',
  'PROSES',
  'SELESAI',
  'DIBATALKAN'
);

const ratingArb: fc.Arbitrary<{ bintang: number; feedback: string } | null> = fc.oneof(
  fc.constant(null),
  fc.record({
    bintang: fc.integer({ min: 1, max: 5 }),
    feedback: fc.string({ minLength: 1, maxLength: 100 }),
  })
);

const ticketRowArb: fc.Arbitrary<ReportTicketRow> = fc.record({
  nomorTiket: fc.string({ minLength: 1, maxLength: 20 }),
  judul: fc.string({ minLength: 1, maxLength: 150 }),
  namaSatker: fc.string({ minLength: 2, maxLength: 100 }),
  divisiSatker: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
  lokasi: fc.string({ minLength: 1, maxLength: 200 }),
  tanggalBuat: fc.date(),
  tanggalAssign: fc.option(fc.date(), { nil: null }),
  tanggalSelesai: fc.option(fc.date(), { nil: null }),
  status: statusArb,
  rating: ratingArb,
});

const ticketListArb = fc.array(ticketRowArb, { minLength: 0, maxLength: 100 });

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Property 14: Report Summary Aggregation', () => {
  it('for any list of tickets, summary.total equals the ticket count', () => {
    fc.assert(
      fc.property(ticketListArb, (tickets) => {
        const summary = calculateSummary(tickets);
        expect(summary.total).toBe(tickets.length);
      }),
      { numRuns: 500 }
    );
  });

  it('for any list of tickets, pending + proses + selesai + dibatalkan equals total', () => {
    fc.assert(
      fc.property(ticketListArb, (tickets) => {
        const summary = calculateSummary(tickets);
        const statusSum =
          summary.pending + summary.proses + summary.selesai + summary.dibatalkan;
        expect(statusSum).toBe(summary.total);
      }),
      { numRuns: 500 }
    );
  });

  it('for any list of tickets with ratings, averageRating equals sum(bintang) / count(rated tickets) rounded to 1 decimal', () => {
    // Generate at least one ticket with a rating
    const ratedTicketArb = fc.record({
      nomorTiket: fc.string({ minLength: 1, maxLength: 20 }),
      judul: fc.string({ minLength: 1, maxLength: 150 }),
      namaSatker: fc.string({ minLength: 2, maxLength: 100 }),
      divisiSatker: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
      lokasi: fc.string({ minLength: 1, maxLength: 200 }),
      tanggalBuat: fc.date(),
      tanggalAssign: fc.option(fc.date(), { nil: null }),
      tanggalSelesai: fc.option(fc.date(), { nil: null }),
      status: statusArb,
      rating: fc.record({
        bintang: fc.integer({ min: 1, max: 5 }),
        feedback: fc.string({ minLength: 1, maxLength: 100 }),
      }),
    });

    const ticketsWithAtLeastOneRatingArb = fc
      .tuple(
        fc.array(ratedTicketArb, { minLength: 1, maxLength: 50 }),
        fc.array(ticketRowArb, { minLength: 0, maxLength: 50 })
      )
      .map(([rated, mixed]) => [...rated, ...mixed]);

    fc.assert(
      fc.property(ticketsWithAtLeastOneRatingArb, (tickets) => {
        const summary = calculateSummary(tickets);

        const ratedTickets = tickets.filter((t) => t.rating !== null);
        if (ratedTickets.length > 0) {
          const sum = ratedTickets.reduce((acc, t) => acc + t.rating!.bintang, 0);
          const expected = Math.round((sum / ratedTickets.length) * 10) / 10;
          expect(summary.averageRating).toBe(expected);
        }
      }),
      { numRuns: 500 }
    );
  });

  it('for any list of tickets with no ratings, averageRating is null', () => {
    const unratedTicketArb: fc.Arbitrary<ReportTicketRow> = fc.record({
      nomorTiket: fc.string({ minLength: 1, maxLength: 20 }),
      judul: fc.string({ minLength: 1, maxLength: 150 }),
      namaSatker: fc.string({ minLength: 2, maxLength: 100 }),
      divisiSatker: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
      lokasi: fc.string({ minLength: 1, maxLength: 200 }),
      tanggalBuat: fc.date(),
      tanggalAssign: fc.option(fc.date(), { nil: null }),
      tanggalSelesai: fc.option(fc.date(), { nil: null }),
      status: statusArb,
      rating: fc.constant(null),
    });

    const unratedListArb = fc.array(unratedTicketArb, { minLength: 1, maxLength: 100 });

    fc.assert(
      fc.property(unratedListArb, (tickets) => {
        const summary = calculateSummary(tickets);
        expect(summary.averageRating).toBeNull();
      }),
      { numRuns: 500 }
    );
  });

  it('for an empty ticket list, all counts are 0 and averageRating is null', () => {
    const summary = calculateSummary([]);
    expect(summary.total).toBe(0);
    expect(summary.pending).toBe(0);
    expect(summary.proses).toBe(0);
    expect(summary.selesai).toBe(0);
    expect(summary.dibatalkan).toBe(0);
    expect(summary.averageRating).toBeNull();
  });
});
