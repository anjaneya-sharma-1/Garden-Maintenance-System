import {
  db,
  usersTable,
  catalogPlantsTable,
  gardenPlantsTable,
  remindersTable,
  wateringLogsTable,
  type ArticleRef,
  type VideoRef,
} from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { hashPassword } from "./lib/auth";

type CatalogSeed = {
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

const CATALOG: CatalogSeed[] = [
  {
    commonName: "Monstera",
    scientificName: "Monstera deliciosa",
    category: "Houseplant",
    difficulty: "easy",
    imageUrl: "/plants/monstera.png",
    summary:
      "Iconic split-leaf tropical climber that thrives indoors with bright, filtered light.",
    description:
      "Monstera deliciosa is a classic tropical climber from Central American rainforests. Its dramatic fenestrated leaves develop with maturity. It loves a warm, humid corner near a bright window and a moss pole to climb. Water when the top 2cm of soil are dry; let it rest a touch in winter.",
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
        url: "https://www.youtube.com/watch?v=Mw5_3PG2qHc",
        thumbnailUrl: "https://img.youtube.com/vi/Mw5_3PG2qHc/hqdefault.jpg",
      },
    ],
  },
  {
    commonName: "Snake Plant",
    scientificName: "Dracaena trifasciata",
    category: "Houseplant",
    difficulty: "easy",
    imageUrl: "/plants/snake-plant.png",
    summary:
      "Architectural, almost indestructible houseplant that purifies the air while you sleep.",
    description:
      "Snake plants tolerate low light, dry air, and inconsistent watering. Let the soil dry out completely between waterings. Repot every few years in a well-draining mix. Avoid cold drafts below 10°C.",
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
        url: "https://www.youtube.com/watch?v=fpN_FfsHm-w",
        thumbnailUrl: "https://img.youtube.com/vi/fpN_FfsHm-w/hqdefault.jpg",
      },
    ],
  },
  {
    commonName: "Sweet Basil",
    scientificName: "Ocimum basilicum",
    category: "Herb",
    difficulty: "easy",
    imageUrl: "/plants/basil.png",
    summary:
      "Aromatic culinary herb that loves heat and a bright, sunny windowsill.",
    description:
      "Pinch off flower buds to keep leaves tender, and harvest from the top down to encourage bushy growth. Basil hates cold; keep above 15°C. Water at the base in the morning to avoid leaf disease.",
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
        url: "https://www.youtube.com/watch?v=jq19_4B-kLs",
        thumbnailUrl: "https://img.youtube.com/vi/jq19_4B-kLs/hqdefault.jpg",
      },
    ],
  },
  {
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
        url: "https://www.youtube.com/watch?v=4kE12sjQDlk",
        thumbnailUrl: "https://img.youtube.com/vi/4kE12sjQDlk/hqdefault.jpg",
      },
    ],
  },
  {
    commonName: "Fiddle Leaf Fig",
    scientificName: "Ficus lyrata",
    category: "Houseplant",
    difficulty: "hard",
    imageUrl: "/plants/fiddle-leaf-fig.png",
    summary:
      "Statement tree with violin-shaped leaves — picky, but unforgettable.",
    description:
      "Place near a bright east or south window and don't move it. Water when the top 5cm are dry; never let it sit in water. Wipe leaves monthly to keep them photosynthesizing happily.",
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
        url: "https://www.youtube.com/watch?v=zJ4wWYRJQ0o",
        thumbnailUrl: "https://img.youtube.com/vi/zJ4wWYRJQ0o/hqdefault.jpg",
      },
    ],
  },
  {
    commonName: "Strawberry",
    scientificName: "Fragaria × ananassa",
    category: "Fruit",
    difficulty: "medium",
    imageUrl: "/plants/strawberry.png",
    summary:
      "Sweet, low-growing perennial — equally at home in beds, pots, and balcony rails.",
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
        url: "https://www.youtube.com/watch?v=NpWKdf6Z6PA",
        thumbnailUrl: "https://img.youtube.com/vi/NpWKdf6Z6PA/hqdefault.jpg",
      },
    ],
  },
  {
    commonName: "Echeveria",
    scientificName: "Echeveria elegans",
    category: "Succulent",
    difficulty: "easy",
    imageUrl: "/plants/succulent-echeveria.png",
    summary:
      "Sculptural rosette succulent in soft pastel hues — a tiny living jewel.",
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
        url: "https://www.youtube.com/watch?v=8qQvJzYsKfI",
        thumbnailUrl: "https://img.youtube.com/vi/8qQvJzYsKfI/hqdefault.jpg",
      },
    ],
  },
  {
    commonName: "Rosemary",
    scientificName: "Salvia rosmarinus",
    category: "Herb",
    difficulty: "easy",
    imageUrl: "/plants/rosemary.png",
    summary:
      "Woody Mediterranean herb — equal parts kitchen staple and pollinator magnet.",
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
        url: "https://www.youtube.com/watch?v=Wlr1Bxa9pU8",
        thumbnailUrl: "https://img.youtube.com/vi/Wlr1Bxa9pU8/hqdefault.jpg",
      },
    ],
  },
  {
    commonName: "Golden Pothos",
    scientificName: "Epipremnum aureum",
    category: "Houseplant",
    difficulty: "easy",
    imageUrl: "/plants/pothos.png",
    summary:
      "Trailing vine with heart-shaped leaves — forgiving, fast-growing, ever-green.",
    description:
      "Pothos tolerates a wide range of light, but variegation is best in bright, indirect conditions. Let the top 3cm of soil dry between waterings. Pinch tips to keep it bushy or let it trail.",
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
        url: "https://www.youtube.com/watch?v=KILXp4kt0WI",
        thumbnailUrl: "https://img.youtube.com/vi/KILXp4kt0WI/hqdefault.jpg",
      },
    ],
  },
];

