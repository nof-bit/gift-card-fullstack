import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables before initializing Prisma
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const prisma = new PrismaClient();
const router = express.Router();

const models = {
  GiftCard: prisma.giftCard,
  Transaction: prisma.transaction,
  GiftCardType: prisma.giftCardType,
  ArchivedCard: prisma.archivedCard,
  SharedCard: prisma.sharedCard,
  UserCardType: prisma.userCardType,
  CardActivityLog: prisma.cardActivityLog,
  ArchiveRequest: prisma.archiveRequest,
  Group: prisma.group,
  Notification: prisma.notification,
  User: prisma.user,
  Store: prisma.store
};

function buildWhere(where){
  if(!where) return {};
  const out = {};
  for(const k of Object.keys(where)){
    const v = where[k];
    if(v && typeof v === 'object'){
      if('$in' in v){
        out[k] = { in: Array.isArray(v.$in) ? v.$in : [] }
      } else if('$exists' in v){
        if(v.$exists === false){
          out[k] = { equals: null }
        } else {
          out[k] = { not: null }
        }
      } else if('$ne' in v){
        out[k] = { not: v.$ne }
      } else if('$gt' in v){
        out[k] = { gt: v.$gt }
      } else if('$gte' in v){
        out[k] = { gte: v.$gte }
      } else if('$lt' in v){
        out[k] = { lt: v.$lt }
      } else if('$lte' in v){
        out[k] = { lte: v.$lte }
      } else {
        out[k] = v;
      }
    } else {
      out[k] = v;
    }
  }
  return out;
}

function transformGroupData(groups) {
  return groups.map(group => {
    if (group.members && typeof group.members === 'string') {
      try {
        group.members = JSON.parse(group.members);
      } catch (e) {
        console.warn('Failed to parse members JSON:', e);
        group.members = [];
      }
    } else if (!group.members) {
      group.members = [];
    }
    return group;
  });
}

function transformGroupDataForDB(data) {
  if (data.members && Array.isArray(data.members)) {
    data.members = JSON.stringify(data.members);
  }
  return data;
}

