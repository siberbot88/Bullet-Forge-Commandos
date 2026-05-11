export type WeaponType = 'pistol' | 'machineGun' | 'shotgun' | 'rocketLauncher' | 'flamethrower' | 'laserRifle' | 'heavyRailgun' | 'teslaCannon';
export type ComboType = 'miniRocketStorm' | 'dragonBreath' | 'pulseBeam' | 'napalmLauncher' | 'clusterCannon' | 'plasmaTorch' | null;

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GameObject extends Rect {
  vx: number;
  vy: number;
  color?: string;
  markedForDeletion?: boolean;
}

export interface FloatingText extends Rect {
  text: string;
  color: string;
  lifeTime: number;
  maxLifeTime: number;
  vx: number;
  vy: number;
}

export interface Player extends GameObject {
  hp: number;
  maxHp: number;
  lives: number;
  score: number;
  isCrouching: boolean;
  isGrounded: boolean;
  facingRight: boolean;
  invulnerableTimer: number;
  currentWeapon: WeaponType;
  secondaryWeapon: WeaponType | null;
  comboActive: ComboType;
  comboTimer: number;
  ammo: Record<WeaponType, number>;
  grenades: number;
  speed: number;
  creditsEarned: number;
  xpEarned: number;
  damageReduction?: number;
  equippedMeleeWeapon?: string | null;
  meleeLevel?: number;
  meleeCooldownTimer?: number;
}

export interface Enemy extends GameObject {
  type: 'grunt' | 'rifle' | 'shield' | 'drone' | 'heavy' | 'boss';
  hp: number;
  maxHp: number;
  speed: number;
  attackTimer: number;
  phase?: number;
}

export interface Bullet extends GameObject {
  isPlayer: boolean;
  damage: number;
  lifeTime: number;
  weaponType?: string;
}

export interface Particle extends GameObject {
  lifeTime: number;
  maxLifeTime: number;
  color: string;
  size: number;
}

export interface ItemDrop extends GameObject {
  type: 'health' | 'grenade' | WeaponType;
}

export interface Crate extends GameObject {
  hp: number;
}
