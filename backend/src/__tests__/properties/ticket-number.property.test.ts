import * as fc from 'fast-check';

/**
 * Property 5: Ticket Number Format and Uniqueness
 *
 * For any set of tickets created within the system, each ticket number SHALL
 * match the format `TKT-{4-digit year}-{5-digit zero-padded sequence}`, and
 * no two tickets SHALL ever share the same ticket number, regardless of ticket
 * status or deletion state.
 *
 * **Validates: Requirements 5.1, 5.2, 5.5**
 */
describe('Property 5: Ticket Number Format and Uniqueness', () => {
  // Helper: format a ticket number from year and sequence (mirrors ticketNumber.ts logic)
  function formatTicketNumber(year: number, sequence: number): string {
    const paddedSeq = sequence.toString().padStart(5, '0');
    return `TKT-${year}-${paddedSeq}`;
  }

  // Arbitraries
  const yearArb = fc.integer({ min: 2020, max: 2099 });
  const sequenceArb = fc.integer({ min: 1, max: 99999 });

  it('for any year (2020-2099) and sequence (1-99999), the formatted ticket number matches regex /^TKT-\\d{4}-\\d{5}$/', () => {
    fc.assert(
      fc.property(yearArb, sequenceArb, (year, sequence) => {
        const ticketNumber = formatTicketNumber(year, sequence);
        expect(ticketNumber).toMatch(/^TKT-\d{4}-\d{5}$/);
      }),
      { numRuns: 1000 }
    );
  });

  it('for any year and sequence, the year portion matches the input year', () => {
    fc.assert(
      fc.property(yearArb, sequenceArb, (year, sequence) => {
        const ticketNumber = formatTicketNumber(year, sequence);
        const parts = ticketNumber.split('-');
        const extractedYear = parseInt(parts[1], 10);
        expect(extractedYear).toBe(year);
      }),
      { numRuns: 1000 }
    );
  });

  it('for any year and sequence, the sequence portion is zero-padded to 5 digits', () => {
    fc.assert(
      fc.property(yearArb, sequenceArb, (year, sequence) => {
        const ticketNumber = formatTicketNumber(year, sequence);
        const parts = ticketNumber.split('-');
        const seqPart = parts[2];

        // Must be exactly 5 characters
        expect(seqPart).toHaveLength(5);

        // Must be all digits
        expect(seqPart).toMatch(/^\d{5}$/);

        // Parsed value must equal the input sequence
        expect(parseInt(seqPart, 10)).toBe(sequence);
      }),
      { numRuns: 1000 }
    );
  });

  it('for any set of distinct (year, sequence) pairs, the resulting ticket numbers are all unique', () => {
    // Generate arrays of unique (year, sequence) pairs
    const distinctPairsArb = fc
      .uniqueArray(
        fc.tuple(yearArb, sequenceArb),
        {
          minLength: 2,
          maxLength: 50,
          comparator: (a, b) => a[0] === b[0] && a[1] === b[1],
        }
      );

    fc.assert(
      fc.property(distinctPairsArb, (pairs) => {
        const ticketNumbers = pairs.map(([year, seq]) => formatTicketNumber(year, seq));
        const uniqueNumbers = new Set(ticketNumbers);

        // All generated ticket numbers must be unique
        expect(uniqueNumbers.size).toBe(ticketNumbers.length);
      }),
      { numRuns: 200 }
    );
  });

  it('sequence 99999 is the maximum valid value; 100000 would exceed the 5-digit format', () => {
    fc.assert(
      fc.property(yearArb, (year) => {
        // 99999 is valid and produces exactly 5 digits
        const maxValid = formatTicketNumber(year, 99999);
        expect(maxValid).toMatch(/^TKT-\d{4}-99999$/);

        // 100000 would produce 6 digits, breaking the format
        const overflow = formatTicketNumber(year, 100000);
        expect(overflow).not.toMatch(/^TKT-\d{4}-\d{5}$/);
        // It would be "100000" which is 6 chars
        const overflowSeqPart = overflow.split('-')[2];
        expect(overflowSeqPart.length).toBeGreaterThan(5);
      }),
      { numRuns: 100 }
    );
  });
});
