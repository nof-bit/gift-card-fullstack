import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testDatabase() {
  try {
    console.log('Testing database connection...');
    
    // Test creating a user
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        password: 'hashedpassword',
        name: 'Test User'
      }
    });
    
    console.log('User created successfully:', user);
    
    // Test finding the user
    const foundUser = await prisma.user.findUnique({
      where: { email: 'test@example.com' }
    });
    
    console.log('User found:', foundUser);
    
  } catch (error) {
    console.error('Database error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase();
