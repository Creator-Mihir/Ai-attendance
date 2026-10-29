import crypto from 'node:crypto';
import { NextFunction, Request, Response } from 'express';

export type AuthRole = 'teacher' | 'admin' | 'state_admin' | 'district_admin' | 'school_admin';

export interface AuthClaims {
  sub: string;
  role: AuthRole;
  email?: string;
  fullName?: string;
  jurisdictionDistrictId?: string | null;
  jurisdictionSchoolId?: string | null;
  exp: number;
}

const developmentSecret = crypto.randomBytes(32).toString('hex');
let warnedAboutSecret = false;

function tokenSecret(): string {
  const configured = process.env.AUTH_TOKEN_SECRET;
  if (configured) return configured;
  if (process.env.NODE_ENV === 'production') throw new Error('AUTH_TOKEN_SECRET must be configured in production.');
  if (!warnedAboutSecret) {
    console.warn('[Auth] AUTH_TOKEN_SECRET is not configured; sessions will be invalidated when this server restarts.');
    warnedAboutSecret = true;
  }
  return developmentSecret;
}

function encode(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

export function issueToken(claims: Omit<AuthClaims, 'exp'>, lifetimeSeconds = 7 * 24 * 60 * 60): string {
  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const payload = encode({ ...claims, exp: Math.floor(Date.now() / 1000) + lifetimeSeconds });
  const signature = crypto.createHmac('sha256', tokenSecret()).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

export function readToken(token: string): AuthClaims | null {
  try {
    const [header, payload, signature] = token.split('.');
    if (!header || !payload || !signature) return null;
    const expected = crypto.createHmac('sha256', tokenSecret()).update(`${header}.${payload}`).digest();
    const received = Buffer.from(signature, 'base64url');
    if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) return null;
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString()) as AuthClaims;
    const validRoles = ['teacher', 'admin', 'state_admin', 'district_admin', 'school_admin'];
    if (!decoded.sub || !validRoles.includes(decoded.role) || !Number.isFinite(decoded.exp) || decoded.exp <= Date.now() / 1000) return null;
    return decoded;
  } catch {
    return null;
  }
}

export function requireRole(role: AuthRole) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authorization = req.headers.authorization || '';
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
    const claims = token ? readToken(token) : null;
    if (!claims || claims.role !== role) {
      return res.status(401).json({ success: false, message: 'A valid authenticated session is required.' });
    }
    (req as Request & { auth?: AuthClaims }).auth = claims;
    return next();
  };
}

export function requireAdminTier(allowedRoles: AuthRole[] = ['admin', 'state_admin', 'district_admin', 'school_admin']) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authorization = req.headers.authorization || '';
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
    const claims = token ? readToken(token) : null;
    if (!claims) {
      return res.status(401).json({ success: false, message: 'Admin authentication token is missing or expired.' });
    }
    // state_admin and super admin have access to all admin tier endpoints
    const hasRole = allowedRoles.includes(claims.role) || claims.role === 'state_admin' || claims.role === 'admin';
    if (!hasRole) {
      return res.status(403).json({ success: false, message: `Access denied. Requires one of: ${allowedRoles.join(', ')}.` });
    }
    (req as Request & { auth?: AuthClaims }).auth = claims;
    return next();
  };
}

export function safeSecretEquals(input: string, expected: string): boolean {
  const left = crypto.createHash('sha256').update(input).digest();
  const right = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(left, right);
}
