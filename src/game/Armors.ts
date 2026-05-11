export interface ArmorConfig {
    id: string;
    name: string;
    price: number;
    maxHpBonus: number;
    damageReduction: number;
    speedModifier: number;
    specialEffect?: string;
}

export const ARMORS: ArmorConfig[] = [
    {
        id: "scout_vest",
        name: "Scout Vest",
        price: 500,
        maxHpBonus: 10,
        damageReduction: 0,
        speedModifier: 0.05,
        specialEffect: "None"
    },
    {
        id: "combat_armor",
        name: "Combat Armor",
        price: 1000,
        maxHpBonus: 25,
        damageReduction: 0.1,
        speedModifier: 0,
        specialEffect: "None"
    },
    {
        id: "heavy_titan_plate",
        name: "Heavy Titan Plate",
        price: 1800,
        maxHpBonus: 50,
        damageReduction: 0.2,
        speedModifier: -0.1,
        specialEffect: "None"
    },
    {
        id: "flameguard_suit",
        name: "Flameguard Suit",
        price: 2200,
        maxHpBonus: 30,
        damageReduction: 0.1,
        speedModifier: 0,
        specialEffect: "Burn Resistance"
    },
    {
        id: "iron_phoenix_armor",
        name: "Iron Phoenix Armor",
        price: 99999, // Unbuyable
        maxHpBonus: 75,
        damageReduction: 0.25,
        speedModifier: 0,
        specialEffect: "Auto-Revive"
    }
];

export function getArmorDef(id: string): ArmorConfig | undefined {
    return ARMORS.find(a => a.id === id);
}
