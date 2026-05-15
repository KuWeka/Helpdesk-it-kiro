import { prisma } from '../lib/prisma';
import { Role, TicketStatus, TicketCategory } from '@prisma/client';
import bcrypt from 'bcryptjs';


const DEFAULT_PASSWORD = 'Password123';
const SALT_ROUNDS = 10;

async function main() {
  console.log('🌱 Seeding database...');

  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);

  // --- Users ---

  // 1 Bidtekkom
  const bidtekkom = await prisma.user.upsert({
    where: { email: 'bidtekkom@polda-kalsel.id' },
    update: {},
    create: {
      nama: 'Kompol Hendra Wijaya',
      email: 'bidtekkom@polda-kalsel.id',
      password: hashedPassword,
      nomorWhatsApp: '081234567001',
      role: Role.BIDTEKKOM,
      divisi: 'Bidtekkom',
    },
  });
  console.log(`  ✓ Bidtekkom: ${bidtekkom.nama}`);

  // 2 Padal
  const padal1 = await prisma.user.upsert({
    where: { email: 'padal1@polda-kalsel.id' },
    update: {},
    create: {
      nama: 'AKP Rizky Firmansyah',
      email: 'padal1@polda-kalsel.id',
      password: hashedPassword,
      nomorWhatsApp: '081234567002',
      role: Role.PADAL,
      divisi: 'Bidtekkom',
    },
  });

  const padal2 = await prisma.user.upsert({
    where: { email: 'padal2@polda-kalsel.id' },
    update: {},
    create: {
      nama: 'AKP Siti Nurhaliza',
      email: 'padal2@polda-kalsel.id',
      password: hashedPassword,
      nomorWhatsApp: '081234567003',
      role: Role.PADAL,
      divisi: 'Bidtekkom',
    },
  });
  console.log(`  ✓ Padal: ${padal1.nama}, ${padal2.nama}`);

  // 3 Teknisi (assigned to Padal)
  const teknisi1 = await prisma.user.upsert({
    where: { email: 'teknisi1@polda-kalsel.id' },
    update: {},
    create: {
      nama: 'Bripka Ahmad Fauzi',
      email: 'teknisi1@polda-kalsel.id',
      password: hashedPassword,
      nomorWhatsApp: '081234567004',
      role: Role.TEKNISI,
      divisi: 'Bidtekkom',
      padalId: padal1.id,
    },
  });

  const teknisi2 = await prisma.user.upsert({
    where: { email: 'teknisi2@polda-kalsel.id' },
    update: {},
    create: {
      nama: 'Bripka Dian Saputra',
      email: 'teknisi2@polda-kalsel.id',
      password: hashedPassword,
      nomorWhatsApp: '081234567005',
      role: Role.TEKNISI,
      divisi: 'Bidtekkom',
      padalId: padal1.id,
    },
  });

  const teknisi3 = await prisma.user.upsert({
    where: { email: 'teknisi3@polda-kalsel.id' },
    update: {},
    create: {
      nama: 'Bripka Eko Prasetyo',
      email: 'teknisi3@polda-kalsel.id',
      password: hashedPassword,
      nomorWhatsApp: '081234567006',
      role: Role.TEKNISI,
      divisi: 'Bidtekkom',
      padalId: padal2.id,
    },
  });
  console.log(`  ✓ Teknisi: ${teknisi1.nama}, ${teknisi2.nama}, ${teknisi3.nama}`);

  // 3 Satker (with divisi set)
  const satker1 = await prisma.user.upsert({
    where: { email: 'satker1@polda-kalsel.id' },
    update: {},
    create: {
      nama: 'IPTU Bambang Suryanto',
      email: 'satker1@polda-kalsel.id',
      password: hashedPassword,
      nomorWhatsApp: '081234567007',
      role: Role.SATKER,
      divisi: 'Ditreskrimsus',
    },
  });

  const satker2 = await prisma.user.upsert({
    where: { email: 'satker2@polda-kalsel.id' },
    update: {},
    create: {
      nama: 'IPTU Ratna Dewi',
      email: 'satker2@polda-kalsel.id',
      password: hashedPassword,
      nomorWhatsApp: '081234567008',
      role: Role.SATKER,
      divisi: 'Ditlantas',
    },
  });

  const satker3 = await prisma.user.upsert({
    where: { email: 'satker3@polda-kalsel.id' },
    update: {},
    create: {
      nama: 'IPTU Muhammad Yusuf',
      email: 'satker3@polda-kalsel.id',
      password: hashedPassword,
      nomorWhatsApp: '081234567009',
      role: Role.SATKER,
      divisi: 'Ditresnarkoba',
    },
  });
  console.log(`  ✓ Satker: ${satker1.nama}, ${satker2.nama}, ${satker3.nama}`);

  // --- SystemSettings ---
  await prisma.systemSettings.upsert({
    where: { id: 'default-settings' },
    update: {},
    create: {
      id: 'default-settings',
      appName: 'PoldaHelp Kalsel',
    },
  });
  console.log('  ✓ SystemSettings: PoldaHelp Kalsel');

  // --- TicketSequence ---
  const currentYear = new Date().getFullYear();
  await prisma.ticketSequence.upsert({
    where: { year: currentYear },
    update: {},
    create: {
      year: currentYear,
      seq: 5, // We'll create 5 tickets below
    },
  });

  // --- Sample Tickets ---

  // Ticket 1: PENDING
  await prisma.ticket.upsert({
    where: { nomorTiket: `TKT-${currentYear}-00001` },
    update: {},
    create: {
      nomorTiket: `TKT-${currentYear}-00001`,
      judul: 'Printer tidak bisa mencetak',
      deskripsi: 'Printer HP LaserJet di ruang Ditreskrimsus tidak merespon perintah cetak dari komputer manapun. Sudah dicoba restart tapi tetap tidak bisa.',
      kategori: TicketCategory.HARDWARE,
      lokasi: 'Gedung Ditreskrimsus Lt. 2, Ruang Administrasi',
      status: TicketStatus.PENDING,
      divisiSatker: 'Ditreskrimsus',
      creatorId: satker1.id,
    },
  });

  // Ticket 2: PROSES (assigned to padal1)
  await prisma.ticket.upsert({
    where: { nomorTiket: `TKT-${currentYear}-00002` },
    update: {},
    create: {
      nomorTiket: `TKT-${currentYear}-00002`,
      judul: 'Koneksi internet lambat',
      deskripsi: 'Koneksi internet di seluruh lantai 3 Ditlantas sangat lambat sejak kemarin. Speed test menunjukkan hanya 1 Mbps padahal biasanya 50 Mbps.',
      kategori: TicketCategory.JARINGAN,
      lokasi: 'Gedung Ditlantas Lt. 3',
      status: TicketStatus.PROSES,
      divisiSatker: 'Ditlantas',
      creatorId: satker2.id,
      padalId: padal1.id,
      tanggalAssign: new Date(),
    },
  });

  // Ticket 3: SELESAI (assigned to padal1, completed)
  await prisma.ticket.upsert({
    where: { nomorTiket: `TKT-${currentYear}-00003` },
    update: {},
    create: {
      nomorTiket: `TKT-${currentYear}-00003`,
      judul: 'Email tidak bisa login',
      deskripsi: 'Tidak bisa login ke email dinas @polda-kalsel.id. Muncul pesan "invalid credentials" padahal password sudah benar.',
      kategori: TicketCategory.EMAIL,
      lokasi: 'Gedung Ditresnarkoba Lt. 1, Ruang Penyidik',
      status: TicketStatus.SELESAI,
      divisiSatker: 'Ditresnarkoba',
      creatorId: satker3.id,
      padalId: padal1.id,
      tanggalAssign: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      tanggalSelesai: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    },
  });

  // Ticket 4: DIBATALKAN
  await prisma.ticket.upsert({
    where: { nomorTiket: `TKT-${currentYear}-00004` },
    update: {},
    create: {
      nomorTiket: `TKT-${currentYear}-00004`,
      judul: 'Aplikasi SIPP error saat input data',
      deskripsi: 'Aplikasi SIPP menampilkan error 500 saat mencoba input data perkara baru.',
      kategori: TicketCategory.SOFTWARE,
      lokasi: 'Gedung Ditreskrimsus Lt. 1',
      status: TicketStatus.DIBATALKAN,
      divisiSatker: 'Ditreskrimsus',
      creatorId: satker1.id,
      alasanBatal: 'Masalah sudah teratasi sendiri setelah update aplikasi dari pusat.',
    },
  });

  // Ticket 5: PROSES (assigned to padal2)
  await prisma.ticket.upsert({
    where: { nomorTiket: `TKT-${currentYear}-00005` },
    update: {},
    create: {
      nomorTiket: `TKT-${currentYear}-00005`,
      judul: 'Website internal tidak bisa diakses',
      deskripsi: 'Website portal internal Polda Kalsel menampilkan halaman kosong saat diakses dari jaringan kantor.',
      kategori: TicketCategory.WEBSITE,
      lokasi: 'Gedung Utama Lt. 2, Ruang Ditlantas',
      status: TicketStatus.PROSES,
      divisiSatker: 'Ditlantas',
      creatorId: satker2.id,
      padalId: padal2.id,
      tanggalAssign: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    },
  });

  console.log('  ✓ 5 sample tickets created');

  // --- Rating for completed ticket ---
  const completedTicket = await prisma.ticket.findUnique({
    where: { nomorTiket: `TKT-${currentYear}-00003` },
  });

  if (completedTicket) {
    await prisma.rating.upsert({
      where: { ticketId: completedTicket.id },
      update: {},
      create: {
        ticketId: completedTicket.id,
        userId: satker3.id,
        bintang: 5,
        feedback: 'Penanganan cepat dan profesional. Terima kasih tim Bidtekkom!',
      },
    });
    console.log('  ✓ Rating for completed ticket');
  }

  console.log('\n✅ Seed completed successfully!');
  console.log('\n📋 Test Accounts:');
  console.log('  All passwords: Password123');
  console.log('  Bidtekkom: bidtekkom@polda-kalsel.id');
  console.log('  Padal 1:   padal1@polda-kalsel.id');
  console.log('  Padal 2:   padal2@polda-kalsel.id');
  console.log('  Teknisi 1: teknisi1@polda-kalsel.id');
  console.log('  Teknisi 2: teknisi2@polda-kalsel.id');
  console.log('  Teknisi 3: teknisi3@polda-kalsel.id');
  console.log('  Satker 1:  satker1@polda-kalsel.id');
  console.log('  Satker 2:  satker2@polda-kalsel.id');
  console.log('  Satker 3:  satker3@polda-kalsel.id');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
