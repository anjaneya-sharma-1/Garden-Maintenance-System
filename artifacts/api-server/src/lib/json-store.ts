import fs from "node:fs";
import path from "node:path";
import { randomBytes, scrypt as scryptCb } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb) as (
  password: string,
  salt: string,
  keylen: number,
) => Promise<Buffer>;

const DATA_DIR = path.resolve(process.cwd(), "data");
const DATA_PATH = path.join(DATA_DIR, "local-db.json");

export type ArticleRef = { title: string; url: string; source: string };
export type VideoRef = {
  title: string;
  url: string;
  thumbnailUrl: string;
  durationSeconds?: number;
};

export type CareTask = {
  title: string;
  frequency: string;
  description: string;
};

export type UserRole = "user" | "admin";

export type User = {
  id: number;
  email: string;
  passwordHash: string;
  name: string;
  region: string;
  role: UserRole;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: Date;
};

export type Session = {
  id: string;
  userId: number;
  expiresAt: Date;
  createdAt: Date;
};

export type CatalogPlant = {
  id: number;
  commonName: string;
  scientificName: string;
  category: string;
  difficulty: "easy" | "medium" | "hard";
  imageUrl: string;
  summary: string;
  description: string;
  sunlight: string;
  waterFrequencyDays: number;
  idealTemperatureC: string;
  soilType: string;
  articles: ArticleRef[];
  videos: VideoRef[];
};

export type GardenPlant = {
  id: number;
  userId: number;
  catalogPlantId: number;
  nickname: string;
  location: string;
  notes: string | null;
  healthStatus: "thriving" | "healthy" | "watch" | "struggling";
  plantedAt: Date;
};

export type CareRoutine = {
  id: number;
  gardenPlantId: number;
  wateringFrequencyDays: number;
  wateringAmountMl: number;
  sunlight: string;
  soilNotes: string;
  fertilizerNotes: string;
  tasks: CareTask[];
  generatedAt: Date;
};

export type Reminder = {
  id: number;
  gardenPlantId: number;
  title: string;
  type: "water" | "fertilize" | "prune" | "inspect" | "other";
  scheduledAt: Date;
  repeatDays: number;
  notes: string | null;
  completed: boolean;
  createdAt: Date;
};

export type WateringLog = {
  id: number;
  gardenPlantId: number;
  amountMl: number;
  source: "manual" | "reminder" | "auto";
  notes: string | null;
  wateredAt: Date;
};

export type Store = {
  users: User[];
  sessions: Session[];
  catalogPlants: CatalogPlant[];
  gardenPlants: GardenPlant[];
  careRoutines: CareRoutine[];
  reminders: Reminder[];
  wateringLogs: WateringLog[];
  nextIds: {
    users: number;
    catalogPlants: number;
    gardenPlants: number;
    careRoutines: number;
    reminders: number;
    wateringLogs: number;
  };
};

type SerializableStore = {
  users: Array<Omit<User, "createdAt"> & { createdAt: string }>;
  sessions: Array<Omit<Session, "expiresAt" | "createdAt"> & { expiresAt: string; createdAt: string }>;
  catalogPlants: CatalogPlant[];
  gardenPlants: Array<Omit<GardenPlant, "plantedAt"> & { plantedAt: string }>;
  careRoutines: Array<Omit<CareRoutine, "generatedAt"> & { generatedAt: string }>;
  reminders: Array<Omit<Reminder, "scheduledAt" | "createdAt"> & { scheduledAt: string; createdAt: string }>;
  wateringLogs: Array<Omit<WateringLog, "wateredAt"> & { wateredAt: string }>;
};

let cachedStore: Store | null = null;
let loadPromise: Promise<Store> | null = null;

