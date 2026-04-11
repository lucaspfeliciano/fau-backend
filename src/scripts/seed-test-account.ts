import { randomUUID } from 'crypto';
import { hash } from 'bcryptjs';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import mongoose from 'mongoose';

import { Role } from '../common/auth/role.enum';

type UserMembership = {
  organizationId: string;
  role: Role;
  teamIds: string[];
  joinedAt: string;
};

type UserDocument = {
  id: string;
  email: string;
  name: string;
  googleId?: string;
  passwordHash?: string;
  memberships: UserMembership[];
  currentOrganizationId?: string;
  createdAt: string;
  updatedAt: string;
};

type OrganizationDocument = {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

function loadEnvFile(fileName: string): void {
  const envPath = resolve(process.cwd(), fileName);

  if (!existsSync(envPath)) {
    return;
  }

  const lines = readFileSync(envPath, 'utf8').split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

async function run(): Promise<void> {
  loadEnvFile('.env');

  const mongoUri =
    process.env.MONGODB_URI ?? 'mongodb://localhost:27017/fau-backend';
  const dbName = process.env.MONGODB_DB_NAME ?? 'fau-backend';

  const testUserEmail =
    process.env.SEED_TEST_USER_EMAIL?.trim().toLowerCase() ?? 'teste@fau.local';
  const testUserName = process.env.SEED_TEST_USER_NAME?.trim() ?? 'FAU Tester';
  const testGoogleId =
    process.env.SEED_TEST_USER_GOOGLE_ID?.trim() ?? 'google-fau-tester-001';
  const testUserPassword = process.env.SEED_TEST_USER_PASSWORD ?? 'Senha@123';
  const testOrganizationName =
    process.env.SEED_TEST_ORG_NAME?.trim() ?? 'FAU Test Organization';
  const saltRounds = Number(process.env.PASSWORD_SALT_ROUNDS ?? 10);
  const passwordHash = await hash(testUserPassword, saltRounds);

  await mongoose.connect(mongoUri, { dbName });

  const users = mongoose.connection.collection<UserDocument>('users');
  const organizations =
    mongoose.connection.collection<OrganizationDocument>('organizations');

  const now = new Date().toISOString();

  const existingUser = await users.findOne({
    $or: [{ email: testUserEmail }, { googleId: testGoogleId }],
  });

  const userId = existingUser?.id ?? randomUUID();
  const existingOrganization = await organizations.findOne({
    name: testOrganizationName,
  });
  const organizationId = existingOrganization?.id ?? randomUUID();

  await organizations.updateOne(
    { id: organizationId },
    {
      $set: {
        id: organizationId,
        name: testOrganizationName,
        createdBy: existingOrganization?.createdBy ?? userId,
        createdAt: existingOrganization?.createdAt ?? now,
        updatedAt: now,
      },
    },
    { upsert: true },
  );

  const existingMemberships = existingUser?.memberships ?? [];
  const membershipIndex = existingMemberships.findIndex(
    (membership) => membership.organizationId === organizationId,
  );

  let memberships: UserMembership[];

  if (membershipIndex >= 0) {
    memberships = existingMemberships.map((membership, index) => {
      if (index !== membershipIndex) {
        return membership;
      }

      return {
        ...membership,
        role: Role.Admin,
      };
    });
  } else {
    memberships = [
      ...existingMemberships,
      {
        organizationId,
        role: Role.Admin,
        teamIds: [],
        joinedAt: now,
      },
    ];
  }

  const userToPersist: UserDocument = {
    id: userId,
    email: testUserEmail,
    name: testUserName,
    googleId: testGoogleId,
    passwordHash,
    memberships,
    currentOrganizationId: organizationId,
    createdAt: existingUser?.createdAt ?? now,
    updatedAt: now,
  };

  await users.updateOne(
    { id: userId },
    {
      $set: userToPersist,
    },
    { upsert: true },
  );

  console.log('Test account ready.');
  console.log(`Email: ${testUserEmail}`);
  console.log(`Password: ${testUserPassword}`);
  console.log(`Google ID: ${testGoogleId}`);
  console.log(`Organization: ${testOrganizationName} (${organizationId})`);
  console.log('Use POST /auth/login with these fields to get JWT:');
  console.log(
    JSON.stringify(
      {
        email: testUserEmail,
        password: testUserPassword,
      },
      null,
      2,
    ),
  );
  console.log('Use POST /auth/google with these fields to get JWT:');
  console.log(
    JSON.stringify(
      {
        googleId: testGoogleId,
        email: testUserEmail,
        name: testUserName,
        organizationName: testOrganizationName,
      },
      null,
      2,
    ),
  );

  await mongoose.disconnect();
}

run().catch(async (error: unknown) => {
  console.error('Seed failed:', error);
  await mongoose.disconnect();
  process.exit(1);
});
