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
        "Monstera deliciosa is a classic tropical climber from Central American rainforests. Its dramatic fenestrated leaves develop with maturity. It loves a warm, humid corner near a bright window and a moss pole to climb. Water when the top 2 cm of soil are dry; let it rest a touch in winter.",
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
        {
          title: "Monstera Care Guide",
          url: "https://www.gardenersworld.com/how-to/grow-plants/how-to-grow-monstera-deliciosa/",
          source: "Gardeners' World",
        },
      ],
      videos: [
        {
          title: "Monstera Deliciosa Plant Care 101",
          url: "https://www.youtube.com/watch?v=k3Fwy5_piYw",
          thumbnailUrl: "https://img.youtube.com/vi/k3Fwy5_piYw/hqdefault.jpg",
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
        "Snake plants tolerate low light, dry air, and inconsistent watering. Let the soil dry out completely between waterings. Repot every few years in a well-draining mix. Avoid cold drafts below 10 C.",
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
          url: "https://www.youtube.com/watch?v=9w-7RoH_uic",
          thumbnailUrl: "https://img.youtube.com/vi/9w-7RoH_uic/hqdefault.jpg",
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
        "Tomatoes need at least 6 hours of direct sun, evenly moist soil, and rich feeding. Stake or cage plants early, mulch to keep soil temperature even, and pinch suckers on indeterminate varieties. Watch for blight after wet weather.",
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
          url: "https://www.youtube.com/watch?v=8BXIRjZncBw",
          thumbnailUrl: "https://img.youtube.com/vi/8BXIRjZncBw/hqdefault.jpg",
        },
      ],
    },
    {
      id: 4,
      commonName: "Sweet Basil",
      scientificName: "Ocimum basilicum",
      category: "Herb",
      difficulty: "easy",
      imageUrl: "/plants/basil.png",
      summary:
        "Aromatic culinary herb that loves heat and a bright, sunny windowsill.",
      description:
        "Pinch off flower buds to keep leaves tender, and harvest from the top down to encourage bushy growth. Basil hates cold; keep above 15 C. Water at the base in the morning to avoid leaf disease.",
      sunlight: "Full sun",
      waterFrequencyDays: 2,
      idealTemperatureC: "18-30",
      soilType: "Rich, well-draining potting mix",
      articles: [
        {
          title: "How to Grow Basil",
          url: "https://www.rhs.org.uk/herbs/basil/grow-your-own",
          source: "RHS",
        },
      ],
      videos: [
        {
          title: "Grow Endless Basil Indoors",
          url: "https://www.youtube.com/watch?v=v4TIjfHZGVI",
          thumbnailUrl: "https://img.youtube.com/vi/v4TIjfHZGVI/hqdefault.jpg",
        },
      ],
    },
    {
      id: 5,
      commonName: "Lavender",
      scientificName: "Lavandula angustifolia",
      category: "Flower",
      difficulty: "medium",
      imageUrl: "/plants/lavender.png",
      summary:
        "Mediterranean perennial with calming fragrance, bee-friendly purple spikes.",
      description:
        "Lavender thrives on neglect: lean soil, sharp drainage, and full sun. Avoid wet feet at all costs. Prune lightly after flowering to keep plants compact for years.",
      sunlight: "Full sun",
      waterFrequencyDays: 7,
      idealTemperatureC: "10-30",
      soilType: "Sandy, alkaline, very well-draining",
      articles: [
        {
          title: "Growing Lavender",
          url: "https://www.gardenersworld.com/how-to/grow-plants/how-to-grow-lavender/",
          source: "Gardeners' World",
        },
      ],
      videos: [
        {
          title: "How to Grow Lavender",
          url: "https://www.youtube.com/watch?v=LR1K8T79OT8",
          thumbnailUrl: "https://img.youtube.com/vi/LR1K8T79OT8/hqdefault.jpg",
        },
      ],
    },
    {
      id: 6,
      commonName: "Fiddle Leaf Fig",
      scientificName: "Ficus lyrata",
      category: "Houseplant",
      difficulty: "hard",
      imageUrl: "/plants/fiddle-leaf-fig.png",
      summary:
        "Statement tree with violin-shaped leaves - picky, but unforgettable.",
      description:
        "Place near a bright east or south window and do not move it. Water when the top 5 cm are dry; never let it sit in water. Wipe leaves monthly to keep them photosynthesizing happily.",
      sunlight: "Bright, indirect light",
      waterFrequencyDays: 9,
      idealTemperatureC: "18-26",
      soilType: "Well-draining indoor potting mix",
      articles: [
        {
          title: "Fiddle Leaf Fig Care",
          url: "https://www.fiddleleaffigplant.com/blogs/care",
          source: "Fiddle Leaf Fig Resource",
        },
      ],
      videos: [
        {
          title: "Fiddle Leaf Fig Care Guide",
          url: "https://www.youtube.com/watch?v=MQJwPG3voNo",
          thumbnailUrl: "https://img.youtube.com/vi/MQJwPG3voNo/hqdefault.jpg",
        },
      ],
    },
    {
      id: 7,
      commonName: "Strawberry",
      scientificName: "Fragaria x ananassa",
      category: "Fruit",
      difficulty: "medium",
      imageUrl: "/plants/strawberry.png",
      summary:
        "Sweet, low-growing perennial - equally at home in beds, pots, and balcony rails.",
      description:
        "Plant in rich soil with plenty of compost. Mulch with straw to keep berries clean and slugs at bay. Pinch off the first flowers in year one for stronger plants.",
      sunlight: "Full sun (6+ hours)",
      waterFrequencyDays: 2,
      idealTemperatureC: "15-26",
      soilType: "Rich, slightly acidic, well-draining",
      articles: [
        {
          title: "Growing Strawberries",
          url: "https://www.almanac.com/plant/strawberries",
          source: "Old Farmer's Almanac",
        },
      ],
      videos: [
        {
          title: "How to Grow Strawberries",
          url: "https://www.youtube.com/watch?v=sRUE1VUo0CA",
          thumbnailUrl: "https://img.youtube.com/vi/sRUE1VUo0CA/hqdefault.jpg",
        },
      ],
    },
    {
      id: 8,
      commonName: "Echeveria",
      scientificName: "Echeveria elegans",
      category: "Succulent",
      difficulty: "easy",
      imageUrl: "/plants/succulent-echeveria.png",
      summary:
        "Sculptural rosette succulent in soft pastel hues - a tiny living jewel.",
      description:
        "Echeveria want sharp drainage and lots of light. Soak the soil thoroughly, then let it dry completely. Indoors, give the brightest window you have. Avoid wetting the rosette.",
      sunlight: "Full to bright direct sun",
      waterFrequencyDays: 14,
      idealTemperatureC: "10-27",
      soilType: "Cactus & succulent mix",
      articles: [
        {
          title: "Echeveria Care Guide",
          url: "https://succulentsbox.com/blogs/care-guide/echeveria",
          source: "Succulents Box",
        },
      ],
      videos: [
        {
          title: "How to Care for Echeveria Succulents",
          url: "https://www.youtube.com/watch?v=itMCheYsYbM",
          thumbnailUrl: "https://img.youtube.com/vi/itMCheYsYbM/hqdefault.jpg",
        },
      ],
    },
    {
      id: 9,
      commonName: "Rosemary",
      scientificName: "Salvia rosmarinus",
      category: "Herb",
      difficulty: "easy",
      imageUrl: "/plants/rosemary.png",
      summary:
        "Woody Mediterranean herb - equal parts kitchen staple and pollinator magnet.",
      description:
        "Loves sun, lean soil, and a dry foot. In wet climates, grow in a clay pot you can move under cover in winter. Prune lightly through the year to keep it bushy.",
      sunlight: "Full sun",
      waterFrequencyDays: 7,
      idealTemperatureC: "10-30",
      soilType: "Sandy, well-draining",
      articles: [
        {
          title: "How to Grow Rosemary",
          url: "https://www.rhs.org.uk/herbs/rosemary/grow-your-own",
          source: "RHS",
        },
      ],
      videos: [
        {
          title: "Growing Rosemary at Home",
          url: "https://www.youtube.com/watch?v=stw9KEpSNEg",
          thumbnailUrl: "https://img.youtube.com/vi/stw9KEpSNEg/hqdefault.jpg",
        },
      ],
    },
    {
      id: 10,
      commonName: "Golden Pothos",
      scientificName: "Epipremnum aureum",
      category: "Houseplant",
      difficulty: "easy",
      imageUrl: "/plants/pothos.png",
      summary:
        "Trailing vine with heart-shaped leaves - forgiving, fast-growing, ever-green.",
      description:
        "Pothos tolerates a wide range of light, but variegation is best in bright, indirect conditions. Let the top 3 cm of soil dry between waterings. Pinch tips to keep it bushy or let it trail.",
      sunlight: "Low to bright indirect light",
      waterFrequencyDays: 8,
      idealTemperatureC: "16-27",
      soilType: "Well-draining indoor potting mix",
      articles: [
        {
          title: "Pothos Care Guide",
          url: "https://www.thesill.com/blogs/plants-101/how-to-care-for-pothos",
          source: "The Sill",
        },
      ],
      videos: [
        {
          title: "Pothos Plant Care",
          url: "https://www.youtube.com/watch?v=OComSHxFHxg",
          thumbnailUrl: "https://img.youtube.com/vi/OComSHxFHxg/hqdefault.jpg",
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
