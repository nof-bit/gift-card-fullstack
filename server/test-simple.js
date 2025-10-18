import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testDatabase() {
  try {
    console.log('Testing database connection...');
    
    // Test if we can connect to the database
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Test if we can find the admin user
    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@giftcardapp.com' }
    });
    
    if (adminUser) {
      console.log('✅ Admin user found:', adminUser.email);
    } else {
      console.log('❌ Admin user not found');
    }
    
    // Test if we can create a simple record
    const testCard = await prisma.giftCard.create({
      data: {
        card_name: 'Test Card',
        card_type: 'Test Type',
        balance: 10050, // 100.50 in cents
        created_by: 'admin@giftcardapp.com',
        owner_email: 'admin@giftcardapp.com'
      }
    });
    
    console.log('✅ Test card created:', testCard);
    
    // Clean up
    await prisma.giftCard.delete({
      where: { id: testCard.id }
    });
    
    console.log('✅ Test card deleted');
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase();
