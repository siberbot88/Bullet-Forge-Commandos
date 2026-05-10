import { WeaponType, ComboType } from './Types';

export const WEAPON_DEFS: Record<WeaponType, any> = {
  pistol: { name: 'Pistol', color: '#a1a1aa', fireRate: 300, damage: 10, speed: 10, maxAmmo: Infinity, price: 0, description: 'Reliable sidearm with infinite ammo.' },
  machineGun: { name: 'Machine Gun', color: '#facc15', fireRate: 100, damage: 8, speed: 12, maxAmmo: 200, price: 300, description: 'Fast fire rate.' },
  shotgun: { name: 'Shotgun', color: '#ef4444', fireRate: 800, damage: 15, speed: 10, maxAmmo: 40, price: 450, description: 'Multi-pellet close-range damage.' },
  rocketLauncher: { name: 'Rocket Launcher', color: '#ec4899', fireRate: 1000, damage: 50, speed: 7, maxAmmo: 20, price: 700, description: 'Explosive projectile damage.' },
  flamethrower: { name: 'Flamethrower', color: '#f97316', fireRate: 50, damage: 2, speed: 6, maxAmmo: 300, price: 850, description: 'Burn damage over time.' },
  laserRifle: { name: 'Laser Rifle', color: '#3b82f6', fireRate: 500, damage: 30, speed: 20, maxAmmo: 50, price: 1000, description: 'Piercing beam.' },
  heavyRailgun: { name: 'Heavy Railgun', color: '#14b8a6', fireRate: 1500, damage: 150, speed: 30, maxAmmo: 10, price: 1500, description: 'Slow but extremely powerful.' },
  teslaCannon: { name: 'Tesla Cannon', color: '#8b5cf6', fireRate: 400, damage: 20, speed: 15, maxAmmo: 60, price: 1800, description: 'Electric chain damage between enemies.' },
};

export const COMBOS: Record<string, ComboType> = {
  'machineGun+rocketLauncher': 'miniRocketStorm',
  'rocketLauncher+machineGun': 'miniRocketStorm',
  'shotgun+flamethrower': 'dragonBreath',
  'flamethrower+shotgun': 'dragonBreath',
  'laserRifle+machineGun': 'pulseBeam',
  'machineGun+laserRifle': 'pulseBeam',
  'rocketLauncher+flamethrower': 'napalmLauncher',
  'flamethrower+rocketLauncher': 'napalmLauncher',
  'shotgun+rocketLauncher': 'clusterCannon',
  'rocketLauncher+shotgun': 'clusterCannon',
  'laserRifle+flamethrower': 'plasmaTorch',
  'flamethrower+laserRifle': 'plasmaTorch',
};

export function getCombo(w1: WeaponType, w2: WeaponType): ComboType {
  return COMBOS[`${w1}+${w2}`] || null;
}
