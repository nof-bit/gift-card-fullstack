import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

async function testLogin() {
  try {
    console.log('Testing login...');
    
    // Get the admin user
    const user = await prisma.user.findUnique({
      where: { email: 'admin@giftcardapp.com' }
    });
    
    if (!user) {
      console.log('❌ Admin user not found');
      return;
    }
    
    console.log('✅ Admin user found:', user.email);
    console.log('Has password:', !!user.password);
    
    // Test password verification
    const testPassword = 'admin123';
    const isPasswordValid = await bcrypt.compare(testPassword, user.password);
    console.log('Password valid:', isPasswordValid);
    
    if (isPasswordValid) {
      const token = jwt.sign(
        { userId: user.id, email: user.email, name: user.name }, 
        process.env.JWT_SECRET, 
        { expiresIn: '7d' }
      );
      console.log('✅ Token generated:', token.substring(0, 50) + '...');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testLogin();
