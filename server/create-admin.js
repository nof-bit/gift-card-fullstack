import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    console.log('🔧 Creating admin user...');
    
    // Check if admin already exists
    const existingAdmin = await prisma.user.findFirst({
      where: { isAdmin: true }
    });
    
    if (existingAdmin) {
      console.log('✅ Admin user already exists:', existingAdmin.email);
      return;
    }
    
    // Create admin user
    const adminEmail = 'admin@giftcardapp.com';
    const adminPassword = 'admin123'; // Change this in production!
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        name: 'Admin User',
        isAdmin: true
      }
    });
    
    console.log('✅ Admin user created successfully!');
    console.log('📧 Email:', adminEmail);
    console.log('🔑 Password:', adminPassword);
    console.log('⚠️  IMPORTANT: Change the password after first login!');
    
    // Create some sample stores
    console.log('\n🏪 Creating sample stores...');
    
    const stores = [
      {
        name: 'Amazon',
        description: 'Online marketplace for everything',
        website: 'https://amazon.com',
        category: 'Shopping',
        created_by: adminEmail
      },
      {
        name: 'Starbucks',
        description: 'Coffee and beverages',
        website: 'https://starbucks.com',
        category: 'Food & Beverage',
        created_by: adminEmail
      },
      {
        name: 'Apple Store',
        description: 'Apple products and accessories',
        website: 'https://apple.com',
        category: 'Technology',
        created_by: adminEmail
      },
      {
        name: 'Netflix',
        description: 'Streaming entertainment',
        website: 'https://netflix.com',
        category: 'Entertainment',
        created_by: adminEmail
      },
      {
        name: 'Spotify',
        description: 'Music streaming service',
        website: 'https://spotify.com',
        category: 'Entertainment',
        created_by: adminEmail
      }
    ];
    
    for (const storeData of stores) {
      await prisma.store.create({
        data: storeData
      });
    }
    
    console.log('✅ Sample stores created successfully!');
    
    // Create some global card types
    console.log('\n🎫 Creating global card types...');
    
    const globalCardTypes = [
      {
        name: 'Gift Card',
        color: '#3B82F6'
      },
      {
        name: 'Prepaid Card',
        color: '#10B981'
      },
      {
        name: 'Store Credit',
        color: '#F59E0B'
      }
    ];
    
    for (const cardTypeData of globalCardTypes) {
      await prisma.giftCardType.create({
        data: cardTypeData
      });
    }
    
    console.log('✅ Global card types created successfully!');
    console.log('\n🎉 Admin setup complete!');
    console.log('You can now login with admin credentials to manage stores and card types.');
    
  } catch (error) {
    console.error('❌ Error creating admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