async function logCardActivity(cardId, action, userEmail, cardData, beforeData = null, cardType = 'GiftCard', sharedWith = null) {
  try {
    // Get user name from database
    let userName = userEmail;
    try {
      const user = await prisma.user.findUnique({
        where: { email: userEmail },
        select: { name: true }
      });
      if (user && user.name) {
        userName = user.name;
      }
    } catch (userError) {
      console.warn('Could not fetch user name:', userError);
    }

    // Create detailed changes description for all actions
    let details = null;
      const changes = [];
      
    // Define fields to compare for all actions
      const fieldsToCompare = [
        { key: 'card_name', label: 'Card Name' },
        { key: 'card_type', label: 'Card Type' },
        { key: 'balance', label: 'Balance' },
        { key: 'expiry_date', label: 'Expiry Date' },
        { key: 'card_number', label: 'Card Number' },
        { key: 'cvv', label: 'CVV' },
        { key: 'activation_code', label: 'Activation Code' },
        { key: 'online_page_url', label: 'Website URL' },
        { key: 'notes', label: 'Notes' },
        { key: 'card_color', label: 'Card Color' },
      { key: 'purchase_date', label: 'Purchase Date' },
      { key: 'vendor', label: 'Vendor' },
      { key: 'card_image_url', label: 'Card Image URL' }
    ];

    // Create action-specific details
    if (action === 'created') {
      details = {
        action_description: `Card "${cardData.card_name || 'Unknown'}" was created`,
        card_type: cardData.card_type || 'Unknown',
        balance: cardData.balance || 0,
        vendor: cardData.vendor || 'Unknown'
      };
    } else if (action === 'edit' && beforeData && cardData) {
      // Compare each field and create change descriptions
      fieldsToCompare.forEach(field => {
        const oldValue = beforeData[field.key];
        const newValue = cardData[field.key];
        
        // Normalize values for comparison
        const normalizedOldValue = (oldValue === null || oldValue === undefined || oldValue === '') ? null : oldValue;
        const normalizedNewValue = (newValue === null || newValue === undefined || newValue === '') ? null : newValue;
        
        if (normalizedOldValue !== normalizedNewValue) {
          changes.push({
            field: field.label,
            before: normalizedOldValue,
            after: normalizedNewValue,
            description: `${field.label}: "${normalizedOldValue || 'Empty'}" → "${normalizedNewValue || 'Empty'}"`
          });
        }
      });
      
      if (changes.length > 0) {
        details = { 
          action_description: `Card "${cardData.card_name || 'Unknown'}" was edited`,
          changes 
        };
      }
    } else if (action === 'payment') {
      details = {
        action_description: `Payment made on card "${cardData.card_name || 'Unknown'}"`,
        payment_amount: cardData.payment_amount || 0,
        new_balance: cardData.balance || 0,
        store: cardData.store_name || 'Unknown Store'
      };
    } else if (action === 'share') {
      details = {
        action_description: `Card "${cardData.card_name || 'Unknown'}" was shared`,
        shared_with: sharedWith || 'Unknown',
        card_type: cardData.card_type || 'Unknown'
      };
    } else if (action === 'archive') {
      details = {
        action_description: `Card "${cardData.card_name || 'Unknown'}" was archived`,
        final_balance: cardData.balance || 0,
        reason: cardData.archive_reason || 'Manual archive'
      };
    } else if (action === 'restore') {
      details = {
        action_description: `Card "${cardData.card_name || 'Unknown'}" was restored from archive`,
        restored_balance: cardData.balance || 0,
        card_type: cardData.card_type || 'Unknown'
      };
    } else if (action === 'make_personal') {
      details = {
        action_description: `Card "${cardData.card_name || 'Unknown'}" was made personal`,
        previous_shared_with: cardData.previous_shared_with || 'Unknown',
        card_type: cardData.card_type || 'Unknown'
      };
    }
    
    // Create the main activity log entry
    const activityLog = await prisma.cardActivityLog.create({
      data: {
        card_id: cardId,
        card_type_field: cardType,
        action: action,
        user_email: userEmail,
        user_name: userName,
        details: details ? JSON.stringify(details) : null,
        card_data: JSON.stringify(cardData),
        before_data: beforeData ? JSON.stringify(beforeData) : null,
        timestamp: new Date()
      }
    });

    // If this is a shared card, create activity logs for all group members
    if (sharedWith && Array.isArray(sharedWith)) {
      const sharedLogPromises = sharedWith.map(async (memberEmail) => {
        if (memberEmail !== userEmail) { // Don't duplicate the main log
          try {
            const memberUser = await prisma.user.findUnique({
              where: { email: memberEmail },
              select: { name: true }
            });
            
            await prisma.cardActivityLog.create({
              data: {
                card_id: cardId,
                card_type_field: cardType,
                action: action,
                user_email: memberEmail,
                user_name: memberUser?.name || memberEmail,
                details: details ? JSON.stringify(details) : null,
                card_data: JSON.stringify(cardData),
                before_data: beforeData ? JSON.stringify(beforeData) : null,
                timestamp: new Date()
              }
            });
          } catch (error) {
            console.warn(`Failed to create shared log for ${memberEmail}:`, error);
          }
        }
      });
      
      await Promise.all(sharedLogPromises);
    }

    return activityLog;
  } catch (error) {
    console.error('Failed to log card activity:', error);
    throw error;
  }
}

// Log activity endpoint - MUST be before /:name routes
router.post('/log-activity', requireAuth, async (req, res) => {
  try {
    const { cardId, action, cardData, beforeData, cardType, sharedWith } = req.body;
    
    if (!cardId || !action) {
      return res.status(400).json({ error: 'cardId and action are required' });
    }
    
    await logCardActivity(cardId, action, req.user.email, cardData, beforeData, cardType, sharedWith);
    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Failed to log card activity:', error);
    res.status(500).json({ error: 'Failed to log activity' });
  }
});

// Endpoint to create or get custom card type for user
router.post('/custom-card-type', requireAuth, async (req, res) => {
  try {
    const { cardTypeName, userEmail } = req.body;
    
    if (!cardTypeName || !userEmail) {
      return res.status(400).json({ error: 'cardTypeName and userEmail are required' });
    }
    
    // Check if this card type already exists globally
    const globalCardType = await prisma.giftCardType.findFirst({
      where: { name: cardTypeName }
    });
    
    if (globalCardType) {
      // If it exists globally, return the global type
      return res.json({ 
        success: true, 
        cardType: globalCardType,
        isGlobal: true 
      });
    }
    
    // Check if user already has this custom card type
    const existingUserCardType = await prisma.userCardType.findFirst({
      where: { 
        user_email: userEmail,
        name: cardTypeName 
      }
    });
    
    if (existingUserCardType) {
      return res.json({ 
        success: true, 
        cardType: existingUserCardType,
        isGlobal: false,
        isExisting: true 
      });
    }
    
    // Create new custom card type for user
    const newUserCardType = await prisma.userCardType.create({
      data: {
        user_email: userEmail,
        name: cardTypeName,
        type_color: '#3B82F6', // Default blue color
        supported_stores: JSON.stringify([cardTypeName]) // Store accepts itself as a store
      }
    });
    
    // Also create a store entry for this custom card type if it doesn't exist
    try {
      const existingStore = await prisma.store.findFirst({
        where: { name: cardTypeName }
      });
      
      if (!existingStore) {
        await prisma.store.create({
          data: {
            name: cardTypeName,
            description: `Accepts: ${cardTypeName}`,
            category: 'Custom',
            is_active: true,
            created_by: userEmail
          }
        });
        console.log(`Created store entry for custom card type: ${cardTypeName}`);
      }
    } catch (storeError) {
      console.error('Failed to create store entry for custom card type:', storeError);
      // Don't fail the card type creation if store creation fails
    }
    
    res.status(201).json({ 
      success: true, 
      cardType: newUserCardType,
      isGlobal: false,
      isExisting: false 
    });
    
  } catch (error) {
    console.error('Failed to create custom card type:', error);
    res.status(500).json({ error: 'Failed to create custom card type' });
  }
});

