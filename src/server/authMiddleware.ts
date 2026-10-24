import { Request, Response, NextFunction } from 'express';
import firebaseConfig from '../../firebase-applet-config.json';

export interface AuthenticatedUser {
  uid: string;
  email?: string;
  emailVerified?: boolean;
  isAdmin: boolean;
  isOfficer: boolean;
  idToken: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

const configuredAdminList = (process.env.ADMIN_EMAILS || 'anthonyekong37@gmail.com')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const ADMIN_EMAILS = new Set<string>(configuredAdminList);

const configuredOfficerList = (process.env.OFFICER_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const OFFICER_EMAILS = new Set<string>(configuredOfficerList);

const apiKey = firebaseConfig.apiKey || process.env.VITE_FIREBASE_API_KEY || 'AIzaSyBjVPVY8xslUvBkIZ3Iu-OsndJkxtEAAko';

/**
 * Authoritatively verifies a Firebase ID token using Google Identity Platform REST API.
 * Never trusts unverified client claims or spoofed headers.
 */
export async function verifyFirebaseIdToken(idToken: string): Promise<{ uid: string; email?: string; emailVerified?: boolean }> {
  if (!idToken || typeof idToken !== 'string') {
    throw new Error('MISSING_OR_MALFORMED_TOKEN');
  }

  // Call Google Identity Toolkit accounts:lookup endpoint
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });

  const payload = await response.json();

  if (!response.ok || !payload.users || payload.users.length === 0) {
    const errorMsg = payload.error?.message || 'Authentication token lookup failed';
    throw new Error(`INVALID_ID_TOKEN: ${errorMsg}`);
  }

  const user = payload.users[0];
  return {
    uid: user.localId,
    email: user.email,
    emailVerified: user.emailVerified ?? false,
  };
}

/**
 * Express middleware to authenticate the user and enforce real Firebase token validity.
 */
export async function authenticateToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      code: 'UNAUTHORIZED',
      message: 'Missing or malformed Authorization header. Expected Bearer <firebase_id_token>.',
    });
    return;
  }

  const idToken = authHeader.split('Bearer ')[1].trim();
  if (!idToken) {
    res.status(401).json({
      success: false,
      code: 'UNAUTHORIZED',
      message: 'Empty Firebase ID token provided.',
    });
    return;
  }

  try {
    const verified = await verifyFirebaseIdToken(idToken);
    const emailLower = (verified.email || '').toLowerCase();
    let isAdmin = ADMIN_EMAILS.has(emailLower);
    let isOfficer = isAdmin || OFFICER_EMAILS.has(emailLower);

    // If not yet determined, check authoritative Firestore admins and officers collections
    if (!isAdmin || !isOfficer) {
      try {
        const projectId = firebaseConfig.projectId;
        const databaseId = (firebaseConfig as any).firestoreDatabaseId || 'ai-studio-eketspace-f2d1e805-ec7a-4ba3-96a3-1c6621ae50bb';
        const docBase = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents`;

        if (!isAdmin) {
          const adminCheck = await fetch(`${docBase}/admins/${encodeURIComponent(verified.uid)}?key=${apiKey}`, {
            headers: { Authorization: `Bearer ${idToken}` },
          });
          if (adminCheck.ok) {
            isAdmin = true;
            isOfficer = true;
          }
        }

        if (!isOfficer) {
          const officerCheck = await fetch(`${docBase}/officers/${encodeURIComponent(verified.uid)}?key=${apiKey}`, {
            headers: { Authorization: `Bearer ${idToken}` },
          });
          if (officerCheck.ok) {
            isOfficer = true;
          }
        }
      } catch (checkErr) {
        console.warn('Firestore role verification notice:', checkErr);
      }
    }

    req.user = {
      uid: verified.uid,
      email: verified.email,
      emailVerified: verified.emailVerified,
      isAdmin,
      isOfficer,
      idToken,
    };

    next();
  } catch (error: any) {
    res.status(401).json({
      success: false,
      code: 'INVALID_TOKEN',
      message: error.message || 'Firebase ID token verification failed.',
    });
  }
}

/**
 * Middleware ensuring caller has administrator role.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || !req.user.isAdmin) {
    res.status(403).json({
      success: false,
      code: 'FORBIDDEN_ADMIN_REQUIRED',
      message: 'Access denied: Authoritative administrator privileges required.',
    });
    return;
  }
  next();
}

/**
 * Middleware ensuring caller has verification officer or admin role.
 */
export function requireOfficer(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || (!req.user.isOfficer && !req.user.isAdmin)) {
    res.status(403).json({
      valid: false,
      success: false,
      code: 'FORBIDDEN_OFFICER_REQUIRED',
      message: 'Access denied: Authorized market verification officer or administrator credentials required.',
    });
    return;
  }
  next();
}
