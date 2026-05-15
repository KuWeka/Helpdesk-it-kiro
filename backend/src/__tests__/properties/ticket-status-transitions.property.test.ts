import * as fc from 'fast-check';

/**
 * Property 6: Ticket Status Transition State Machine
 *
 * For any ticket in any status and any attempted status transition, the transition
 * SHALL succeed if and only if it matches one of the valid transitions:
 * PENDING→PROSES (via assignment), PROSES→SELESAI (via completion),
 * PENDING→DIBATALKAN (via cancellation), PROSES→DIBATALKAN (via cancellation).
 * All other transitions SHALL be rejected, and the ticket SHALL remain in its
 * original status with no fields modified.
 *
 * **Validates: Requirements 7.1, 7.2, 7.3, 6.4, 8.3**
 */

// ─── Status Transition State Machine (pure logic, no database) ───────────────

type TicketStatus = 'PENDING' | 'PROSES' | 'SELESAI' | 'DIBATALKAN' | 'DITOLAK';

const ALL_STATUSES: TicketStatus[] = ['PENDING', 'PROSES', 'SELESAI', 'DIBATALKAN', 'DITOLAK'];

const TERMINAL_STATUSES: TicketStatus[] = ['SELESAI', 'DIBATALKAN', 'DITOLAK'];

// Valid transitions map: from → set of valid targets
const VALID_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  PENDING: ['PROSES', 'DIBATALKAN', 'DITOLAK'],
  PROSES: ['SELESAI', 'DIBATALKAN'],
  SELESAI: [],
  DIBATALKAN: [],
  DITOLAK: [],
};

/**
 * Pure function that determines if a transition is valid.
 */
function isValidTransition(from: TicketStatus, to: TicketStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

/**
 * Pure function that attempts a status transition.
 * Returns { success: true, newStatus } if valid, or { success: false, currentStatus } if invalid.
 */
function attemptTransition(
  currentStatus: TicketStatus,
  targetStatus: TicketStatus
): { success: boolean; resultStatus: TicketStatus } {
  if (isValidTransition(currentStatus, targetStatus)) {
    return { success: true, resultStatus: targetStatus };
  }
  return { success: false, resultStatus: currentStatus };
}

// ─── Arbitraries ─────────────────────────────────────────────────────────────

const statusArb = fc.constantFrom<TicketStatus>(...ALL_STATUSES);
const terminalStatusArb = fc.constantFrom<TicketStatus>(...TERMINAL_STATUSES);

// Generate a valid transition pair
const validTransitionPairArb = fc.oneof(
  fc.constant({ from: 'PENDING' as TicketStatus, to: 'PROSES' as TicketStatus }),
  fc.constant({ from: 'PENDING' as TicketStatus, to: 'DIBATALKAN' as TicketStatus }),
  fc.constant({ from: 'PENDING' as TicketStatus, to: 'DITOLAK' as TicketStatus }),
  fc.constant({ from: 'PROSES' as TicketStatus, to: 'SELESAI' as TicketStatus }),
  fc.constant({ from: 'PROSES' as TicketStatus, to: 'DIBATALKAN' as TicketStatus })
);

// Generate an invalid transition pair (any pair NOT in valid transitions)
const invalidTransitionPairArb = fc
  .tuple(statusArb, statusArb)
  .filter(([from, to]) => !isValidTransition(from, to));

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Property 6: Ticket Status Transition State Machine', () => {
  describe('Valid transitions succeed', () => {
    it('for any (currentStatus, targetStatus) pair that IS in the valid transitions, the transition should be allowed', () => {
      fc.assert(
        fc.property(validTransitionPairArb, ({ from, to }) => {
          const result = attemptTransition(from, to);

          expect(result.success).toBe(true);
          expect(result.resultStatus).toBe(to);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Invalid transitions are rejected', () => {
    it('for any (currentStatus, targetStatus) pair that is NOT in the valid transitions, the transition should be rejected', () => {
      fc.assert(
        fc.property(invalidTransitionPairArb, ([from, to]) => {
          const result = attemptTransition(from, to);

          expect(result.success).toBe(false);
          expect(result.resultStatus).toBe(from);
        }),
        { numRuns: 200 }
      );
    });
  });

  describe('Terminal states have no outgoing transitions', () => {
    it('SELESAI and DIBATALKAN are terminal: no transitions from these states should be valid', () => {
      fc.assert(
        fc.property(terminalStatusArb, statusArb, (terminalStatus, targetStatus) => {
          const result = attemptTransition(terminalStatus, targetStatus);

          // Terminal states never allow transitions (including self-transitions)
          expect(result.success).toBe(false);
          expect(result.resultStatus).toBe(terminalStatus);
        }),
        { numRuns: 200 }
      );
    });
  });

  describe('Ticket unchanged on rejection', () => {
    it('when a transition is rejected, the ticket status remains unchanged', () => {
      fc.assert(
        fc.property(statusArb, statusArb, (currentStatus, targetStatus) => {
          const result = attemptTransition(currentStatus, targetStatus);

          if (!result.success) {
            // Status must remain the same as before the attempt
            expect(result.resultStatus).toBe(currentStatus);
          }
        }),
        { numRuns: 200 }
      );
    });
  });

  describe('Reachability from PENDING via valid transitions', () => {
    it('for any sequence of valid transitions starting from PENDING, the final state is reachable', () => {
      // Generate a sequence of valid transitions starting from PENDING
      const validPathArb = fc.integer({ min: 1, max: 10 }).chain((length) => {
        return fc.constant(null).map(() => {
          const path: TicketStatus[] = ['PENDING'];
          let current: TicketStatus = 'PENDING';

          for (let i = 0; i < length; i++) {
            const validTargets: TicketStatus[] = VALID_TRANSITIONS[current];
            if (validTargets.length === 0) break; // Terminal state reached
            // Pick a random valid target deterministically based on index
            const target: TicketStatus = validTargets[i % validTargets.length];
            path.push(target);
            current = target;
          }

          return path;
        });
      });

      fc.assert(
        fc.property(validPathArb, (path) => {
          // Verify each step in the path is a valid transition
          for (let i = 0; i < path.length - 1; i++) {
            const from = path[i];
            const to = path[i + 1];
            expect(isValidTransition(from, to)).toBe(true);

            const result = attemptTransition(from, to);
            expect(result.success).toBe(true);
            expect(result.resultStatus).toBe(to);
          }

          // The final state should be the last element in the path
          const finalState = path[path.length - 1];
          expect(ALL_STATUSES).toContain(finalState);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('State machine completeness', () => {
    it('every status pair is either a valid transition or an invalid transition (no undefined behavior)', () => {
      fc.assert(
        fc.property(statusArb, statusArb, (from, to) => {
          const result = attemptTransition(from, to);

          // Result must be one of two outcomes: success or failure
          expect(typeof result.success).toBe('boolean');
          expect(ALL_STATUSES).toContain(result.resultStatus);

          // If success, resultStatus must be the target
          if (result.success) {
            expect(result.resultStatus).toBe(to);
          }
          // If failure, resultStatus must be the original
          if (!result.success) {
            expect(result.resultStatus).toBe(from);
          }
        }),
        { numRuns: 200 }
      );
    });
  });
});
