import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { getStore, saveStore, type Store } from "./json-store";
import type { Request, Response, NextFunction } from "express";

const scrypt = promisify(scryptCb) as (
  password: string,
  salt: string,
  keylen: number,
) => Promise<Buffer>;

const SESSION_COOKIE = "gms_sid";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64);
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [salt, hex] = stored.split(":");
  if (!salt || !hex) return false;
  const derived = await scrypt(password, salt, 64);
  const storedBuf = Buffer.from(hex, "hex");
  if (storedBuf.length !== derived.length) return false;
  return timingSafeEqual(storedBuf, derived);
}

export async function createSession(
  userId: number,
  store?: Store,
): Promise<string> {
  const target = store ?? (await getStore());
  const id = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  target.sessions.push({
    id,
    userId,
    expiresAt,
    createdAt: new Date(),
  });
  await saveStore(target);
  return id;
}

export async function destroySession(
  id: string,
  store?: Store,
): Promise<void> {
  const target = store ?? (await getStore());
  const next = target.sessions.filter((session) => session.id !== id);
  if (next.length !== target.sessions.length) {
    target.sessions = next;
    await saveStore(target);
  }
}

export async function loadUserFromCookie(req: Request) {
  const sid = req.cookies?.[SESSION_COOKIE];
  if (!sid) return null;
  const store = await getStore();
  const session = store.sessions.find((entry) => entry.id === sid) ?? null;
  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await destroySession(sid, store);
    return null;
  }
  return store.users.find((u) => u.id === session.userId) ?? null;
}

export function setSessionCookie(res: Response, sid: string) {
  res.cookie(SESSION_COOKIE, sid, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: SESSION_TTL_MS,
    path: "/",
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE, { path: "/" });
}

export function getSessionCookieName() {
  return SESSION_COOKIE;
}

export async function attachUser(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  try {
    req.user = await loadUserFromCookie(req);
  } catch {
    req.user = null;
  }
  next();
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!req.user) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  next();
}

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!req.user) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  if (req.user.role !== "admin") {
    res.status(403).json({ message: "Forbidden" });
    return;
  }
  next();
}
