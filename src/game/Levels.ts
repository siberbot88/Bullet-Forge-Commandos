export interface LevelConfig {
  id: number;
  name: string;
  theme: string;
  difficulty: number;
  objective: string;
  rewardCredits: number;
  boss: string;
  backgroundClass: string;
  enemyMultiplier: number;
  crateDropRate: number;
  weatherEffect: string;
  enemyTypes: ('grunt' | 'rifle' | 'shield' | 'drone' | 'heavy')[];
}

export const LEVELS: LevelConfig[] = [
  {
    id: 1,
    name: "Desert Outpost",
    theme: "desert",
    difficulty: 1,
    objective: "Break through the desert blockade.",
    rewardCredits: 200,
    boss: "Sandcrawler Tank",
    backgroundClass: "#78350f", // amber-900
    enemyMultiplier: 0.8,
    crateDropRate: 0.25,
    weatherEffect: "dust",
    enemyTypes: ['grunt', 'rifle']
  },
  {
    id: 2,
    name: "Jungle Ambush",
    theme: "jungle",
    difficulty: 2,
    objective: "Survive the jungle assault.",
    rewardCredits: 350,
    boss: "Venom Walker",
    backgroundClass: "#064e3b", // emerald-900
    enemyMultiplier: 1.1,
    crateDropRate: 0.2,
    weatherEffect: "rain",
    enemyTypes: ['grunt', 'rifle', 'drone']
  },
  {
    id: 3,
    name: "Snow Fortress",
    theme: "snow",
    difficulty: 3,
    objective: "Infiltrate the frozen bunkers.",
    rewardCredits: 500,
    boss: "Frost Mammoth Mech",
    backgroundClass: "#0f172a", // slate-900 (icy)
    enemyMultiplier: 1.4,
    crateDropRate: 0.15,
    weatherEffect: "snow",
    enemyTypes: ['grunt', 'shield', 'rifle', 'heavy']
  },
  {
    id: 4,
    name: "Urban Warzone",
    theme: "urban",
    difficulty: 4,
    objective: "Navigate the ruined city.",
    rewardCredits: 700,
    boss: "Siege Rail Tank",
    backgroundClass: "#111827", // gray-900
    enemyMultiplier: 1.7,
    crateDropRate: 0.15,
    weatherEffect: "smoke",
    enemyTypes: ['grunt', 'rifle', 'drone', 'shield', 'heavy']
  },
  {
    id: 5,
    name: "Toxic Factory",
    theme: "toxic",
    difficulty: 5,
    objective: "Destroy the biohazard facility.",
    rewardCredits: 900,
    boss: "Biohazard Crusher",
    backgroundClass: "#14532d", // green-900
    enemyMultiplier: 2.1,
    crateDropRate: 0.1,
    weatherEffect: "gas",
    enemyTypes: ['shield', 'drone', 'heavy']
  },
  {
    id: 6,
    name: "Final Iron Citadel",
    theme: "citadel",
    difficulty: 6,
    objective: "Defeat the Iron Overlord.",
    rewardCredits: 1500,
    boss: "Iron Overlord Core",
    backgroundClass: "#450a0a", // red-950
    enemyMultiplier: 2.6,
    crateDropRate: 0.1,
    weatherEffect: "ash",
    enemyTypes: ['grunt', 'rifle', 'shield', 'drone', 'heavy']
  }
];
