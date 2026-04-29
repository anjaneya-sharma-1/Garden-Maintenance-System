import { Router, type IRouter } from "express";
import { SignupBody, LoginBody } from "@workspace/api-zod";
import {
  hashPassword,
  verifyPassword,
  createSession,
  destroySession,
  setSessionCookie,
  clearSessionCookie,
  getSessionCookieName,
} from "../lib/auth";
import { serializeUser } from "../lib/serialize";
import { getStore } from "../lib/json-store";

const router: IRouter = Router();

router.post("/auth/signup", async (req, res) => {
  const parsed = SignupBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid signup payload" });
    return;
  }
  const { email, password, name, region } = parsed.data;
  const normalizedEmail = email.trim().toLowerCase();

  const store = await getStore();
  const existing = store.users.find(
    (user) => user.email === normalizedEmail,
  );
  if (existing) {
    res.status(409).json({ message: "Email already registered" });
    return;
  }

  const passwordHash = await hashPassword(password);

  const user = {
    id: store.nextIds.users++,
    email: normalizedEmail,
    passwordHash,
    name,
    region,
    role: "user" as const,
    avatarUrl: null,
    bio: null,
    createdAt: new Date(),
  };

  store.users.push(user);

  const sid = await createSession(user.id, store);
  setSessionCookie(res, sid);
  res.json({ user: serializeUser(user) });
});

router.post("/auth/login", async (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid login payload" });
    return;
  }
  const email = parsed.data.email.trim().toLowerCase();
  const store = await getStore();
  const user = store.users.find((entry) => entry.email === email);
  if (!user) {
    res.status(401).json({ message: "Invalid credentials" });
    return;
  }
  const ok = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!ok) {
    res.status(401).json({ message: "Invalid credentials" });
    return;
  }
  const sid = await createSession(user.id, store);
  setSessionCookie(res, sid);
  res.json({ user: serializeUser(user) });
});

router.post("/auth/logout", async (req, res) => {
  const sid = req.cookies?.[getSessionCookieName()];
  if (sid) await destroySession(sid);
  clearSessionCookie(res);
  res.json({ ok: true });
});

router.get("/auth/me", (req, res) => {
  res.json({ user: req.user ? serializeUser(req.user) : null });
});

export default router;
