import { Router, type IRouter } from "express";
import { UpdateProfileBody } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { serializeUser } from "../lib/serialize";
import { getStore, saveStore } from "../lib/json-store";

const router: IRouter = Router();

router.patch("/profile", requireAuth, async (req, res) => {
  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid profile payload" });
    return;
  }
  const update: Record<string, string> = {};
  if (parsed.data.name !== undefined) update.name = parsed.data.name;
  if (parsed.data.region !== undefined) update.region = parsed.data.region;
  if (parsed.data.bio !== undefined) update.bio = parsed.data.bio;
  if (parsed.data.avatarUrl !== undefined)
    update.avatarUrl = parsed.data.avatarUrl;

  if (Object.keys(update).length === 0) {
    res.json(serializeUser(req.user!));
    return;
  }

  const store = await getStore();
  const user = store.users.find((entry) => entry.id === req.user!.id);
  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  if (update.name !== undefined) user.name = update.name;
  if (update.region !== undefined) user.region = update.region;
  if (update.bio !== undefined) user.bio = update.bio;
  if (update.avatarUrl !== undefined) user.avatarUrl = update.avatarUrl;

  await saveStore(store);
  res.json(serializeUser(user));
});

export default router;
