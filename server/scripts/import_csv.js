import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

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

function coerce(val){
  if(val === '' || val === undefined || val === null) return null;
  if(val === 'true') return true;
  if(val === 'false') return false;
  if(/^\-?\d+$/.test(val)) return Number(val);
  if(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(val)) return new Date(val);
  return val;
}

async function run(){
  const importDir = path.join(process.cwd(), 'import');
  const files = fs.readdirSync(importDir).filter(f => f.toLowerCase().endsWith('.csv'));
  for(const file of files){
    const name = path.basename(file, '.csv');
    const model = models[name];
    if(!model){ console.log(`Skip ${file} (no model ${name})`); continue; }
    const csv = fs.readFileSync(path.join(importDir, file), 'utf-8');
    const rows = parse(csv, { columns:true, skip_empty_lines:true });
    console.log(`Importing ${rows.length} rows into ${name}...`);
    for(const r of rows){
      for(const k of Object.keys(r)){ r[k] = coerce(r[k]); }
      await model.create({ data: r });
    }
  }
  console.log('Done.');
}

run().then(()=>process.exit(0)).catch(e=>{ console.error(e); process.exit(1)});
