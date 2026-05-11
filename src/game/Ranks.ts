export interface Rank {
  id: number;
  name: string;
  xpRequired: number;
  badge: string;
  color: string;
}

export const RANKS: Rank[] = [
  { id: 1, name: "Rookie", xpRequired: 0, badge: "I", color: "gray" },
  { id: 2, name: "Private", xpRequired: 500, badge: "II", color: "green" },
  { id: 3, name: "Corporal", xpRequired: 1200, badge: "III", color: "blue" },
  { id: 4, name: "Sergeant", xpRequired: 2500, badge: "IV", color: "cyan" },
  { id: 5, name: "Staff Sergeant", xpRequired: 4500, badge: "V", color: "teal" },
  { id: 6, name: "Lieutenant", xpRequired: 7500, badge: "VI", color: "indigo" },
  { id: 7, name: "Captain", xpRequired: 12000, badge: "VII", color: "purple" },
  { id: 8, name: "Major", xpRequired: 18000, badge: "VIII", color: "fuchsia" },
  { id: 9, name: "Colonel", xpRequired: 26000, badge: "IX", color: "pink" },
  { id: 10, name: "Commander", xpRequired: 38000, badge: "X", color: "rose" },
  { id: 11, name: "Warlord", xpRequired: 55000, badge: "XI", color: "red" },
  { id: 12, name: "Vanguard Elite", xpRequired: 80000, badge: "XII", color: "orange" },
  { id: 13, name: "Iron Legend", xpRequired: 120000, badge: "XIII", color: "yellow" },
  { id: 14, name: "Mythic Commando", xpRequired: 180000, badge: "XIV", color: "amber" },
  { id: 15, name: "Bullet Forge Hero", xpRequired: 250000, badge: "XV", color: "white" }
];

export function getRankByXP(xp: number): Rank {
    let currentRank = RANKS[0];
    for (let i = 0; i < RANKS.length; i++) {
        if (xp >= RANKS[i].xpRequired) {
            currentRank = RANKS[i];
        } else {
            break;
        }
    }
    return currentRank;
}

export function getNextRankByXP(xp: number): Rank | null {
    for (let i = 0; i < RANKS.length; i++) {
        if (xp < RANKS[i].xpRequired) {
            return RANKS[i];
        }
    }
    return null; // Max rank
}
