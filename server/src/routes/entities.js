import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';

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

async function logCardActivity(cardId, action, userEmail, cardData, beforeData = null) {
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

    // Create detailed changes description for edit actions
    let details = null;
    if (action === 'edit' && beforeData && cardData) {
      const changes = [];
      
      // Compare each field and create change descriptions
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
        details = { changes };
      } else {
        // Fallback: if no detailed changes detected, create a simple change log
        const simpleChanges = [];
        Object.keys(cardData).forEach(key => {
          if (beforeData[key] !== cardData[key]) {
            simpleChanges.push(`${key}: "${beforeData[key] || 'Empty'}" → "${cardData[key] || 'Empty'}"`);
          }
        });
        if (simpleChanges.length > 0) {
          details = { changes: simpleChanges };
        }
      }
    }
    
    await prisma.cardActivityLog.create({
      data: {
        card_id: cardId,
        action: action,
        user_email: userEmail,
        user_name: userName,
        details: details ? JSON.stringify(details) : null,
        card_data: JSON.stringify(cardData),
        before_data: beforeData ? JSON.stringify(beforeData) : null,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Failed to log card activity:', error);
  }
}

// Log activity endpoint - MUST be before /:name routes
router.post('/log-activity', requireAuth, async (req, res) => {
  try {
    const { cardId, action, cardData, beforeData } = req.body;
    
    if (!cardId || !action) {
      return res.status(400).json({ error: 'cardId and action are required' });
    }
    
    await logCardActivity(cardId, action, req.user.email, cardData, beforeData);
    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Failed to log card activity:', error);
    res.status(500).json({ error: 'Failed to log activity' });
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
        expiry_date: row.expiry_date ? row.expiry_date.toISOString() : null
      });
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
      data = {
        card_name: data.card_name,
        vendor: data.vendor || null,
        balance: data.balance ? Math.round(data.balance * 100) : null, // Convert to cents
        expiry_date: data.expiry_date ? new Date(data.expiry_date) : null,
        is_archived: data.is_archived || false,
        card_type: data.card_type || null,
        card_number: data.card_number || null,
        cvv: data.cvv || null,
        activation_code: data.activation_code || null,
        online_page_url: data.online_page_url || null,
        notes: data.notes || null,
        card_image_url: data.card_image_url || null,
        purchase_date: data.purchase_date ? new Date(data.purchase_date) : null,
        card_color: data.card_color || null
      };
    }
    
    // Transform SharedCard data for database storage
    if (name === 'SharedCard') {
      data = {
        card_name: data.card_name,
        vendor: data.vendor || null,
        balance: data.balance ? Math.round(data.balance * 100) : null, // Convert to cents
        expiry_date: data.expiry_date ? new Date(data.expiry_date) : null,
        card_type: data.card_type || null,
        card_number: data.card_number || null,
        cvv: data.cvv || null,
        activation_code: data.activation_code || null,
        online_page_url: data.online_page_url || null,
        notes: data.notes || null,
        card_image_url: data.card_image_url || null,
        purchase_date: data.purchase_date ? new Date(data.purchase_date) : null,
        card_color: data.card_color || null,
        data: data.data || null // Store additional fields as JSON
      };
    }
    
    // Get the original data for GiftCard updates to log before/after
    let beforeData = null;
    if (name === 'GiftCard') {
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
      // Use the original request body for the after data
      const afterData = {
        card_name: req.body.card_name || null,
        card_type: req.body.card_type || null,
        balance: req.body.balance || null,
        expiry_date: req.body.expiry_date || null,
        card_number: req.body.card_number || null,
        cvv: req.body.cvv || null,
        activation_code: req.body.activation_code || null,
        online_page_url: req.body.online_page_url || null,
        notes: req.body.notes || null,
        card_color: req.body.card_color || null,
        purchase_date: req.body.purchase_date || null,
        vendor: req.body.vendor || null,
        card_image_url: req.body.card_image_url || null
      };
      
      await logCardActivity(row.id, 'updated', req.user.email, afterData, beforeData);
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