router.post('/:name/filter', requireAuth, async (req,res)=>{
  const { name } = req.params;
  const { where = {}, sortBy, limit } = req.body || {};
  const model = models[name];
  if(!model) return res.status(404).json({ error:`Unknown entity ${name}` });
  try{
    const orderBy = sortBy ? [{ [sortBy.replace(/^-/, '')]: sortBy.startsWith('-') ? 'desc':'asc' }] : undefined;
    const rows = await model.findMany({
      where: buildWhere(where),
      orderBy,
      take: typeof limit === 'number' ? limit : undefined
    });
    
    // Transform Group data to convert members JSON string to array
    if (name === 'Group') {
      res.json(transformGroupData(rows));
    } else if (name === 'GiftCard') {
      // Transform GiftCard data for frontend
      const transformedRows = rows.map(row => ({
        ...row,
        balance: row.balance ? row.balance / 100 : null, // Convert from cents
        expiry_date: row.expiry_date ? row.expiry_date.toISOString() : null,
        created_date: row.created_date ? row.created_date.toISOString() : null,
        updated_date: row.updated_date ? row.updated_date.toISOString() : null
      }));
      res.json(transformedRows);
    } else if (name === 'SharedCard') {
      // Transform SharedCard data for frontend
      const transformedRows = rows.map(row => ({
        ...row,
        balance: row.balance ? row.balance / 100 : null, // Convert from cents
        expiry_date: row.expiry_date ? row.expiry_date.toISOString() : null,
        created_date: row.created_date ? row.created_date.toISOString() : null
      }));
      res.json(transformedRows);
    } else {
      res.json(rows);
    }
  }catch(e){ console.error(e); res.status(500).json({ error:'Filter failed' }); }
});

router.post('/:name', requireAuth, async (req,res)=>{
  const { name } = req.params;
  const model = models[name];
  if(!model) return res.status(404).json({ error:`Unknown entity ${name}` });
  try{
    // Transform Group data for database storage
    let data = name === 'Group' ? transformGroupDataForDB(req.body) : req.body;
    
        // Add user information for GiftCard creation
        if (name === 'GiftCard') {
          // Map frontend fields to database fields
          data = {
            card_name: data.card_name,
            vendor: data.vendor || null,
            balance: data.balance ? Math.round(data.balance * 100) : null, // Convert to cents
            expiry_date: data.expiry_date ? new Date(data.expiry_date) : null,
            is_archived: false,
            card_type: data.card_type || null,
            card_number: data.card_number || null,
            cvv: data.cvv || null,
            activation_code: data.activation_code || null,
            online_page_url: data.online_page_url || null,
            notes: data.notes || null,
            card_image_url: data.card_image_url || null,
            purchase_date: data.purchase_date ? new Date(data.purchase_date) : null,
            card_color: data.card_color || null,
            created_by: req.user.email,
            owner_email: req.user.email
          };
        }
    
    const row = await model.create({ data });
    
    // Log activity for GiftCard creation
    if (name === 'GiftCard') {
      await logCardActivity(row.id, 'created', req.user.email, {
        card_name: row.card_name,
        card_type: row.card_type,
        balance: row.balance ? row.balance / 100 : null,
        expiry_date: row.expiry_date ? row.expiry_date.toISOString() : null,
        vendor: row.vendor,
        card_number: row.card_number,
        cvv: row.cvv,
        activation_code: row.activation_code,
        online_page_url: row.online_page_url,
        notes: row.notes,
        card_color: row.card_color,
        purchase_date: row.purchase_date ? row.purchase_date.toISOString() : null,
        card_image_url: row.card_image_url
      }, null, 'GiftCard');
    }
    
    // Transform Group data to convert members JSON string to array
    if (name === 'Group') {
      res.status(201).json(transformGroupData([row])[0]);
    } else if (name === 'GiftCard') {
      // Transform GiftCard data for frontend
      const transformedRow = {
        ...row,
        balance: row.balance ? row.balance / 100 : null, // Convert from cents
        expiry_date: row.expiry_date ? row.expiry_date.toISOString() : null,
        created_date: row.created_date ? row.created_date.toISOString() : null,
        updated_date: row.updated_date ? row.updated_date.toISOString() : null
      };
      res.status(201).json(transformedRow);
    } else {
      res.status(201).json(row);
    }
  }catch(e){ 
    console.error('Create error:', e); 
    res.status(500).json({ 
      error: 'Create failed', 
      details: e.message,
      code: e.code 
    }); 
  }
});

