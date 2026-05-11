export interface MeleeWeaponConfig {
    id: string;
    name: string;
    price: number;
    baseDamage: number;
    cooldown: number; // in frames
    range: number;
    color: string;
    specialEffect?: string;
}

export const MELEE_WEAPONS: MeleeWeaponConfig[] = [
    {
        id: "combat_knife",
        name: "Combat Knife",
        price: 0,
        baseDamage: 20,
        cooldown: 20,
        range: 40,
        color: "#9ca3af"
    },
    {
        id: "steel_machete",
        name: "Steel Machete",
        price: 600,
        baseDamage: 35,
        cooldown: 25,
        range: 55,
        color: "#d1d5db"
    },
    {
        id: "shock_blade",
        name: "Shock Blade",
        price: 1200,
        baseDamage: 25,
        cooldown: 18,
        range: 45,
        color: "#60a5fa",
        specialEffect: "Stun"
    },
    {
        id: "flame_katana",
        name: "Flame Katana",
        price: 1800,
        baseDamage: 45,
        cooldown: 22,
        range: 65,
        color: "#ef4444",
        specialEffect: "Burn"
    },
    {
        id: "plasma_saber",
        name: "Plasma Saber",
        price: 99999, // Unbuyable, final stage reward
        baseDamage: 80,
        cooldown: 15,
        range: 75,
        color: "#a855f7",
        specialEffect: "Deflect"
    }
];

export function getMeleeDef(id: string): MeleeWeaponConfig | undefined {
    return MELEE_WEAPONS.find(w => w.id === id);
}
