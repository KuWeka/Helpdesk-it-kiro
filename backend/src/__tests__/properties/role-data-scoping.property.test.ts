import * as fc from 'fast-check';

/**
 * Property 12: Role-Based Data Scoping
 *
 * For any authenticated API request to ticket-related endpoints:
 * - A Satker SHALL only see their own created tickets (creatorId === userId)
 * - A Padal SHALL only see tickets assigned to them (padalId === userId)
 * - A Teknisi SHALL only see tickets assigned to their associated Padal (or empty if unassigned)
 * - A Bidtekkom SHALL see all tickets
 * Any attempt to access data outside the user's scope SHALL return 403.
 *
 * **Validates: Requirements 17.3, 17.4, 17.5, 17.7, 17.10**
 */

// ─── Types ───────────────────────────────────────────────────────────────────

type Role = 'SATKER' | 'BIDTEKKOM' | 'PADAL' | 'TEKNISI';

interface User {
  id: string;
  role: Role;
  padalId: string | null; // Only relevant for TEKNISI
}

interface Ticket {
  id: string;
  creatorId: string;
  padalId: string | null;
}

type ScopeResult =
  | { allowed: true; tickets: Ticket[] }
  | { allowed: false; statusCode: 403 };

// ─── Pure Scoping Logic (mirrors backend service layer) ──────────────────────

/**
 * Determines which tickets a user can see in a list query.
 * This mirrors the logic in ticketService.listForSatker/Bidtekkom/Padal/Teknisi.
 */
function getVisibleTickets(user: User, allTickets: Ticket[]): Ticket[] {
  switch (user.role) {
    case 'SATKER':
      // Req 17.7: Satker can only see their own tickets
      return allTickets.filter((t) => t.creatorId === user.id);

    case 'BIDTEKKOM':
      // Req 17.8: Bidtekkom sees all tickets
      return allTickets;

    case 'PADAL':
      // Req 17.4: Padal can only see tickets assigned to them
      return allTickets.filter((t) => t.padalId === user.id);

    case 'TEKNISI':
      // Req 17.5: Teknisi sees tickets assigned to their associated Padal
      // Req 17.6: If no padalId, return empty
      if (!user.padalId) {
        return [];
      }
      return allTickets.filter((t) => t.padalId === user.padalId);
  }
}

/**
 * Determines if a user can access a specific ticket by ID.
 * Returns 403 if the ticket is out of scope.
 */
function canAccessTicket(user: User, ticket: Ticket): boolean {
  switch (user.role) {
    case 'SATKER':
      // Req 17.7, 17.10: Satker can only access their own tickets
      return ticket.creatorId === user.id;

    case 'BIDTEKKOM':
      // Bidtekkom can access all tickets
      return true;

    case 'PADAL':
      // Req 17.4: Padal can only access tickets assigned to them
      return ticket.padalId === user.id;

    case 'TEKNISI':
      // Req 17.3, 17.5: Teknisi can only access tickets from their Padal
      if (!user.padalId) {
        return false;
      }
      return ticket.padalId === user.padalId;
  }
}

/**
 * Simulates a ticket detail access request.
 */
function accessTicketDetail(user: User, ticket: Ticket): ScopeResult {
  if (canAccessTicket(user, ticket)) {
    return { allowed: true, tickets: [ticket] };
  }
  return { allowed: false, statusCode: 403 };
}

// ─── Arbitraries ─────────────────────────────────────────────────────────────

const userIdArb = fc.uuid();
const roleArb = fc.constantFrom<Role>('SATKER', 'BIDTEKKOM', 'PADAL', 'TEKNISI');

const userArb: fc.Arbitrary<User> = fc.record({
  id: userIdArb,
  role: roleArb,
  padalId: fc.option(userIdArb, { nil: null }),
});

// Generate a user with a specific role
function userWithRole(role: Role): fc.Arbitrary<User> {
  if (role === 'TEKNISI') {
    return fc.record({
      id: userIdArb,
      role: fc.constant(role as Role),
      padalId: fc.option(userIdArb, { nil: null }),
    });
  }
  return fc.record({
    id: userIdArb,
    role: fc.constant(role as Role),
    padalId: fc.constant(null as string | null),
  });
}

