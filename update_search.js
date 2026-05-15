const fs = require('fs');
const file = 'backend/src/services/ticketService.ts';
let content = fs.readFileSync(file, 'utf8');

// 1. Add search to TicketFilters
const interfaceFilterOriginal = `export interface TicketFilters {
  unrated?: boolean;
  startDate?: string;
  endDate?: string;
}`;
const interfaceFilterNew = `export interface TicketFilters {
  search?: string;
  unrated?: boolean;
  startDate?: string;
  endDate?: string;
}`;

if (content.includes(interfaceFilterOriginal)) {
  content = content.replace(interfaceFilterOriginal, interfaceFilterNew);
} else if (!content.includes('search?: string;')) {
  // alternative replacement if formatting is slightly different
  content = content.replace('export interface TicketFilters {', 'export interface TicketFilters {\n  search?: string;');
}

// 2. Add the search logic before the unrated filter
const searchLogic = `
  if (filters?.search?.trim()) {
    where.OR = [
      { judul: { contains: filters.search.trim() } },
      { nomorTiket: { contains: filters.search.trim() } },
    ];
  }
`;

content = content.split('  // Support unrated=true filter').join(searchLogic + '  // Support unrated=true filter');

fs.writeFileSync(file, content);
console.log('ticketService.ts updated successfully.');