router.put('/:name/:id', requireAuth, async (req,res)=>{
  const { name, id } = req.params;
  const model = models[name];
  if(!model) return res.status(404).json({ error:`Unknown entity ${name}` });
  try{
    // Transform Group data for database storage
    let data = name === 'Group' ? transformGroupDataForDB(req.body) : req.body;
    
    // Transform GiftCard data for database storage
    if (name === 'GiftCard') {
      // Only update the fields that are provided in the request
      const updateData = {};
      
      if (data.card_name !== undefined) updateData.card_name = data.card_name;
      if (data.vendor !== undefined) updateData.vendor = data.vendor;
      if (data.balance !== undefined) updateData.balance = Math.round(data.balance * 100); // Convert to cents
      if (data.expiry_date !== undefined) updateData.expiry_date = data.expiry_date ? new Date(data.expiry_date) : null;
      if (data.is_archived !== undefined) updateData.is_archived = data.is_archived;
      if (data.card_type !== undefined) updateData.card_type = data.card_type;
      if (data.card_number !== undefined) updateData.card_number = data.card_number;
      if (data.cvv !== undefined) updateData.cvv = data.cvv;
      if (data.activation_code !== undefined) updateData.activation_code = data.activation_code;
      if (data.online_page_url !== undefined) updateData.online_page_url = data.online_page_url;
      if (data.notes !== undefined) updateData.notes = data.notes;
      if (data.card_image_url !== undefined) updateData.card_image_url = data.card_image_url;
      if (data.purchase_date !== undefined) updateData.purchase_date = data.purchase_date ? new Date(data.purchase_date) : null;
      if (data.card_color !== undefined) updateData.card_color = data.card_color;
      
      data = updateData;
    }
    
    // Transform SharedCard data for database storage
    if (name === 'SharedCard') {
      // Only update the fields that are provided in the request
      const updateData = {};
      
      if (data.card_name !== undefined) updateData.card_name = data.card_name;
      if (data.vendor !== undefined) updateData.vendor = data.vendor;
      if (data.balance !== undefined) updateData.balance = Math.round(data.balance * 100); // Convert to cents
      if (data.expiry_date !== undefined) updateData.expiry_date = data.expiry_date ? new Date(data.expiry_date) : null;
      if (data.card_type !== undefined) updateData.card_type = data.card_type;
      if (data.card_number !== undefined) updateData.card_number = data.card_number;
      if (data.cvv !== undefined) updateData.cvv = data.cvv;
      if (data.activation_code !== undefined) updateData.activation_code = data.activation_code;
      if (data.online_page_url !== undefined) updateData.online_page_url = data.online_page_url;
      if (data.notes !== undefined) updateData.notes = data.notes;
      if (data.card_image_url !== undefined) updateData.card_image_url = data.card_image_url;
      if (data.purchase_date !== undefined) updateData.purchase_date = data.purchase_date ? new Date(data.purchase_date) : null;
      if (data.card_color !== undefined) updateData.card_color = data.card_color;
      if (data.data !== undefined) updateData.data = data.data;
      
      data = updateData;
    }
    
    // Get the original data for card updates to log before/after
    let beforeData = null;
    if (name === 'GiftCard' || name === 'SharedCard') {
      const originalCard = await model.findUnique({ where: { id: Number(id) } });
      if (originalCard) {
        beforeData = {
          card_name: originalCard.card_name,
          card_type: originalCard.card_type,
          balance: originalCard.balance ? originalCard.balance / 100 : null,
          expiry_date: originalCard.expiry_date ? originalCard.expiry_date.toISOString() : null,
          card_number: originalCard.card_number,
          cvv: originalCard.cvv,
          activation_code: originalCard.activation_code,
          online_page_url: originalCard.online_page_url,
          notes: originalCard.notes,
          card_color: originalCard.card_color,
          purchase_date: originalCard.purchase_date ? originalCard.purchase_date.toISOString() : null,
          vendor: originalCard.vendor,
          card_image_url: originalCard.card_image_url
        };
      }
    }
    
    const row = await model.update({ where: { id: Number(id) }, data });
    
    // Log activity for GiftCard updates
    if (name === 'GiftCard') {
      // Get the complete after state from the database
      const afterCard = await model.findUnique({ where: { id: Number(id) } });
      let afterData = null;
      if (afterCard) {
        afterData = {
          card_name: afterCard.card_name,
          card_type: afterCard.card_type,
          balance: afterCard.balance ? afterCard.balance / 100 : null,
          expiry_date: afterCard.expiry_date ? afterCard.expiry_date.toISOString() : null,
          card_number: afterCard.card_number,
          cvv: afterCard.cvv,
          activation_code: afterCard.activation_code,
          online_page_url: afterCard.online_page_url,
          notes: afterCard.notes,
          card_color: afterCard.card_color,
          purchase_date: afterCard.purchase_date ? afterCard.purchase_date.toISOString() : null,
          vendor: afterCard.vendor,
          card_image_url: afterCard.card_image_url
        };
      }
      
      await logCardActivity(row.id, 'edit', req.user.email, afterData, beforeData, 'GiftCard');
    }
    
    // Log activity for SharedCard updates
    if (name === 'SharedCard') {
      // Get the complete after state from the database
      const afterCard = await model.findUnique({ where: { id: Number(id) } });
      let afterData = null;
      if (afterCard) {
        afterData = {
          card_name: afterCard.card_name,
          card_type: afterCard.card_type,
          balance: afterCard.balance ? afterCard.balance / 100 : null,
          expiry_date: afterCard.expiry_date ? afterCard.expiry_date.toISOString() : null,
          card_number: afterCard.card_number,
          cvv: afterCard.cvv,
          activation_code: afterCard.activation_code,
          online_page_url: afterCard.online_page_url,
          notes: afterCard.notes,
          card_color: afterCard.card_color,
          purchase_date: afterCard.purchase_date ? afterCard.purchase_date.toISOString() : null,
          vendor: afterCard.vendor,
          card_image_url: afterCard.card_image_url
        };
      }
      
      await logCardActivity(row.id, 'edit', req.user.email, afterData, beforeData, 'SharedCard');
    }
    
    // Transform Group data to convert members JSON string to array
    if (name === 'Group') {
      res.json(transformGroupData([row])[0]);
    } else if (name === 'GiftCard') {
      // Transform GiftCard data for frontend
      const transformedRow = {
        ...row,
        balance: row.balance ? row.balance / 100 : null, // Convert from cents
        expiry_date: row.expiry_date ? row.expiry_date.toISOString() : null,
        created_date: row.created_date ? row.created_date.toISOString() : null,
        updated_date: row.updated_date ? row.updated_date.toISOString() : null
      };
      res.json(transformedRow);
    } else if (name === 'SharedCard') {
      // Transform SharedCard data for frontend
      const transformedRow = {
        ...row,
        balance: row.balance ? row.balance / 100 : null, // Convert from cents
        expiry_date: row.expiry_date ? row.expiry_date.toISOString() : null,
        created_date: row.created_date ? row.created_date.toISOString() : null
      };
      res.json(transformedRow);
    } else {
      res.json(row);
    }
  }catch(e){ console.error(e); res.status(500).json({ error:'Update failed' }); }
});

router.delete('/:name/:id', requireAuth, async (req,res)=>{
  const { name, id } = req.params;
  const model = models[name];
  if(!model) return res.status(404).json({ error:`Unknown entity ${name}` });
  try{
    await model.delete({ where: { id: Number(id) } });
    res.json({ ok:true });
  }catch(e){ console.error(e); res.status(500).json({ error:'Delete failed' }); }
});

// Public route for stores (no authentication required)
router.get('/stores', async (req, res) => {
  try {
    const stores = await prisma.store.findMany({
      where: { is_active: true }, // Only return active stores
      orderBy: { name: 'asc' }
    });
    res.json(stores);
  } catch (error) {
    console.error('Error fetching stores:', error);
    res.status(500).json({ error: 'Failed to fetch stores' });
  }
});

export default router;

