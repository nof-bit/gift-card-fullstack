import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// Card type mapping from file names
const cardTypeMapping = {
  'max.txt': 'Max',
  'נופשונית.txt': 'נופשונית',
  'תו הזהב.txt': 'תו הזהב',
  'buyme הופעות.txt': 'BuyMe הופעות',
  'buyme.txt': 'BuyMe',
  'dreamcard.txt': 'DreamCard'
};

// Function to normalize store names (handle case variations, extra spaces, etc.)
function normalizeStoreName(name) {
  return name
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/[^\w\s\u0590-\u05FF]/g, '') // Remove special characters except Hebrew and basic alphanumeric
    .toLowerCase();
}

// Function to get the best store name (prefer the most complete version)
function getBestStoreName(storeNames) {
  if (storeNames.length === 1) return storeNames[0];
  
  // Sort by length (longer names are usually more complete)
  return storeNames.sort((a, b) => b.length - a.length)[0];
}

async function importStores() {
  try {
    console.log('🗑️  Clearing existing stores and card types...');
    
    // Delete all existing stores
    await prisma.store.deleteMany({});
    console.log('✅ Deleted all existing stores');
    
    // Delete all existing card types
    await prisma.giftCardType.deleteMany({});
    console.log('✅ Deleted all existing card types');
    
    console.log('\n📁 Reading store files...');
    
    const storesMap = new Map(); // Use Map to handle duplicates
    const cardTypes = [];
    
    // Process each file
    for (const [fileName, cardTypeName] of Object.entries(cardTypeMapping)) {
      const filePath = path.join(process.cwd(), 'stores', fileName);
      
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  File not found: ${fileName}`);
        continue;
      }
      
      const content = fs.readFileSync(filePath, 'utf-8');
      const stores = content.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
      
      console.log(`📖 Read ${stores.length} stores from ${fileName} (${cardTypeName})`);
      
      // Create card type
      const cardType = await prisma.giftCardType.create({
        data: {
          name: cardTypeName,
          color: getRandomColor()
        }
      });
      cardTypes.push(cardType);
      
      // Process stores
      for (const storeName of stores) {
        const normalizedName = normalizeStoreName(storeName);
        
        if (storesMap.has(normalizedName)) {
          // Store already exists, add this card type to it
          const existingStore = storesMap.get(normalizedName);
          if (!existingStore.cardTypes.includes(cardTypeName)) {
            existingStore.cardTypes.push(cardTypeName);
          }
        } else {
          // New store
          storesMap.set(normalizedName, {
            originalName: storeName,
            cardTypes: [cardTypeName],
            normalizedName: normalizedName
          });
        }
      }
    }
    
    console.log(`\n🏪 Creating ${storesMap.size} unique stores...`);
    
    // Create stores in database
    const createdStores = [];
    for (const [normalizedName, storeData] of storesMap) {
      const bestName = getBestStoreName([storeData.originalName]);
      const cardTypesString = storeData.cardTypes.join(', ');
      
      const store = await prisma.store.create({
        data: {
          name: bestName,
          description: `Accepts: ${cardTypesString}`,
          category: categorizeStore(bestName),
          is_active: true,
          created_by: 'admin@giftcardapp.com'
        }
      });
      
      createdStores.push(store);
    }
    
    console.log('✅ Successfully created stores:');
    console.log(`   - Total unique stores: ${createdStores.length}`);
    console.log(`   - Card types created: ${cardTypes.length}`);
    
    // Show some examples
    console.log('\n📋 Sample stores:');
    createdStores.slice(0, 10).forEach(store => {
      console.log(`   - ${store.name} (${store.description})`);
    });
    
    console.log('\n🎉 Store import completed successfully!');
    
  } catch (error) {
    console.error('❌ Error importing stores:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Generate random colors for card types
function getRandomColor() {
  const colors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1',
    '#14B8A6', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Categorize stores based on name patterns
function categorizeStore(storeName) {
  const name = storeName.toLowerCase();
  
  if (name.includes('hotel') || name.includes('מלון') || name.includes('spa') || name.includes('ספא')) {
    return 'Hospitality';
  } else if (name.includes('restaurant') || name.includes('cafe') || name.includes('קפה') || name.includes('בורגר') || name.includes('פיצה')) {
    return 'Food & Beverage';
  } else if (name.includes('sport') || name.includes('fitness') || name.includes('gym') || name.includes('ספורט')) {
    return 'Sports & Fitness';
  } else if (name.includes('fashion') || name.includes('clothing') || name.includes('shoes') || name.includes('אופנה') || name.includes('הלבשה')) {
    return 'Fashion & Apparel';
  } else if (name.includes('book') || name.includes('music') || name.includes('entertainment') || name.includes('ספר') || name.includes('תיאטרון')) {
    return 'Entertainment & Media';
  } else if (name.includes('beauty') || name.includes('cosmetics') || name.includes('יופי') || name.includes('קוסמטיקה')) {
    return 'Beauty & Cosmetics';
  } else if (name.includes('home') || name.includes('furniture') || name.includes('בית') || name.includes('ריהוט')) {
    return 'Home & Garden';
  } else if (name.includes('tech') || name.includes('electronics') || name.includes('טכנולוגיה') || name.includes('אלקטרוניקה')) {
    return 'Technology';
  } else if (name.includes('travel') || name.includes('tourism') || name.includes('תיירות') || name.includes('נסיעות')) {
    return 'Travel & Tourism';
  } else {
    return 'Shopping';
  }
}

// Run the import
importStores();