function parseDate(value: string): Date {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function nextId(items: Array<{ id: number }>): number {
  return items.reduce((max, item) => Math.max(max, item.id), 0) + 1;
}

function toSerializable(store: Store): SerializableStore {
  return {
    users: store.users.map((u) => ({
      ...u,
      createdAt: u.createdAt.toISOString(),
    })),
    sessions: store.sessions.map((s) => ({
      ...s,
      expiresAt: s.expiresAt.toISOString(),
      createdAt: s.createdAt.toISOString(),
    })),
    catalogPlants: store.catalogPlants,
    gardenPlants: store.gardenPlants.map((g) => ({
      ...g,
      plantedAt: g.plantedAt.toISOString(),
    })),
    careRoutines: store.careRoutines.map((c) => ({
      ...c,
      generatedAt: c.generatedAt.toISOString(),
    })),
    reminders: store.reminders.map((r) => ({
      ...r,
      scheduledAt: r.scheduledAt.toISOString(),
      createdAt: r.createdAt.toISOString(),
    })),
    wateringLogs: store.wateringLogs.map((w) => ({
      ...w,
      wateredAt: w.wateredAt.toISOString(),
    })),
  };
}

function fromSerializable(raw: SerializableStore): Store {
  const users = raw.users.map((u) => ({
    ...u,
    createdAt: parseDate(u.createdAt),
  }));
  const sessions = raw.sessions.map((s) => ({
    ...s,
    expiresAt: parseDate(s.expiresAt),
    createdAt: parseDate(s.createdAt),
  }));
  const gardenPlants = raw.gardenPlants.map((g) => ({
    ...g,
    plantedAt: parseDate(g.plantedAt),
  }));
  const careRoutines = raw.careRoutines.map((c) => ({
    ...c,
    generatedAt: parseDate(c.generatedAt),
  }));
  const reminders = raw.reminders.map((r) => ({
    ...r,
    scheduledAt: parseDate(r.scheduledAt),
    createdAt: parseDate(r.createdAt),
  }));
  const wateringLogs = raw.wateringLogs.map((w) => ({
    ...w,
    wateredAt: parseDate(w.wateredAt),
  }));

  return {
    users,
    sessions,
    catalogPlants: raw.catalogPlants,
    gardenPlants,
    careRoutines,
    reminders,
    wateringLogs,
    nextIds: {
      users: nextId(users),
      catalogPlants: nextId(raw.catalogPlants),
      gardenPlants: nextId(gardenPlants),
      careRoutines: nextId(careRoutines),
      reminders: nextId(reminders),
      wateringLogs: nextId(wateringLogs),
    },
  };
}

async function hashSeedPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64);
  return `${salt}:${derived.toString("hex")}`;
}

