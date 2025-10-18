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
    return new Date(dateStr);
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

async function importData() {
  try {
    console.log('Starting data import...');

    // Import Users first (from GiftCard data)
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
            name: email.split('@')[0], // Use email prefix as name
            password: 'imported_user', // Placeholder password
          }
        });
      } catch (error) {
        console.log(`User ${email} already exists or error:`, error.message);
      }
    }

    // Import GiftCardTypes
    console.log('Importing GiftCardTypes...');
    const giftCardTypeData = parseCSV(fs.readFileSync(path.join(__dirname, './data/GiftCardType_export.csv'), 'utf8'));
    for (const type of giftCardTypeData) {
      try {
        await prisma.giftCardType.upsert({
          where: { id: type.id },
          update: {
            name: type.name,
            website: type.website,
            logo_url: type.logo_url,
            supported_stores: parseJSONArray(type.supported_stores),
            description: type.description,
            type_color: type.type_color,
            created_date: parseDate(type.created_date),
            updated_date: parseDate(type.updated_date),
            created_by: type.created_by,
          },
          create: {
            id: type.id,
            name: type.name,
            website: type.website,
            logo_url: type.logo_url,
            supported_stores: parseJSONArray(type.supported_stores),
            description: type.description,
            type_color: type.type_color,
            created_date: parseDate(type.created_date),
            updated_date: parseDate(type.updated_date),
            created_by: type.created_by,
          }
        });
      } catch (error) {
        console.log(`GiftCardType ${type.id} error:`, error.message);
      }
    }

    // Import UserCardTypes
    console.log('Importing UserCardTypes...');
    const userCardTypeData = parseCSV(fs.readFileSync(path.join(__dirname, './data/UserCardType_export.csv'), 'utf8'));
    for (const type of userCardTypeData) {
      try {
        await prisma.userCardType.upsert({
          where: { id: type.id },
          update: {
            name: type.name,
            website: type.website,
            supported_stores: parseJSONArray(type.supported_stores),
            description: type.description,
            user_email: type.user_email,
            type_color: type.type_color,
            created_date: parseDate(type.created_date),
            updated_date: parseDate(type.updated_date),
            created_by: type.created_by,
          },
          create: {
            id: type.id,
            name: type.name,
            website: type.website,
            supported_stores: parseJSONArray(type.supported_stores),
            description: type.description,
            user_email: type.user_email,
            type_color: type.type_color,
            created_date: parseDate(type.created_date),
            updated_date: parseDate(type.updated_date),
            created_by: type.created_by,
          }
        });
      } catch (error) {
        console.log(`UserCardType ${type.id} error:`, error.message);
      }
    }

    // Import Groups
    console.log('Importing Groups...');
    const groupData = parseCSV(fs.readFileSync(path.join(__dirname, './data/Group_export.csv'), 'utf8'));
    for (const group of groupData) {
      try {
        await prisma.group.upsert({
          where: { id: group.id },
          update: {
            name: group.name,
            description: group.description,
            members: parseJSONArray(group.members),
            owner_email: group.owner_email,
            group_color: group.group_color,
            created_date: parseDate(group.created_date),
            updated_date: parseDate(group.updated_date),
            created_by: group.created_by,
          },
          create: {
            id: group.id,
            name: group.name,
            description: group.description,
            members: parseJSONArray(group.members),
            owner_email: group.owner_email,
            group_color: group.group_color,
            created_date: parseDate(group.created_date),
            updated_date: parseDate(group.updated_date),
            created_by: group.created_by,
          }
        });
      } catch (error) {
        console.log(`Group ${group.id} error:`, error.message);
      }
    }

    // Import GiftCards
    console.log('Importing GiftCards...');
    for (const card of giftCardData) {
      try {
        await prisma.giftCard.upsert({
          where: { id: card.id },
          update: {
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
            created_date: parseDate(card.created_date),
            updated_date: parseDate(card.updated_date),
            created_by: card.created_by,
          },
          create: {
            id: card.id,
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
            created_date: parseDate(card.created_date),
            updated_date: parseDate(card.updated_date),
            created_by: card.created_by,
          }
        });
      } catch (error) {
        console.log(`GiftCard ${card.id} error:`, error.message);
      }
    }

    // Import SharedCards
    console.log('Importing SharedCards...');
    const sharedCardData = parseCSV(fs.readFileSync(path.join(__dirname, './data/SharedCard_export.csv'), 'utf8'));
    for (const card of sharedCardData) {
      try {
        await prisma.sharedCard.upsert({
          where: { id: card.id },
          update: {
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
            created_date: parseDate(card.created_date),
            updated_date: parseDate(card.updated_date),
            created_by: card.created_by,
          },
          create: {
            id: card.id,
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
            created_date: parseDate(card.created_date),
            updated_date: parseDate(card.updated_date),
            created_by: card.created_by,
          }
        });
      } catch (error) {
        console.log(`SharedCard ${card.id} error:`, error.message);
      }
    }

    // Import ArchivedCards
    console.log('Importing ArchivedCards...');
    const archivedCardData = parseCSV(fs.readFileSync(path.join(__dirname, './data/ArchivedCard_export.csv'), 'utf8'));
    for (const card of archivedCardData) {
      try {
        await prisma.archivedCard.upsert({
          where: { id: card.id },
          update: {
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
            archived_date: parseDate(card.archived_date),
            original_card_id: card.original_card_id,
            created_date: parseDate(card.created_date),
            updated_date: parseDate(card.updated_date),
            created_by: card.created_by,
          },
          create: {
            id: card.id,
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
            archived_date: parseDate(card.archived_date),
            original_card_id: card.original_card_id,
            created_date: parseDate(card.created_date),
            updated_date: parseDate(card.updated_date),
            created_by: card.created_by,
          }
        });
      } catch (error) {
        console.log(`ArchivedCard ${card.id} error:`, error.message);
      }
    }

    // Import Transactions
    console.log('Importing Transactions...');
    const transactionData = parseCSV(fs.readFileSync(path.join(__dirname, './data/Transaction_export.csv'), 'utf8'));
    for (const transaction of transactionData) {
      try {
        await prisma.transaction.upsert({
          where: { id: transaction.id },
          update: {
            gift_card_id: transaction.gift_card_id,
            amount: parseNumber(transaction.amount),
            store_name: transaction.store_name,
            transaction_date: parseDate(transaction.transaction_date),
            notes: transaction.notes,
            user_email: transaction.created_by,
            created_date: parseDate(transaction.created_date),
            updated_date: parseDate(transaction.updated_date),
            created_by: transaction.created_by,
          },
          create: {
            id: transaction.id,
            gift_card_id: transaction.gift_card_id,
            amount: parseNumber(transaction.amount),
            store_name: transaction.store_name,
            transaction_date: parseDate(transaction.transaction_date),
            notes: transaction.notes,
            user_email: transaction.created_by,
            created_date: parseDate(transaction.created_date),
            updated_date: parseDate(transaction.updated_date),
            created_by: transaction.created_by,
          }
        });
      } catch (error) {
        console.log(`Transaction ${transaction.id} error:`, error.message);
      }
    }

    // Import CardActivityLogs
    console.log('Importing CardActivityLogs...');
    const activityLogData = parseCSV(fs.readFileSync(path.join(__dirname, './data/CardActivityLog_export.csv'), 'utf8'));
    for (const log of activityLogData) {
      try {
        await prisma.cardActivityLog.upsert({
          where: { id: log.id },
          update: {
            card_id: log.card_id,
            card_type_field: log.card_type_field,
            action: log.action,
            user_email: log.user_email,
            user_name: log.user_name,
            details: log.details,
            timestamp: parseDate(log.timestamp),
            created_date: parseDate(log.created_date),
            updated_date: parseDate(log.updated_date),
            created_by: log.created_by,
          },
          create: {
            id: log.id,
            card_id: log.card_id,
            card_type_field: log.card_type_field,
            action: log.action,
            user_email: log.user_email,
            user_name: log.user_name,
            details: log.details,
            timestamp: parseDate(log.timestamp),
            created_date: parseDate(log.created_date),
            updated_date: parseDate(log.updated_date),
            created_by: log.created_by,
          }
        });
      } catch (error) {
        console.log(`CardActivityLog ${log.id} error:`, error.message);
      }
    }

    // Import Notifications
    console.log('Importing Notifications...');
    const notificationData = parseCSV(fs.readFileSync(path.join(__dirname, './data/Notification_export.csv'), 'utf8'));
    for (const notification of notificationData) {
      try {
        await prisma.notification.upsert({
          where: { id: notification.id },
          update: {
            card_id: notification.card_id,
            card_name: notification.card_name,
            shared_by_email: notification.shared_by_email,
            shared_by_name: notification.shared_by_name,
            recipient_email: notification.recipient_email,
            notification_type: notification.notification_type,
            is_read: notification.is_read === 'true',
            group_name: notification.group_name,
            created_date: parseDate(notification.created_date),
            updated_date: parseDate(notification.updated_date),
            created_by: notification.created_by,
          },
          create: {
            id: notification.id,
            card_id: notification.card_id,
            card_name: notification.card_name,
            shared_by_email: notification.shared_by_email,
            shared_by_name: notification.shared_by_name,
            recipient_email: notification.recipient_email,
            notification_type: notification.notification_type,
            is_read: notification.is_read === 'true',
            group_name: notification.group_name,
            created_date: parseDate(notification.created_date),
            updated_date: parseDate(notification.updated_date),
            created_by: notification.created_by,
          }
        });
      } catch (error) {
        console.log(`Notification ${notification.id} error:`, error.message);
      }
    }

    console.log('Data import completed successfully!');
  } catch (error) {
    console.error('Error importing data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

importData();