async function ensureUser(
  email: string,
  password: string,
  name: string,
  region: string,
  role: "user" | "admin",
) {
  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);
  if (existing) return existing;
  const passwordHash = await hashPassword(password);
  const [created] = await db
    .insert(usersTable)
    .values({ email, passwordHash, name, region, role })
    .returning();
  return created!;
}

async function seed() {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(catalogPlantsTable);

  if (Number(count) === 0) {
    await db.insert(catalogPlantsTable).values(CATALOG);
    console.log(`Seeded ${CATALOG.length} catalog plants.`);
  } else {
    console.log(`Catalog already has ${count} plants — skipping plant seed.`);
  }

  const admin = await ensureUser(
    "admin@gms.local",
    "gardener123",
    "Garden Admin",
    "Pacific Northwest, USA",
    "admin",
  );
  console.log(`Admin user ready: ${admin.email}`);

  const demo = await ensureUser(
    "demo@gms.local",
    "gardener123",
    "Demo Gardener",
    "Brooklyn, NY",
    "user",
  );
  console.log(`Demo user ready: ${demo.email}`);

  const [demoPlantCountRow] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(gardenPlantsTable)
    .where(eq(gardenPlantsTable.userId, demo.id));

  if (Number(demoPlantCountRow?.c ?? 0) === 0) {
    const catalog = await db.select().from(catalogPlantsTable);
    const monstera = catalog.find((c) => c.commonName === "Monstera")!;
    const basil = catalog.find((c) => c.commonName === "Sweet Basil")!;
    const tomato = catalog.find((c) => c.commonName === "Tomato")!;

    const inserted = await db
      .insert(gardenPlantsTable)
      .values([
        {
          userId: demo.id,
          catalogPlantId: monstera.id,
          nickname: "Big Leafy",
          location: "Living room corner",
          notes: "By the east window. Loves morning light.",
          healthStatus: "thriving",
          plantedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 240),
        },
        {
          userId: demo.id,
          catalogPlantId: basil.id,
          nickname: "Pesto",
          location: "Kitchen window",
          notes: "Picked daily for cooking.",
          healthStatus: "healthy",
          plantedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
        },
        {
          userId: demo.id,
          catalogPlantId: tomato.id,
          nickname: "Balcony Toms",
          location: "Balcony planter",
          notes: "Cherry tomatoes, second season.",
          healthStatus: "watch",
          plantedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60),
        },
      ])
      .returning();

    const [bigLeafy, pesto, toms] = inserted;

    await db.insert(wateringLogsTable).values([
      {
        gardenPlantId: bigLeafy!.id,
        amountMl: 250,
        source: "manual",
        wateredAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
      },
      {
        gardenPlantId: pesto!.id,
        amountMl: 120,
        source: "manual",
        wateredAt: new Date(Date.now() - 1000 * 60 * 60 * 18),
      },
      {
        gardenPlantId: toms!.id,
        amountMl: 400,
        source: "reminder",
        wateredAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
      },
      {
        gardenPlantId: toms!.id,
        amountMl: 350,
        source: "manual",
        wateredAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
      },
    ]);

    await db.insert(remindersTable).values([
      {
        gardenPlantId: bigLeafy!.id,
        title: "Water Big Leafy",
        type: "water",
        scheduledAt: new Date(Date.now() + 1000 * 60 * 60 * 6),
        repeatDays: 7,
      },
      {
        gardenPlantId: pesto!.id,
        title: "Pinch flower buds",
        type: "prune",
        scheduledAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
        repeatDays: 7,
      },
      {
        gardenPlantId: toms!.id,
        title: "Check for blight",
        type: "inspect",
        scheduledAt: new Date(Date.now() + 1000 * 60 * 60 * 36),
        repeatDays: 4,
      },
      {
        gardenPlantId: toms!.id,
        title: "Feed tomatoes",
        type: "fertilize",
        scheduledAt: new Date(Date.now() - 1000 * 60 * 60 * 12),
        repeatDays: 14,
        notes: "Use balanced 10-10-10, half strength.",
      },
    ]);

    console.log("Seeded demo garden, watering logs, and reminders.");
  } else {
    console.log("Demo user already has plants — skipping demo data seed.");
  }
}

seed()
  .then(() => {
    console.log("Seed complete.");
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
