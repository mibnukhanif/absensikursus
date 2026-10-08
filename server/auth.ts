import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { db, AdminUser, MuridUser } from './db.js';

const JWT_SECRET = process.env.AUTH_SECRET || 'digitalmeera_secure_jwt_secret_token_default_production_key';

export interface TokenPayload {
  id: string;
  role: 'admin' | 'murid';
  identifier: string; // email or username or nis
  name: string;
}

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export async function hashPassword(plain: string): Promise<string> {
  return await bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(plain, hash);
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

// Middleware to authenticate Bearer token or Cookie
export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  let token: string | undefined;

  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.cookies && req.cookies['auth_token']) {
    token = req.cookies['auth_token'];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Autentikasi diperlukan. Silakan login terlebih dahulu.' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ success: false, message: 'Sesi telah kedaluwarsa. Silakan login kembali.' });
  }

  req.user = decoded;
  next();
}

// Admin only middleware
export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Akses ditolak. Halaman atau aksi ini hanya untuk Administrator.' });
  }
  next();
}

// Murid only middleware
export function requireMurid(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'murid') {
    return res.status(403).json({ success: false, message: 'Akses ditolak. Halaman atau aksi ini hanya untuk Murid.' });
  }
  next();
}

/**
 * Returns current date and time in Asia/Jakarta timezone strictly on server
 */
export function getJakartaDateTime(): {
  tanggal: string; // YYYY-MM-DD
  jam: string;     // HH:mm:ss
  timestamp: number;
} {
  const now = new Date();
  
  // Format to Asia/Jakarta
  const formatterDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  const formatterTime = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const tanggal = formatterDate.format(now); // "YYYY-MM-DD"
  const jam = formatterTime.format(now);     // "HH:mm:ss"

  return {
    tanggal,
    jam,
    timestamp: now.getTime()
  };
}

/**
 * Bootstrap admin from environment variables if set and no admin exists
 */
export async function bootstrapInitialAdminIfConfigured() {
  const admins = db.getAdmins();
  if (admins.length > 0) return;

  const email = process.env.INITIAL_ADMIN_EMAIL?.trim();
  const password = process.env.INITIAL_ADMIN_PASSWORD?.trim();

  if (email && password) {
    const passwordHash = await hashPassword(password);
    const newAdmin: AdminUser = {
      id: 'admin-' + Date.now(),
      email,
      username: email.split('@')[0] || 'admin',
      name: 'Administrator Utama',
      passwordHash,
      role: 'super_admin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.addAdmin(newAdmin);
    db.logAction('System Bootstrap', 'system', 'Bootstrap Admin', `Initial admin created from environment variables for ${email}`);
    console.log(`[BOOTSTRAP] Initial admin created from environment variables: ${email}`);
  }
}
