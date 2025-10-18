import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';
import passport from '../config/googleAuth.js';
import { sendPasswordResetEmail, sendWelcomeEmail } from '../services/emailService.js';

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
    
    // Send welcome email (optional, don't fail registration if email fails)
    try {
      await sendWelcomeEmail(email, name);
    } catch (emailError) {
      console.warn('Failed to send welcome email:', emailError);
    }
    
    res.json({ token, user: { id:user.id, email:user.email, name:user.name } });
  }catch(e){ console.error(e); res.status(500).json({ error:'Registration failed' }); }
});

router.post('/login', async (req,res)=>{
  try{
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if(!user) return res.status(401).json({ error:'Invalid credentials' });
    
    // Check if user has a password (not Google OAuth only)
    if (!user.password) {
      return res.status(401).json({ error:'Please use Google login for this account' });
    }
    
    const ok = await bcrypt.compare(password, user.password);
    if(!ok) return res.status(401).json({ error:'Invalid credentials' });
    const token = jwt.sign({ userId:user.id, email:user.email, name:user.name }, process.env.JWT_SECRET, { expiresIn:'7d' });
    res.json({ token, user: { id:user.id, email:user.email, name:user.name, isAdmin: user.isAdmin } });
  }catch(e){ console.error(e); res.status(500).json({ error:'Login failed' }); }
});

router.get('/me', requireAuth, async (req,res)=>{
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        name: true,
        isAdmin: true
      }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ user });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Google OAuth routes (only if configured)
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

  router.get('/google/callback', 
    passport.authenticate('google', { failureRedirect: '/login?error=google_auth_failed' }),
    async (req, res) => {
      try {
        const token = jwt.sign(
          { userId: req.user.id, email: req.user.email, name: req.user.name }, 
          process.env.JWT_SECRET, 
          { expiresIn: '7d' }
        );
        
        // Redirect to frontend with token
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback?token=${token}`);
      } catch (error) {
        console.error('Google OAuth callback error:', error);
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=google_auth_failed`);
      }
    }
  );
} else {
  // Google OAuth not configured - return error
  router.get('/google', (req, res) => {
    res.status(503).json({ 
      error: 'Google OAuth not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.' 
    });
  });
}

// Forgot password route
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Don't reveal if email exists or not for security
      return res.json({ message: 'If an account with that email exists, we sent a password reset link.' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour from now

    // Save reset token to database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires
      }
    });

    // Send reset email
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
    const emailResult = await sendPasswordResetEmail(email, resetToken, resetUrl);

    if (emailResult.success) {
      res.json({ message: 'If an account with that email exists, we sent a password reset link.' });
    } else {
      console.error('Failed to send reset email:', emailResult.error);
      res.status(500).json({ error: 'Failed to send reset email. Please try again later.' });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset password route
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password are required' });
    }

    // Find user with valid reset token
    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: {
          gt: new Date()
        }
      }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null
      }
    });

    res.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout route
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

export default router;
