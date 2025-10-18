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
  User: prisma.user
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
    res.json(rows);
  }catch(e){ console.error(e); res.status(500).json({ error:'Filter failed' }); }
});

router.post('/:name', requireAuth, async (req,res)=>{
  const { name } = req.params;
  const model = models[name];
  if(!model) return res.status(404).json({ error:`Unknown entity ${name}` });
  try{
    const row = await model.create({ data: req.body });
    res.status(201).json(row);
  }catch(e){ console.error(e); res.status(500).json({ error:'Create failed' }); }
});

router.put('/:name/:id', requireAuth, async (req,res)=>{
  const { name, id } = req.params;
  const model = models[name];
  if(!model) return res.status(404).json({ error:`Unknown entity ${name}` });
  try{
    const row = await model.update({ where: { id: Number(id) }, data: req.body });
    res.json(row);
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

export default router;
