import type { User } from "../lib/json-store";

declare global {
  namespace Express {
    interface Request {
      user?: User | null;
    }
  }
}

export {};
