import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

// Helper function to parse CSV
function parseCSV(csvContent) {
  const lines = csvContent.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim()) {
      const values = lines[i].split(',').map(v => v.replace(/"/g, ''));
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || null;
      });
      data.push(row);
    }
  }
  
  return data;
}

// Helper function to parse JSON arrays from CSV
function parseJSONArray(str) {
  if (!str || str === '[]') return [];
  try {
    return JSON.parse(str);
  } catch {
    return [];
  }
}

// Helper function to parse dates
function parseDate(dateStr) {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

// Helper function to parse numbers
function parseNumber(str) {
  if (!str || str === '') return null;
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

// Generate a simple ID
let idCounter = 1;
function generateId() {
  return idCounter++;
}

async function importData() {
  try {
    console.log('Starting simple data import...');

    // Import Users first
    console.log('Importing Users...');
    const giftCardData = parseCSV(fs.readFileSync(path.join(__dirname, './data/GiftCard_export.csv'), 'utf8'));
    const userEmails = new Set();
    
    // Collect unique user emails
    giftCardData.forEach(card => {
      if (card.created_by) userEmails.add(card.created_by);
    });
    
    // Import users
    for (const email of userEmails) {
      try {
        await prisma.user.upsert({
          where: { email },
          update: {},
          create: {
            email,
            name: email.split('@')[0],
            password: 'imported_user',
          }
        });
        console.log(`✓ User: ${email}`);
      } catch (error) {
        console.log(`✗ User ${email}: ${error.message}`);
      }
    }

    // Import GiftCardTypes
    console.log('Importing GiftCardTypes...');
    const giftCardTypeData = parseCSV(fs.readFileSync(path.join(__dirname, './data/GiftCardType_export.csv'), 'utf8'));
    for (const type of giftCardTypeData) {
      try {
        await prisma.giftCardType.create({
          data: {
            name: type.name,
            website: type.website,
            logo_url: type.logo_url,
            supported_stores: parseJSONArray(type.supported_stores),
            description: type.description,
            type_color: type.type_color,
            created_date: parseDate(type.created_date) || new Date(),
            updated_date: parseDate(type.updated_date) || new Date(),
            created_by: type.created_by,
          }
        });
        console.log(`✓ GiftCardType: ${type.name}`);
      } catch (error) {
        console.log(`✗ GiftCardType ${type.name}: ${error.message}`);
      }
    }

    // Import UserCardTypes
    console.log('Importing UserCardTypes...');
    const userCardTypeData = parseCSV(fs.readFileSync(path.join(__dirname, './data/UserCardType_export.csv'), 'utf8'));
    for (const type of userCardTypeData) {
      try {
        await prisma.userCardType.create({
          data: {
            name: type.name,
            website: type.website,
            supported_stores: parseJSONArray(type.supported_stores),
            description: type.description,
            user_email: type.user_email,
            type_color: type.type_color,
            created_date: parseDate(type.created_date) || new Date(),
            updated_date: parseDate(type.updated_date) || new Date(),
            created_by: type.created_by,
          }
        });
        console.log(`✓ UserCardType: ${type.name}`);
      } catch (error) {
        console.log(`✗ UserCardType ${type.name}: ${error.message}`);
      }
    }

    // Import Groups
    console.log('Importing Groups...');
    const groupData = parseCSV(fs.readFileSync(path.join(__dirname, './data/Group_export.csv'), 'utf8'));
    for (const group of groupData) {
      try {
        await prisma.group.create({
          data: {
            name: group.name,
            description: group.description,
            members: parseJSONArray(group.members),
            owner_email: group.owner_email,
            group_color: group.group_color,
            created_date: parseDate(group.created_date) || new Date(),
            updated_date: parseDate(group.updated_date) || new Date(),
            created_by: group.created_by,
          }
        });
        console.log(`✓ Group: ${group.name}`);
      } catch (error) {
        console.log(`✗ Group ${group.name}: ${error.message}`);
      }
    }

    // Import GiftCards
    console.log('Importing GiftCards...');
    for (const card of giftCardData) {
      try {
        await prisma.giftCard.create({
          data: {
            card_name: card.card_name,
            card_number: card.card_number,
            cvv: card.cvv,
            activation_code: card.activation_code,
            balance: parseNumber(card.balance),
            currency: card.currency,
            expiry_date: parseDate(card.expiry_date),
            purchase_date: parseDate(card.purchase_date),
            card_type: card.card_type,
            online_page_url: card.online_page_url,
            notes: card.notes,
            card_color: card.card_color,
            owner_email: card.created_by,
            created_date: parseDate(card.created_date) || new Date(),
            updated_date: parseDate(card.updated_date) || new Date(),
            created_by: card.created_by,
          }
        });
        console.log(`✓ GiftCard: ${card.card_name}`);
      } catch (error) {
        console.log(`✗ GiftCard ${card.card_name}: ${error.message}`);
      }
    }

    // Import SharedCards
    console.log('Importing SharedCards...');
    const sharedCardData = parseCSV(fs.readFileSync(path.join(__dirname, './data/SharedCard_export.csv'), 'utf8'));
    for (const card of sharedCardData) {
      try {
        await prisma.sharedCard.create({
          data: {
            card_name: card.card_name,
            card_number: card.card_number,
            cvv: card.cvv,
            activation_code: card.activation_code,
            balance: parseNumber(card.balance),
            currency: card.currency,
            expiry_date: parseDate(card.expiry_date),
            purchase_date: parseDate(card.purchase_date),
            card_type: card.card_type,
            online_page_url: card.online_page_url,
            notes: card.notes,
            card_color: card.card_color,
            shared_with: parseJSONArray(card.shared_with),
            owner_email: card.owner_email,
            shared_with_group_id: card.shared_with_group_id,
            group_name: card.group_name,
            created_date: parseDate(card.created_date) || new Date(),
            updated_date: parseDate(card.updated_date) || new Date(),
            created_by: card.created_by,
          }
        });
        console.log(`✓ SharedCard: ${card.card_name}`);
      } catch (error) {
        console.log(`✗ SharedCard ${card.card_name}: ${error.message}`);
      }
    }

    // Import ArchivedCards
    console.log('Importing ArchivedCards...');
    const archivedCardData = parseCSV(fs.readFileSync(path.join(__dirname, './data/ArchivedCard_export.csv'), 'utf8'));
    for (const card of archivedCardData) {
      try {
        await prisma.archivedCard.create({
          data: {
            card_name: card.card_name,
            card_number: card.card_number,
            cvv: card.cvv,
            balance: parseNumber(card.balance),
            currency: card.currency,
            expiry_date: parseDate(card.expiry_date),
            purchase_date: parseDate(card.purchase_date),
            card_type: card.card_type,
            online_page_url: card.online_page_url,
            notes: card.notes,
            card_color: card.card_color,
            archived_date: parseDate(card.archived_date) || new Date(),
            original_card_id: card.original_card_id,
            created_date: parseDate(card.created_date) || new Date(),
            updated_date: parseDate(card.updated_date) || new Date(),
            created_by: card.created_by,
          }
        });
        console.log(`✓ ArchivedCard: ${card.card_name}`);
      } catch (error) {
        console.log(`✗ ArchivedCard ${card.card_name}: ${error.message}`);
      }
    }

    // Import Transactions
    console.log('Importing Transactions...');
    const transactionData = parseCSV(fs.readFileSync(path.join(__dirname, './data/Transaction_export.csv'), 'utf8'));
    for (const transaction of transactionData) {
      try {
        await prisma.transaction.create({
          data: {
            gift_card_id: transaction.gift_card_id,
            amount: parseNumber(transaction.amount),
            store_name: transaction.store_name,
            transaction_date: parseDate(transaction.transaction_date) || new Date(),
            notes: transaction.notes,
            user_email: transaction.created_by,
            created_date: parseDate(transaction.created_date) || new Date(),
            updated_date: parseDate(transaction.updated_date) || new Date(),
            created_by: transaction.created_by,
          }
        });
        console.log(`✓ Transaction: ${transaction.store_name} - ${transaction.amount}`);
      } catch (error) {
        console.log(`✗ Transaction: ${error.message}`);
      }
    }

    // Import CardActivityLogs (skip problematic ones)
    console.log('Importing CardActivityLogs...');
    const activityLogData = parseCSV(fs.readFileSync(path.join(__dirname, './data/CardActivityLog_export.csv'), 'utf8'));
    let successCount = 0;
    for (const log of activityLogData) {
      try {
        // Skip rows with invalid data
        if (!log.card_id || !log.action || !log.user_email) {
          continue;
        }
        
        await prisma.cardActivityLog.create({
          data: {
            card_id: log.card_id,
            card_type_field: log.card_type_field,
            action: log.action,
            user_email: log.user_email,
            user_name: log.user_name,
            details: log.details,
            timestamp: parseDate(log.timestamp) || new Date(),
            created_date: parseDate(log.created_date) || new Date(),
            updated_date: parseDate(log.updated_date) || new Date(),
            created_by: log.created_by,
          }
        });
        successCount++;
      } catch (error) {
        // Skip problematic entries
        continue;
      }
    }
    console.log(`✓ CardActivityLogs: ${successCount} imported`);

    // Import Notifications (skip problematic ones)
    console.log('Importing Notifications...');
    const notificationData = parseCSV(fs.readFileSync(path.join(__dirname, './data/Notification_export.csv'), 'utf8'));
    let notificationSuccessCount = 0;
    for (const notification of notificationData) {
      try {
        // Skip rows with invalid data
        if (!notification.card_id || !notification.notification_type) {
          continue;
        }
        
        await prisma.notification.create({
          data: {
            card_id: notification.card_id,
            card_name: notification.card_name,
            shared_by_email: notification.shared_by_email,
            shared_by_name: notification.shared_by_name,
            recipient_email: notification.recipient_email,
            notification_type: notification.notification_type,
            is_read: notification.is_read === 'true',
            group_name: notification.group_name,
            created_date: parseDate(notification.created_date) || new Date(),
            updated_date: parseDate(notification.updated_date) || new Date(),
            created_by: notification.created_by,
          }
        });
        notificationSuccessCount++;
      } catch (error) {
        // Skip problematic entries
        continue;
      }
    }
    console.log(`✓ Notifications: ${notificationSuccessCount} imported`);

    console.log('Simple data import completed successfully!');
  } catch (error) {
    console.error('Error importing data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

importData();