async function createDefaultStore(): Promise<Store> {
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const adminHash = await hashSeedPassword("gardener123");
  const demoHash = await hashSeedPassword("gardener123");

  const catalogPlants: CatalogPlant[] = [
    {
      id: 1,
      commonName: "Monstera",
      scientificName: "Monstera deliciosa",
      category: "Houseplant",
      difficulty: "easy",
      imageUrl: "/plants/monstera.png",
      summary:
        "Iconic split-leaf tropical climber that thrives indoors with bright, filtered light.",
      description:
        "Monstera deliciosa is a classic tropical climber from Central American rainforests. It loves a warm, humid corner near a bright window and a moss pole to climb.",
      sunlight: "Bright, indirect light",
      waterFrequencyDays: 7,
      idealTemperatureC: "18-27",
      soilType: "Well-draining aroid mix",
      articles: [
        {
          title: "How to Care for a Monstera Deliciosa",
          url: "https://www.thespruce.com/grow-monstera-deliciosa-1902789",
          source: "The Spruce",
        },
      ],
      videos: [
        {
          title: "Monstera Deliciosa Plant Care 101",
          url: "https://www.youtube.com/watch?v=Mw5_3PG2qHc",
          thumbnailUrl: "https://img.youtube.com/vi/Mw5_3PG2qHc/hqdefault.jpg",
        },
      ],
    },
    {
      id: 2,
      commonName: "Snake Plant",
      scientificName: "Dracaena trifasciata",
      category: "Houseplant",
      difficulty: "easy",
      imageUrl: "/plants/snake-plant.png",
      summary:
        "Architectural, almost indestructible houseplant that purifies the air while you sleep.",
      description:
        "Snake plants tolerate low light, dry air, and inconsistent watering. Let the soil dry out completely between waterings.",
      sunlight: "Low to bright indirect light",
      waterFrequencyDays: 14,
      idealTemperatureC: "15-27",
      soilType: "Cactus & succulent mix",
      articles: [
        {
          title: "Snake Plant Care Guide",
          url: "https://www.thesill.com/blogs/plants-101/how-to-care-for-snake-plants",
          source: "The Sill",
        },
      ],
      videos: [
        {
          title: "Complete Snake Plant Care Guide",
          url: "https://www.youtube.com/watch?v=uw9tOKL1RXQ",
          thumbnailUrl: "https://img.youtube.com/vi/uw9tOKL1RXQ/hqdefault.jpg",
        },
      ],
    },
    {
      id: 3,
      commonName: "Tomato",
      scientificName: "Solanum lycopersicum",
      category: "Vegetable",
      difficulty: "medium",
      imageUrl: "/plants/tomato.png",
      summary:
        "Sun-loving vegetable that rewards steady care with armfuls of summer fruit.",
      description:
        "Tomatoes need at least 6 hours of direct sun, evenly moist soil, and rich feeding. Stake or cage plants early and mulch to keep soil temperature even.",
      sunlight: "Full sun (6+ hours)",
      waterFrequencyDays: 2,
      idealTemperatureC: "18-29",
      soilType: "Rich, well-draining loam",
      articles: [
        {
          title: "Growing Tomatoes",
          url: "https://www.almanac.com/plant/tomatoes",
          source: "Old Farmer's Almanac",
        },
      ],
      videos: [
        {
          title: "How to Grow Tomatoes from Seed to Harvest",
          url: "https://www.youtube.com/watch?v=fpN_FfsHm-w",
          thumbnailUrl: "https://img.youtube.com/vi/fpN_FfsHm-w/hqdefault.jpg",
        },
      ],
    },
  ];

  const users: User[] = [
    {
      id: 1,
      email: "admin@gms.local",
      passwordHash: adminHash,
      name: "Admin",
      region: "Global",
      role: "admin",
      avatarUrl: null,
      bio: null,
      createdAt: now,
    },
    {
      id: 2,
      email: "demo@gms.local",
      passwordHash: demoHash,
      name: "Demo Gardener",
      region: "Seattle, WA",
      role: "user",
      avatarUrl: null,
      bio: "",
      createdAt: now,
    },
  ];

  const gardenPlants: GardenPlant[] = [
    {
      id: 1,
      userId: 2,
      catalogPlantId: 1,
      nickname: "Living Room Monstera",
      location: "Living room",
      notes: "Prefers the east window.",
      healthStatus: "healthy",
      plantedAt: new Date(now.getTime() - 12 * dayMs),
    },
    {
      id: 2,
      userId: 2,
      catalogPlantId: 2,
      nickname: "Office Snake Plant",
      location: "Office",
      notes: null,
      healthStatus: "thriving",
      plantedAt: new Date(now.getTime() - 25 * dayMs),
    },
  ];

  const careRoutines: CareRoutine[] = [
    {
      id: 1,
      gardenPlantId: 1,
      wateringFrequencyDays: 7,
      wateringAmountMl: 250,
      sunlight: "Bright, indirect light",
      soilNotes: "Use a chunky aroid mix and keep drainage holes clear.",
      fertilizerNotes:
        "Half-strength balanced liquid fertilizer every 4 weeks during the growing season.",
      tasks: [
        {
          title: "Water deeply",
          frequency: "Every 7 days",
          description:
            "Pour roughly 250ml of room-temperature water at the base until you see runoff.",
        },
        {
          title: "Inspect leaves",
          frequency: "Weekly",
          description:
            "Look under leaves for pests and wipe dust gently with a damp cloth.",
        },
      ],
      generatedAt: new Date(now.getTime() - 2 * dayMs),
    },
  ];

  const reminders: Reminder[] = [
    {
      id: 1,
      gardenPlantId: 1,
      title: "Water Monstera",
      type: "water",
      scheduledAt: new Date(now.getTime() + 2 * dayMs),
      repeatDays: 7,
      notes: "Check soil moisture first.",
      completed: false,
      createdAt: now,
    },
  ];

  const wateringLogs: WateringLog[] = [
    {
      id: 1,
      gardenPlantId: 1,
      amountMl: 220,
      source: "manual",
      notes: "Soil was slightly dry.",
      wateredAt: new Date(now.getTime() - 6 * dayMs),
    },
    {
      id: 2,
      gardenPlantId: 1,
      amountMl: 240,
      source: "manual",
      notes: null,
      wateredAt: new Date(now.getTime() - 13 * dayMs),
    },
    {
      id: 3,
      gardenPlantId: 2,
      amountMl: 180,
      source: "manual",
      notes: null,
      wateredAt: new Date(now.getTime() - 9 * dayMs),
    },
  ];

  return {
    users,
    sessions: [],
    catalogPlants,
    gardenPlants,
    careRoutines,
    reminders,
    wateringLogs,
    nextIds: {
      users: nextId(users),
      catalogPlants: nextId(catalogPlants),
      gardenPlants: nextId(gardenPlants),
      careRoutines: nextId(careRoutines),
      reminders: nextId(reminders),
      wateringLogs: nextId(wateringLogs),
    },
  };
}

async function loadStore(): Promise<Store> {
  if (cachedStore) return cachedStore;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    if (!fs.existsSync(DATA_PATH)) {
      const created = await createDefaultStore();
      await saveStore(created);
      cachedStore = created;
      return created;
    }

    const rawText = await fs.promises.readFile(DATA_PATH, "utf8");
    const raw = JSON.parse(rawText) as SerializableStore;
    const store = fromSerializable(raw);
    cachedStore = store;
    return store;
  })();

  return loadPromise;
}

export async function getStore(): Promise<Store> {
  return loadStore();
}

export async function saveStore(store: Store): Promise<void> {
  cachedStore = store;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const payload = JSON.stringify(toSerializable(store), null, 2);
  await fs.promises.writeFile(DATA_PATH, payload, "utf8");
}
