import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const prisma = new PrismaClient();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseCSV(csvString) {
  const lines = csvString.trim().split('\n');
  if (lines.length === 0) return [];

  const headers = lines[0].split(',').map(header => header.trim());
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(value => value.trim());
    if (values.length !== headers.length) {
      console.warn(`Skipping malformed row: ${lines[i]}`);
      continue;
    }
    const row = {};
    for (let j = 0; j < headers.length; j++) {
      let value = values[j];
      // Remove surrounding quotes if present
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
      }
      row[headers[j]] = value === '' ? null : value;
    }
    data.push(row);
  }
  return data;
}

async function basicImport() {
  try {
    console.log('Starting basic data import...');

    // First, create a test user
    console.log('Creating test user...');
    const testUser = await prisma.user.upsert({
      where: { email: 'test@example.com' },
      update: {},
      create: {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      },
    });
    console.log('✓ Test user created:', testUser.email);

    // Import some basic gift card types
    console.log('Creating basic gift card types...');
    const basicTypes = [
      { name: 'McDonald\'s', color: '#fcbf49' },
      { name: 'BuyMe', color: '#0f3460' },
      { name: 'GOLF', color: '#4361ee' },
      { name: 'Carrefour', color: '#4cc9f0' },
    ];

    for (const type of basicTypes) {
      try {
        await prisma.giftCardType.create({
          data: {
            name: type.name,
            color: type.color,
          },
        });
        console.log(`✓ Created gift card type: ${type.name}`);
      } catch (error) {
        console.log(`Gift card type ${type.name} might already exist`);
      }
    }

    // Import some basic user card types
    console.log('Creating user card types...');
    const userTypes = [
      { name: 'מקדונלדס', color: '#fcbf49', user_email: 'test@example.com' },
      { name: 'BuyMe', color: '#0f3460', user_email: 'test@example.com' },
      { name: 'GOLF', color: '#4361ee', user_email: 'test@example.com' },
    ];

    for (const type of userTypes) {
      try {
        await prisma.userCardType.create({
          data: {
            name: type.name,
            color: type.color,
            user_email: type.user_email,
            created_date: new Date(),
            updated_date: new Date(),
          },
        });
        console.log(`✓ Created user card type: ${type.name}`);
      } catch (error) {
        console.log(`User card type ${type.name} might already exist`);
      }
    }

    // Create some sample gift cards
    console.log('Creating sample gift cards...');
    const sampleCards = [
      {
        card_name: 'McDonald\'s Gift Card',
        balance: 100,
        card_type: 'מקדונלדס',
        owner_email: 'test@example.com',
      },
      {
        card_name: 'BuyMe Gift Card',
        balance: 50,
        card_type: 'BuyMe',
        owner_email: 'test@example.com',
      },
      {
        card_name: 'GOLF Gift Card',
        balance: 200,
        card_type: 'GOLF',
        owner_email: 'test@example.com',
      },
    ];

    for (const card of sampleCards) {
      await prisma.giftCard.create({
        data: {
          ...card,
          created_date: new Date(),
          updated_date: new Date(),
        },
      });
      console.log(`✓ Created gift card: ${card.card_name}`);
    }

    // Create a sample group
    console.log('Creating sample group...');
    await prisma.group.create({
      data: {
        name: 'Family',
        group_name: 'Family',
        owner_email: 'test@example.com',
        created_date: new Date(),
      },
    });
    console.log('✓ Created group: Family');

    console.log('Basic data import completed successfully!');
    console.log('\nYou can now login with:');
    console.log('Email: test@example.com');
    console.log('Password: password123');

  } catch (error) {
    console.error('Error importing data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

basicImport();
