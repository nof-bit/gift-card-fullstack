import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAdmin } from '../middleware/adminAuth.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables before initializing Prisma
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const prisma = new PrismaClient();
const router = express.Router();

// Get all stores (admin only)
router.get('/stores', requireAdmin, async (req, res) => {
  try {
    const stores = await prisma.store.findMany({
      orderBy: { created_date: 'desc' }
    });
    res.json(stores);
  } catch (error) {
    console.error('Error fetching stores:', error);
    res.status(500).json({ error: 'Failed to fetch stores' });
  }
});

// Create new store (admin only)
router.post('/stores', requireAdmin, async (req, res) => {
  try {
    const { name, description, website, logo_url, category } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Store name is required' });
    }

    const store = await prisma.store.create({
      data: {
        name,
        description,
        website,
        logo_url,
        category,
        created_by: req.admin.email
      }
    });

    res.status(201).json(store);
  } catch (error) {
    console.error('Error creating store:', error);
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'Store with this name already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create store' });
    }
  }
});

// Update store (admin only)
router.put('/stores/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, website, logo_url, category, is_active } = req.body;

    const store = await prisma.store.update({
      where: { id: parseInt(id) },
      data: {
        name,
        description,
        website,
        logo_url,
        category,
        is_active
      }
    });

    res.json(store);
  } catch (error) {
    console.error('Error updating store:', error);
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Store not found' });
    } else if (error.code === 'P2002') {
      res.status(409).json({ error: 'Store with this name already exists' });
    } else {
      res.status(500).json({ error: 'Failed to update store' });
    }
  }
});

// Delete store (admin only)
router.delete('/stores/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.store.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: 'Store deleted successfully' });
  } catch (error) {
    console.error('Error deleting store:', error);
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Store not found' });
    } else {
      res.status(500).json({ error: 'Failed to delete store' });
    }
  }
});

// Get all global card types (admin only)
router.get('/card-types', requireAdmin, async (req, res) => {
  try {
    const cardTypes = await prisma.giftCardType.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(cardTypes);
  } catch (error) {
    console.error('Error fetching card types:', error);
    res.status(500).json({ error: 'Failed to fetch card types' });
  }
});

// Create new global card type (admin only)
router.post('/card-types', requireAdmin, async (req, res) => {
  try {
    const { name, color } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Card type name is required' });
    }

    const cardType = await prisma.giftCardType.create({
      data: {
        name,
        color: color || '#3B82F6' // Default blue color
      }
    });

    res.status(201).json(cardType);
  } catch (error) {
    console.error('Error creating card type:', error);
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'Card type with this name already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create card type' });
    }
  }
});

// Update global card type (admin only)
router.put('/card-types/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, color } = req.body;

    const cardType = await prisma.giftCardType.update({
      where: { id: parseInt(id) },
      data: {
        name,
        color
      }
    });

    res.json(cardType);
  } catch (error) {
    console.error('Error updating card type:', error);
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Card type not found' });
    } else if (error.code === 'P2002') {
      res.status(409).json({ error: 'Card type with this name already exists' });
    } else {
      res.status(500).json({ error: 'Failed to update card type' });
    }
  }
});

// Delete global card type (admin only)
router.delete('/card-types/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.giftCardType.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: 'Card type deleted successfully' });
  } catch (error) {
    console.error('Error deleting card type:', error);
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Card type not found' });
    } else {
      res.status(500).json({ error: 'Failed to delete card type' });
    }
  }
});

// Get admin dashboard stats
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const [
      totalUsers,
      totalStores,
      totalCardTypes,
      totalGiftCards,
      recentUsers
    ] = await Promise.all([
      prisma.user.count(),
      prisma.store.count(),
      prisma.giftCardType.count(),
      prisma.giftCard.count(),
      prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          isAdmin: true
        }
      })
    ]);

    res.json({
      totalUsers,
      totalStores,
      totalCardTypes,
      totalGiftCards,
      recentUsers
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ error: 'Failed to fetch admin stats' });
  }
});

export default router;
