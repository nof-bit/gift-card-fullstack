import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';

const prisma = new PrismaClient();
const router = express.Router();

router.post('/register', async (req,res)=>{
  try{
    const { email, password, name } = req.body;
    if(!email || !password || !name) return res.status(400).json({ error:'email, password, name required' });
    const exists = await prisma.user.findUnique({ where: { email } });
    if(exists) return res.status(409).json({ error:'Email already registered' });
    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { email, password: hash, name } });
    const token = jwt.sign({ userId:user.id, email:user.email, name:user.name }, process.env.JWT_SECRET, { expiresIn:'7d' });
    res.json({ token, user: { id:user.id, email:user.email, name:user.name } });
  }catch(e){ console.error(e); res.status(500).json({ error:'Registration failed' }); }
});

router.post('/login', async (req,res)=>{
  try{
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if(!user) return res.status(401).json({ error:'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password);
    if(!ok) return res.status(401).json({ error:'Invalid credentials' });
    const token = jwt.sign({ userId:user.id, email:user.email, name:user.name }, process.env.JWT_SECRET, { expiresIn:'7d' });
    res.json({ token, user: { id:user.id, email:user.email, name:user.name } });
  }catch(e){ console.error(e); res.status(500).json({ error:'Login failed' }); }
});

router.get('/me', requireAuth, async (req,res)=>{
  res.json({ user: { id: req.user.userId, email:req.user.email, name:req.user.name } });
});

export default router;
