// CareBridge: CareBridge application source file.
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create test hospitals
  const hospitalA = await prisma.hospital.create({
    data: {
      name: 'Hospital A',
      code: 'HOSPITAL_A',
      clientId: 'hospital_a_client_id',
      clientSecret: 'hospital_a_client_secret',
      redirectUri: 'http://localhost:4000/oauth/callback',
      endpoint: 'http://localhost:4000/api/v1',
      isActive: true,
    },
  });

  const hospitalB = await prisma.hospital.create({
    data: {
      name: 'Hospital B',
      code: 'HOSPITAL_B',
      clientId: 'hospital_b_client_id',
      clientSecret: 'hospital_b_client_secret',
      redirectUri: 'http://localhost:4001/oauth/callback',
      endpoint: 'http://localhost:4001/api/v1',
      isActive: true,
    },
  });

  // Create test patient
  const passwordHash = await bcrypt.hash('password123', 10);
  const patient = await prisma.patient.create({
    data: {
      externalId: 'PAT_001',
      email: 'john.doe@example.com',
      passwordHash,
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: new Date('1990-01-15'),
      gender: 'M',
      phoneNumber: '+1-555-0100',
      address: '123 Main St',
      city: 'Springfield',
      state: 'IL',
      zipCode: '62701',
    },
  });

  // Create a consent request
  await prisma.consentRequest.create({
    data: {
      patientId: patient.id,
      requestingHospitalId: hospitalB.id,
      dataType: 'allergies',
      description: 'Request for allergy information',
      status: 'pending',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
  });

  // Create hospital mapping
  await prisma.hospitalMapping.create({
    data: {
      hospitalId: hospitalA.id,
      externalCode: 'HA_MAPPING',
      externalEndpoint: 'http://localhost:4000/api/v1',
    },
  });

  console.log('✅ Database seeded successfully!');
  console.log('📊 Created:');
  console.log(`  - 2 hospitals`);
  console.log(`  - 1 patient: ${patient.email}`);
  console.log(`  - 1 consent request`);
  console.log(`  - 1 hospital mapping`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