const ticketArb: fc.Arbitrary<Ticket> = fc.record({
  id: userIdArb,
  creatorId: userIdArb,
  padalId: fc.option(userIdArb, { nil: null }),
});

const ticketListArb = fc.array(ticketArb, { minLength: 0, maxLength: 20 });

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Property 12: Role-Based Data Scoping', () => {
  describe('SATKER can only see tickets where creatorId matches their userId', () => {
    it('Satker list results contain only tickets created by that Satker', () => {
      fc.assert(
        fc.property(userWithRole('SATKER'), ticketListArb, (satker, tickets) => {
          const visible = getVisibleTickets(satker, tickets);

          // Every visible ticket must have creatorId === satker.id
          for (const ticket of visible) {
            expect(ticket.creatorId).toBe(satker.id);
          }

          // Every ticket with creatorId === satker.id must be visible
          const expectedCount = tickets.filter((t) => t.creatorId === satker.id).length;
          expect(visible.length).toBe(expectedCount);
        }),
        { numRuns: 200 }
      );
    });
  });

  describe('BIDTEKKOM can see all tickets regardless of creatorId/padalId', () => {
    it('Bidtekkom list results contain all tickets', () => {
      fc.assert(
        fc.property(userWithRole('BIDTEKKOM'), ticketListArb, (bidtekkom, tickets) => {
          const visible = getVisibleTickets(bidtekkom, tickets);

          // Bidtekkom sees everything
          expect(visible.length).toBe(tickets.length);
          expect(visible).toEqual(tickets);
        }),
        { numRuns: 200 }
      );
    });
  });

  describe('PADAL can only see tickets where padalId matches their userId', () => {
    it('Padal list results contain only tickets assigned to that Padal', () => {
      fc.assert(
        fc.property(userWithRole('PADAL'), ticketListArb, (padal, tickets) => {
          const visible = getVisibleTickets(padal, tickets);

          // Every visible ticket must have padalId === padal.id
          for (const ticket of visible) {
            expect(ticket.padalId).toBe(padal.id);
          }

          // Every ticket with padalId === padal.id must be visible
          const expectedCount = tickets.filter((t) => t.padalId === padal.id).length;
          expect(visible.length).toBe(expectedCount);
        }),
        { numRuns: 200 }
      );
    });
  });

  describe('TEKNISI can only see tickets where padalId matches their assigned Padal ID', () => {
    it('Teknisi with padalId sees only tickets assigned to their Padal', () => {
      // Generate Teknisi that HAS a padalId
      const teknisiWithPadalArb = fc.record({
        id: userIdArb,
        role: fc.constant('TEKNISI' as Role),
        padalId: userIdArb.map((id) => id as string | null), // always has padalId
      });

      fc.assert(
        fc.property(teknisiWithPadalArb, ticketListArb, (teknisi, tickets) => {
          const visible = getVisibleTickets(teknisi, tickets);

          // Every visible ticket must have padalId === teknisi.padalId
          for (const ticket of visible) {
            expect(ticket.padalId).toBe(teknisi.padalId);
          }

          // Every ticket with padalId === teknisi.padalId must be visible
          const expectedCount = tickets.filter((t) => t.padalId === teknisi.padalId).length;
          expect(visible.length).toBe(expectedCount);
        }),
        { numRuns: 200 }
      );
    });
  });

  describe('TEKNISI without padalId gets empty results', () => {
    it('Teknisi without padalId sees no tickets regardless of ticket data', () => {
      const teknisiNoPadalArb = fc.record({
        id: userIdArb,
        role: fc.constant('TEKNISI' as Role),
        padalId: fc.constant(null as string | null),
      });

      fc.assert(
        fc.property(teknisiNoPadalArb, ticketListArb, (teknisi, tickets) => {
          const visible = getVisibleTickets(teknisi, tickets);

          // Must always be empty
          expect(visible).toEqual([]);
          expect(visible.length).toBe(0);
        }),
        { numRuns: 200 }
      );
    });
  });

  describe('Out-of-scope access returns 403', () => {
    it('Satker accessing another users ticket gets 403', () => {
      fc.assert(
        fc.property(
          userWithRole('SATKER'),
          ticketArb,
          (satker, ticket) => {
            // Ensure ticket is NOT created by this Satker
            fc.pre(ticket.creatorId !== satker.id);

            const result = accessTicketDetail(satker, ticket);
            expect(result.allowed).toBe(false);
            if (!result.allowed) {
              expect(result.statusCode).toBe(403);
            }
          }
        ),
        { numRuns: 200 }
      );
    });

    it('Padal accessing ticket not assigned to them gets 403', () => {
      fc.assert(
        fc.property(
          userWithRole('PADAL'),
          ticketArb,
          (padal, ticket) => {
            // Ensure ticket is NOT assigned to this Padal
            fc.pre(ticket.padalId !== padal.id);

            const result = accessTicketDetail(padal, ticket);
            expect(result.allowed).toBe(false);
            if (!result.allowed) {
              expect(result.statusCode).toBe(403);
            }
          }
        ),
        { numRuns: 200 }
      );
    });

    it('Teknisi accessing ticket not assigned to their Padal gets 403', () => {
      const teknisiWithPadalArb = fc.record({
        id: userIdArb,
        role: fc.constant('TEKNISI' as Role),
        padalId: userIdArb.map((id) => id as string | null),
      });

      fc.assert(
        fc.property(
          teknisiWithPadalArb,
          ticketArb,
          (teknisi, ticket) => {
            // Ensure ticket is NOT assigned to teknisi's Padal
            fc.pre(ticket.padalId !== teknisi.padalId);

            const result = accessTicketDetail(teknisi, ticket);
            expect(result.allowed).toBe(false);
            if (!result.allowed) {
              expect(result.statusCode).toBe(403);
            }
          }
        ),
        { numRuns: 200 }
      );
    });

    it('Teknisi without padalId always gets 403 for any ticket', () => {
      const teknisiNoPadalArb = fc.record({
        id: userIdArb,
        role: fc.constant('TEKNISI' as Role),
        padalId: fc.constant(null as string | null),
      });

      fc.assert(
        fc.property(teknisiNoPadalArb, ticketArb, (teknisi, ticket) => {
          const result = accessTicketDetail(teknisi, ticket);
          expect(result.allowed).toBe(false);
          if (!result.allowed) {
            expect(result.statusCode).toBe(403);
          }
        }),
        { numRuns: 200 }
      );
    });

    it('Bidtekkom never gets 403 for any ticket', () => {
      fc.assert(
        fc.property(userWithRole('BIDTEKKOM'), ticketArb, (bidtekkom, ticket) => {
          const result = accessTicketDetail(bidtekkom, ticket);
          expect(result.allowed).toBe(true);
          if (result.allowed) {
            expect(result.tickets).toEqual([ticket]);
          }
        }),
        { numRuns: 200 }
      );
    });
  });

  describe('Cross-role scoping consistency', () => {
    it('for any user and ticket set, visible tickets are a subset of all tickets', () => {
      fc.assert(
        fc.property(userArb, ticketListArb, (user, tickets) => {
          const visible = getVisibleTickets(user, tickets);

          // Visible tickets must be a subset of all tickets
          for (const v of visible) {
            expect(tickets).toContainEqual(v);
          }

          // Visible count must not exceed total
          expect(visible.length).toBeLessThanOrEqual(tickets.length);
        }),
        { numRuns: 200 }
      );
    });

    it('same-role users with different IDs see different scoped data (except Bidtekkom)', () => {
      fc.assert(
        fc.property(
          userWithRole('SATKER'),
          userWithRole('SATKER'),
          ticketListArb,
          (satker1, satker2, tickets) => {
            fc.pre(satker1.id !== satker2.id);

            const visible1 = getVisibleTickets(satker1, tickets);
            const visible2 = getVisibleTickets(satker2, tickets);

            // No ticket should appear in both lists (since creatorId can only match one)
            for (const t of visible1) {
              expect(visible2).not.toContainEqual(t);
            }
          }
        ),
        { numRuns: 200 }
      );
    });
  });
});
