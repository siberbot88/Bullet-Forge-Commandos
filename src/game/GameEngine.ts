import { audioSystem } from '../lib/audio';
import { Player, Enemy, Bullet, Particle, ItemDrop, Crate, Rect, WeaponType, ComboType, FloatingText } from './Types';
import { WEAPON_DEFS, getCombo } from './Weapons';
import { getArmorDef } from './Armors';
import { getMeleeDef } from './MeleeWeapons';

export class GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number = 800;
  height: number = 600;

  keys: { [key: string]: boolean } = {};
  
  // State
  player!: Player;
  enemies: Enemy[] = [];
  bullets: Bullet[] = [];
  particles: Particle[] = [];
  items: ItemDrop[] = [];
  crates: Crate[] = [];
  floatingTexts: FloatingText[] = [];
  
  bgScrollX: number = 0;
  frameCount: number = 0;
  lastShootTime: number = 0;
  screenShakeTimer: number = 0;
  
  state: 'START' | 'PLAYING' | 'PAUSED' | 'GAMEOVER' | 'VICTORY' = 'START';
  onStateChange: (state: string) => void;
  onUpdateHUD: (p: Player) => void;

  gravity: number = 0.5;
  bossActive: boolean = false;
  bossSpawningTimer: number = 0;
  weaponLevels: Record<string, number> = {};
  levelConfig: any = null;
  weatherParticles: any[] = [];

  constructor(canvas: HTMLCanvasElement, onStateChange: (state: string) => void, onUpdateHUD: (p: Player) => void) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.onStateChange = onStateChange;
    this.onUpdateHUD = onUpdateHUD;

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  destroy() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }

  handleKeyDown = (e: KeyboardEvent) => {
    this.keys[e.key.toLowerCase()] = true;
    
    if (this.state === 'PLAYING') {
      if (e.key.toLowerCase() === 'p') {
        this.setState('PAUSED');
      }
      if (e.key.toLowerCase() === 'k') {
        this.throwGrenade();
      }
      if (e.key.toLowerCase() === 'l') {
        this.switchWeapon();
      }
    } else if (this.state === 'PAUSED') {
      if (e.key.toLowerCase() === 'p') {
        this.setState('PLAYING');
      }
    }
  };

  handleKeyUp = (e: KeyboardEvent) => {
    this.keys[e.key.toLowerCase()] = false;
  };
  
  setState(s: typeof this.state) {
    this.state = s;
    this.onStateChange(s);
  }

  initGame(savedData: { primary: WeaponType, secondary: WeaponType | null, levels: Record<string, number>, levelConfig?: any, equippedArmor?: string | null, equippedMeleeWeapon?: string | null, meleeLevels?: Record<string, number>, maxLives?: number, currentLives?: number } = { primary: 'pistol', secondary: null, levels: {} }) {
    this.levelConfig = savedData.levelConfig || null;
    
    // Armor bonus
    let armorBonusHp = 0;
    let armorDmgReduction = 0;
    let speedMod = 0;
    if (savedData.equippedArmor) {
        const armorDef = getArmorDef(savedData.equippedArmor);
        if (armorDef) {
            armorBonusHp = armorDef.maxHpBonus;
            armorDmgReduction = armorDef.damageReduction;
            speedMod = armorDef.speedModifier;
        }
    }

    this.player = {
      x: 100, y: 300, width: 30, height: 50,
      vx: 0, vy: 0,
      hp: 100 + armorBonusHp, maxHp: 100 + armorBonusHp, lives: savedData.currentLives ?? 3, score: 0, creditsEarned: 0, xpEarned: 0,
      isCrouching: false, isGrounded: false, facingRight: true,
      invulnerableTimer: 0,
      currentWeapon: savedData.primary || 'pistol', secondaryWeapon: savedData.secondary,
      comboActive: null, comboTimer: 0,
      ammo: { pistol: Infinity, machineGun: 0, shotgun: 0, rocketLauncher: 0, flamethrower: 0, laserRifle: 0, heavyRailgun: 0, teslaCannon: 0 },
      grenades: 3, speed: 5 * (1 + speedMod),
      damageReduction: armorDmgReduction,
      equippedMeleeWeapon: savedData.equippedMeleeWeapon,
      meleeLevel: savedData.equippedMeleeWeapon ? (savedData.meleeLevels?.[savedData.equippedMeleeWeapon] || 1) : 1,
      meleeCooldownTimer: 0
    };
    
    // Give max ammo to starting weapons, adjusted by upgrade level (level 3 gives +20%)
    const initAmmo = (w: WeaponType) => {
        if (w === 'pistol') return Infinity;
        let base = WEAPON_DEFS[w].maxAmmo;
        if (savedData.levels[w] >= 3) base = Math.floor(base * 1.2);
        return base;
    };
    
    this.player.ammo[this.player.currentWeapon as WeaponType] = initAmmo(this.player.currentWeapon as WeaponType);
    if (this.player.secondaryWeapon) {
        this.player.ammo[this.player.secondaryWeapon as WeaponType] = initAmmo(this.player.secondaryWeapon as WeaponType);
    }
    
    this.weaponLevels = savedData.levels || {};
    this.enemies = [];
    this.bullets = [];
    this.particles = [];
    this.items = [];
    this.crates = [];
    this.bgScrollX = 0;
    this.frameCount = 0;
    this.bossActive = false;
    this.bossSpawningTimer = this.levelConfig ? 3600 : 3600; // time until boss spawns (frames)

    // Initial crates
    for(let i=0; i<3; i++) {
        this.crates.push({
            x: 400 + i * 250, y: this.height - 90, width: 40, height: 40, vx: 0, vy: 0, hp: 20
        });
    }

    // Weather Init
    this.weatherParticles = [];
    if (this.levelConfig) {
      const count = this.levelConfig.weatherEffect === 'rain' ? 100 : (this.levelConfig.weatherEffect === 'snow' ? 80 : 50);
      for(let i=0; i<count; i++) {
        this.weatherParticles.push({
          x: Math.random() * this.width,
          y: Math.random() * this.height,
          size: Math.random() * 3 + 1,
          speed: Math.random() * 3 + 1,
          angle: Math.random() * Math.PI
        });
      }
    }

    this.setState('PLAYING');
  }

  switchWeapon() {
    if (this.player.secondaryWeapon) {
      const temp = this.player.currentWeapon;
      this.player.currentWeapon = this.player.secondaryWeapon;
      this.player.secondaryWeapon = temp;
    }
  }

  throwGrenade() {
    if (this.player.grenades > 0) {
      this.player.grenades--;
      this.bullets.push({
        x: this.player.x + (this.player.facingRight ? 20 : -10),
        y: this.player.y,
        width: 10, height: 10,
        vx: this.player.facingRight ? 8 : -8,
        vy: -5,
        isPlayer: true,
        damage: 100,
        lifeTime: 60,
        weaponType: 'grenade'
      });
      audioSystem.playShoot('rocketLauncher');
    }
  }

  update() {
    if (this.state !== 'PLAYING') return;
    this.frameCount++;

    this.updatePlayer();
    this.updateBullets();
    this.updateEnemies();
    this.updateParticles();
    this.updateWeather();
    this.updateFloatingTexts();
    this.updateItems();
    this.updateCrates();
    this.checkCollisions();
    this.spawnEntities();

    if (this.screenShakeTimer > 0) this.screenShakeTimer--;
    
    if (this.player.hp <= 0) {
      if (this.player.lives > 0) {
        this.player.lives--;
        this.player.hp = this.player.maxHp;
        this.player.invulnerableTimer = 120;
        audioSystem.playHurt();
      } else {
        this.setState('GAMEOVER');
      }
    }
    
    this.onUpdateHUD(this.player);
  }

  updatePlayer() {
    const p = this.player;
    if (p.meleeCooldownTimer && p.meleeCooldownTimer > 0) p.meleeCooldownTimer--;
    if (p.invulnerableTimer > 0) p.invulnerableTimer--;
    if (p.comboTimer > 0) p.comboTimer--;
    if (p.comboTimer === 0) p.comboActive = null;

    if (this.keys['a'] || this.keys['arrowleft']) {
      p.vx = -p.speed;
      p.facingRight = false;
    } else if (this.keys['d'] || this.keys['arrowright']) {
      p.vx = p.speed;
      p.facingRight = true;
    } else {
      p.vx = 0;
    }

    p.isCrouching = this.keys['s'] || this.keys['arrowdown'];
    p.height = p.isCrouching ? 30 : 50;

    if ((this.keys['w'] || this.keys['arrowup'] || this.keys[' ']) && p.isGrounded && !p.isCrouching) {
      p.vy = -12;
      p.isGrounded = false;
      audioSystem.playJump();
    }

    p.vy += this.gravity;
    
    p.x += p.vx;
    p.y += p.vy;

    // Floor collision
    const groundY = this.height - 50;
    if (p.y + p.height > groundY) {
      p.y = groundY - p.height;
      p.vy = 0;
      p.isGrounded = true;
    }

    // Camera limit
    if (p.x < 50) p.x = 50;
    if (p.x > this.width / 2) {
      const scroll = p.x - this.width / 2;
      this.bgScrollX += scroll;
      p.x = this.width / 2;
      
      // Move entities back to simulate scrolling
      this.enemies.forEach(e => e.x -= scroll);
      this.bullets.forEach(b => b.x -= scroll);
      this.particles.forEach(pt => pt.x -= scroll);
      this.items.forEach(i => i.x -= scroll);
      this.crates.forEach(c => c.x -= scroll);
      this.floatingTexts.forEach(t => t.x -= scroll);
    }

    // Shooting
    if (this.keys['j']) {
      this.playerShoot();
    }
    
    // Melee
    if (this.keys['i']) {
      this.playerMelee();
    }
  }

  playerMelee() {
     const p = this.player;
     if (!p.equippedMeleeWeapon) return;
     if (p.meleeCooldownTimer && p.meleeCooldownTimer > 0) return;

     const meleeDef = getMeleeDef(p.equippedMeleeWeapon);
     if (!meleeDef) return;

     const level = p.meleeLevel || 1;
     const range = meleeDef.range + (level >= 4 ? 20 : 0);
     const damage = Math.floor(meleeDef.baseDamage * (1 + (level-1)*0.15));
     
     p.meleeCooldownTimer = meleeDef.cooldown;

     // Attack rect
     const attackX = p.facingRight ? p.x + p.width : p.x - range;
     const r = { x: attackX, y: p.y, width: range, height: p.height };

     // Visual effect
     this.addParticles(p.facingRight ? p.x + p.width + 10 : p.x - 10, p.y + p.height/2, meleeDef.color, 15);
     audioSystem.playShoot('pistol'); // Or a swoosh sound

     // Hit enemies
     this.enemies.forEach(e => {
        if (this.rectIntersect(r, e)) {
           e.hp -= damage;
           
           if (e.hp > 0 && meleeDef.specialEffect) {
               if (meleeDef.specialEffect === 'Stun') {
                  e.vx = 0;
                  // Optional: add stun status
               } else if (meleeDef.specialEffect === 'Burn') {
                  e.hp -= 15; // Instant bonus burn
               }
           }
           
           if (e.hp <= 0) e.markedForDeletion = true;
           this.addParticles(e.x + e.width/2, e.y + e.height/2, meleeDef.color, 5);
        }
     });

     // Hit crates
     this.crates.forEach(c => {
         if (this.rectIntersect(r, c)) {
             c.hp -= damage;
             if (c.hp <= 0) c.markedForDeletion = true;
         }
     });
     
     // Bullet deflection (level 5 or specific effect)
     if (meleeDef.specialEffect === 'Deflect' || level >= 5) {
         this.bullets.forEach(b => {
             if (!b.isPlayer && this.rectIntersect(r, b)) {
                 b.isPlayer = true;
                 b.vx = -b.vx;
                 b.damage *= 2;
             }
         });
     }
  }

  playerShoot() {
    const p = this.player;
    let wtype = p.comboActive ? p.comboActive : p.currentWeapon;
    const isCombo = p.comboActive !== null;
    
    const now = Date.now();
    
    let wDef: any;
    if (isCombo) {
      wDef = { fireRate: 100, damage: 20, speed: 15 }; // Default combo stats
      if (wtype === 'miniRocketStorm') { wDef.fireRate = 120; wDef.damage = 15; wDef.speed = 10; }
      else if (wtype === 'dragonBreath') { wDef.fireRate = 400; wDef.damage = 25; wDef.speed = 12; }
      else if (wtype === 'pulseBeam') { wDef.fireRate = 80; wDef.damage = 12; wDef.speed = 25; }
      else if (wtype === 'napalmLauncher') { wDef.fireRate = 600; wDef.damage = 40; wDef.speed = 8; }
      else if (wtype === 'clusterCannon') { wDef.fireRate = 600; wDef.damage = 25; wDef.speed = 10; }
      else if (wtype === 'plasmaTorch') { wDef.fireRate = 50; wDef.damage = 8; wDef.speed = 6; }
    } else {
      wDef = { ...WEAPON_DEFS[wtype as WeaponType] };
      const level = this.weaponLevels[wtype as WeaponType] || 1;
      if (level >= 2) wDef.damage = Math.floor(wDef.damage * 1.15);
      if (level >= 4) wDef.fireRate = Math.floor(wDef.fireRate * 0.85); // faster fire rate
      // Level 5 special effect can be custom logic later
    }
    
    if (now - this.lastShootTime > wDef.fireRate) {
      if (!isCombo) {
        if (wtype !== 'pistol') {
            if (p.ammo[wtype as WeaponType] <= 0) {
               p.currentWeapon = 'pistol'; // Revert to pistol if empty
               return; 
            }
            p.ammo[wtype as WeaponType]--;
        }
      }

      this.lastShootTime = now;
      audioSystem.playShoot(isCombo ? 'machineGun' : wtype);
      
      const sparkX = p.facingRight ? p.x + p.width : p.x;
      const sparkY = p.y + (p.isCrouching ? 10 : 20);
      
      this.addParticles(sparkX, sparkY, '#fbbf24', 3); // Muzzle flash
      
      // Shotgun/dragonBreath
      if (wtype === 'shotgun' || wtype === 'dragonBreath' || wtype === 'clusterCannon') {
         for(let i=-2; i<=2; i++) {
           this.bullets.push({
             x: sparkX, y: sparkY + i*2,
             width: 6, height: 6,
             vx: (p.facingRight ? 1 : -1) * wDef.speed,
             vy: i * 0.5,
             isPlayer: true,
             damage: wDef.damage,
             lifeTime: wtype === 'shotgun' ? 30 : 60,
             weaponType: wtype
           });
         }
      } else if (wtype === 'flamethrower' || wtype === 'plasmaTorch') {
        this.bullets.push({
             x: sparkX, y: sparkY + (Math.random()*10-5),
             width: 15, height: 15,
             vx: (p.facingRight ? 1 : -1) * wDef.speed + (Math.random()*2-1),
             vy: (Math.random()*2-1),
             isPlayer: true,
             damage: wDef.damage,
             lifeTime: 20,
             weaponType: wtype
           });
      } else if (wtype === 'miniRocketStorm') {
        this.bullets.push({
             x: sparkX, y: sparkY + (Math.random()*20-10),
             width: 12, height: 6,
             vx: (p.facingRight ? 1 : -1) * wDef.speed,
             vy: 0,
             isPlayer: true,
             damage: wDef.damage,
             lifeTime: 80,
             weaponType: wtype
           });
      } else if (wtype === 'heavyRailgun' || wtype === 'teslaCannon') {
        this.bullets.push({
             x: sparkX, y: sparkY - (wtype === 'heavyRailgun' ? 4 : 2),
             width: wtype === 'heavyRailgun' ? 40 : 25,
             height: wtype === 'heavyRailgun' ? 12 : 6,
             vx: (p.facingRight ? 1 : -1) * wDef.speed,
             vy: 0,
             isPlayer: true,
             damage: wDef.damage,
             lifeTime: 120,
             weaponType: wtype
           });
      } else {
        // Standard
        this.bullets.push({
             x: sparkX, y: sparkY,
             width: wtype === 'laserRifle' || wtype === 'pulseBeam' ? 20 : 8,
             height: wtype === 'laserRifle' || wtype === 'pulseBeam' ? 4 : 4,
             vx: (p.facingRight ? 1 : -1) * wDef.speed,
             vy: 0,
             isPlayer: true,
             damage: wDef.damage,
             lifeTime: 100,
             weaponType: wtype
           });
      }
    }
  }

  updateBullets() {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx;
      
      if (b.weaponType === 'grenade') {
        b.vy += this.gravity;
        b.y += b.vy;
        if (b.y > this.height - 50) {
            b.y = this.height - 50;
            b.vy = -b.vy * 0.5; // bounce
            b.vx *= 0.5;
        }
      } else {
        b.y += b.vy;
      }
      
      b.lifeTime--;
      
      if (b.lifeTime <= 0) {
          if (b.weaponType === 'grenade' || b.weaponType === 'rocketLauncher' || b.weaponType === 'napalmLauncher' || b.weaponType === 'clusterCannon') {
             this.explode(b.x, b.y, b.isPlayer, b.damage * 2, 80);
          }
          this.bullets.splice(i, 1);
      } else if (b.x < 0 || b.x > this.width) {
        this.bullets.splice(i, 1);
      }
    }
  }

  damagePlayer(amount: number) {
      if (this.player.invulnerableTimer > 0) return;
      
      const reduction = this.player.damageReduction || 0;
      const actualDamage = Math.max(1, Math.floor(amount * (1 - reduction)));
      this.player.hp -= actualDamage;
      
      this.player.invulnerableTimer = 60;
      audioSystem.playHurt();
      this.addParticles(this.player.x + this.player.width/2, this.player.y + this.player.height/2, '#ef4444', 10);
  }

  explode(x: number, y: number, isPlayer: boolean, damage: number, radius: number) {
     this.screenShakeTimer = 10;
     audioSystem.playExplosion();
     this.addParticles(x, y, '#ef4444', 30);
     this.addParticles(x, y, '#f97316', 20);
     this.addParticles(x, y, '#4b5563', 10);
     
     // Explosion damage
     const r = {x: x - radius, y: y - radius, width: radius*2, height: radius*2};
     
     if (isPlayer) {
         this.enemies.forEach(e => {
             if (this.rectIntersect(r, e)) {
                 e.hp -= damage;
                 if (e.hp <= 0) e.markedForDeletion = true;
             }
         });
         this.crates.forEach(c => {
             if (this.rectIntersect(r, c)) {
                 c.hp -= damage;
                 if (c.hp <= 0) c.markedForDeletion = true;
             }
         });
     } else {
         if (this.rectIntersect(r, this.player)) {
             this.damagePlayer(damage);
         }
     }
  }

  updateEnemies() {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.x += e.vx;
      e.y += e.vy;
      e.attackTimer--;

      // Basic AI
      if (e.type === 'grunt') {
         e.vy += this.gravity;
         e.x += e.vx;
      } else if (e.type === 'rifle') {
         e.vy += this.gravity;
         if (e.attackTimer <= 0 && Math.abs(e.x - this.player.x) < 400) {
             this.bullets.push({
                 x: e.x, y: e.y + e.height/2, width: 8, height: 4,
                 vx: e.x > this.player.x ? -6 : 6, vy: 0,
                 isPlayer: false, damage: 10, lifeTime: 100
             });
             e.attackTimer = 100;
             audioSystem.playShoot('pistol');
         }
      } else if (e.type === 'drone') {
         e.y += Math.sin(this.frameCount * 0.05) * 2;
         if (e.attackTimer <= 0 && Math.abs(e.x - this.player.x) < 300) {
             const angle = Math.atan2((this.player.y + this.player.height/2) - (e.y + e.height/2), this.player.x - e.x);
             this.bullets.push({
                 x: e.x, y: e.y + e.height/2, width: 6, height: 6,
                 vx: Math.cos(angle) * 5, vy: Math.sin(angle) * 5,
                 isPlayer: false, damage: 15, lifeTime: 100
             });
             e.attackTimer = 80;
         }
      } else if (e.type === 'boss') {
         // Boss fight logic
         const bossType = this.levelConfig ? this.levelConfig.boss : 'Iron Beetle Tank';
         
         if (e.attackTimer <= 0) {
             if (bossType === 'Sandcrawler Tank' || bossType === 'Iron Beetle Tank') {
                 if (e.phase === 1) {
                     for(let c=0; c<3; c++) {
                       setTimeout(() => {
                            if (e.markedForDeletion || this.state !== 'PLAYING') return;
                            this.bullets.push({ x: e.x, y: e.y + 100, width: 16, height: 16, vx: -8, vy: 0, isPlayer: false, damage: 25, lifeTime: 200, weaponType: 'rocketLauncher' });
                            audioSystem.playShoot('rocketLauncher');
                       }, c * 300);
                     }
                     e.attackTimer = 150;
                 } else if (e.phase === 2) {
                     this.enemies.push({ type: 'rifle', x: e.x + 50, y: e.y + e.height - 50, width: 40, height: 50, vx: -2, vy: 0, hp: 30, maxHp: 30, speed: 2, attackTimer: 30 });
                     e.attackTimer = 120;
                 } else if (e.phase === 3) {
                     e.vx = -3;
                     setTimeout(() => { if (e) e.vx = -0.5; }, 1000);
                     e.attackTimer = 100;
                 }
             } else if (bossType === 'Venom Walker') {
                 if (e.phase === 1) {
                     this.bullets.push({ x: e.x, y: e.y + 50, width: 10, height: 10, vx: -6, vy: 2, isPlayer: false, damage: 15, lifeTime: 120, color: '#22c55e' });
                     this.bullets.push({ x: e.x, y: e.y + 50, width: 10, height: 10, vx: -6, vy: -2, isPlayer: false, damage: 15, lifeTime: 120, color: '#22c55e' });
                     e.attackTimer = 80;
                 } else if (e.phase === 2 || e.phase === 3) {
                     this.enemies.push({ type: 'drone', x: e.x + 50, y: e.y - 50, width: 30, height: 30, vx: -3, vy: -2, hp: 20, maxHp: 20, speed: 3, attackTimer: 30 });
                     e.attackTimer = 120;
                 }
             } else if (bossType === 'Frost Mammoth Mech') {
                 if (e.phase === 1 || e.phase === 2) {
                     for(let c=0; c<5; c++) {
                       setTimeout(() => {
                            if (e.markedForDeletion || this.state !== 'PLAYING') return;
                            this.bullets.push({ x: e.x, y: e.y + 80, width: 12, height: 12, vx: -10, vy: (Math.random()*4-2), isPlayer: false, damage: 20, lifeTime: 150, color: '#93c5fd' });
                       }, c * 100);
                     }
                     e.attackTimer = 140;
                 } else if (e.phase === 3) {
                     this.addParticles(e.x + e.width/2, e.y + e.height, '#e2e8f0', 20); // stomp
                     this.bullets.push({ x: e.x, y: this.height - 50, width: 40, height: 20, vx: -12, vy: 0, isPlayer: false, damage: 30, lifeTime: 100, color: '#e2e8f0' });
                     e.attackTimer = 90;
                 }
             } else if (bossType === 'Siege Rail Tank') {
                 if (e.phase === 1) {
                     this.bullets.push({ x: e.x, y: e.y + 120, width: 80, height: 10, vx: -15, vy: 0, isPlayer: false, damage: 40, lifeTime: 80, color: '#bfdbfe' });
                     e.attackTimer = 120;
                 } else if (e.phase === 2) {
                     this.bullets.push({ x: e.x, y: e.y + 50, width: 16, height: 16, vx: -6, vy: -5, isPlayer: false, damage: 25, lifeTime: 200, weaponType: 'rocketLauncher' });
                     e.attackTimer = 60;
                 } else if (e.phase === 3) {
                     this.enemies.push({ type: 'shield', x: e.x - 20, y: e.y + e.height - 50, width: 40, height: 50, vx: -2, vy: 0, hp: 100, maxHp: 100, speed: 2, attackTimer: 30, color: '#3b82f6' });
                     e.attackTimer = 200;
                 }
             } else if (bossType === 'Biohazard Crusher') {
                  if (e.phase === 1 || e.phase === 2) {
                     this.bullets.push({ x: e.x, y: e.y + 100, width: 25, height: 25, vx: -5, vy: -3, isPlayer: false, damage: 25, lifeTime: 150, color: '#16a34a' });
                     e.attackTimer = 80;
                  } else if (e.phase === 3) {
                     this.enemies.push({ type: 'heavy', x: e.x - 20, y: e.y + e.height - 60, width: 50, height: 60, vx: -1, vy: 0, hp: 150, maxHp: 150, speed: 1, attackTimer: 60, color: '#111827' });
                     e.attackTimer = 200;
                  }
             } else if (bossType === 'Iron Overlord Core') {
                 if (e.phase === 1) {
                     this.bullets.push({ x: e.x, y: e.y + 100, width: 16, height: 16, vx: -8, vy: 0, isPlayer: false, damage: 25, lifeTime: 200, weaponType: 'rocketLauncher' });
                     e.attackTimer = 60;
                 } else if (e.phase === 2) {
                     this.bullets.push({ x: e.x, y: e.y + 120, width: 80, height: 10, vx: -15, vy: 0, isPlayer: false, damage: 40, lifeTime: 80, color: '#bfdbfe' });
                     e.attackTimer = 80;
                 } else if (e.phase === 3) {
                     this.enemies.push({ type: 'heavy', x: e.x - 20, y: e.y + e.height - 60, width: 50, height: 60, vx: -1, vy: 0, hp: 200, maxHp: 200, speed: 1, attackTimer: 40, color: '#991b1b' });
                     e.attackTimer = 150;
                 } else if (e.phase === 4) { // Rage
                     this.bullets.push({ x: e.x, y: e.y + 100 + (Math.random()*80-40), width: 12, height: 12, vx: -12, vy: (Math.random()*4-2), isPlayer: false, damage: 25, lifeTime: 150, color: '#fef08a' });
                     e.attackTimer = 15;
                 }
             }
         }
         
         // Phase changes
         if (e.hp < e.maxHp * 0.25 && bossType === 'Iron Overlord Core') e.phase = 4;
         else if (e.hp < e.maxHp * 0.3) e.phase = 3;
         else if (e.hp < e.maxHp * 0.6) e.phase = 2;
      }

      // Ground collision
      if (e.type !== 'drone') {
          const groundY = this.height - 50;
          if (e.y + e.height > groundY) {
            e.y = groundY - e.height;
            e.vy = 0;
          }
      }

      if (e.markedForDeletion || e.hp <= 0) {
         this.player.score += e.type === 'boss' ? 5000 : 100;
         
         // Credits & XP
         let creds = 10;
         let xp = 10;
         if (e.type === 'rifle') { creds = 15; xp = 15; }
         if (e.type === 'drone') { creds = 20; xp = 20; }
         if (e.type === 'shield') { creds = 25; xp = 25; }
         if (e.type === 'heavy') { creds = 40; xp = 40; }
         if (e.type === 'boss') { creds = this.levelConfig ? this.levelConfig.rewardCredits : 300; xp = 250; }
         
         this.player.creditsEarned += creds;
         this.player.xpEarned += xp;
         this.floatingTexts.push({ x: e.x, y: e.y, text: `+${creds}`, color: '#fbbf24', lifeTime: 60, maxLifeTime: 60, width: 0, height: 0, vx: 0, vy: -1 });

         this.explode(e.x + e.width/2, e.y + e.height/2, false, 0, e.type === 'boss' ? 100 : 30);
         if (e.type === 'boss') {
            this.setState('VICTORY');
         } else {
             // 20% chance to drop item
             if (Math.random() < 0.2) this.spawnItemDrop(e.x, e.y);
         }
         this.enemies.splice(i, 1);
      } else if (e.x < -200) {
         this.enemies.splice(i, 1);
      }
    }
  }

  updateWeather() {
      for (const w of this.weatherParticles) {
          if (this.levelConfig?.weatherEffect === 'dust' || this.levelConfig?.weatherEffect === 'smoke' || this.levelConfig?.weatherEffect === 'gas' || this.levelConfig?.weatherEffect === 'ash') {
              w.x += Math.cos(w.angle) * w.speed - 2; // drift left
              w.y += Math.sin(w.angle) * w.speed * 0.5 - 0.5;
              w.angle += 0.05;
          } else { // rain / snow
              w.x -= (this.levelConfig?.weatherEffect === 'rain' ? 5 : 2);
              w.y += w.speed * (this.levelConfig?.weatherEffect === 'rain' ? 5 : 2);
          }

          if (w.y > this.height || w.x < 0 || w.x > this.width) {
              w.y = this.levelConfig?.weatherEffect === 'rain' || this.levelConfig?.weatherEffect === 'snow' ? -10 : Math.random() * this.height;
              w.x = Math.random() * this.width + (this.levelConfig?.weatherEffect === 'rain' ? 200 : 0);
          }
      }
  }

  updateParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.lifeTime--;
        if (p.lifeTime <= 0) {
            this.particles.splice(i, 1);
        }
    }
  }

  updateFloatingTexts() {
      for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
          const t = this.floatingTexts[i];
          t.x += t.vx;
          t.y += t.vy;
          t.lifeTime--;
          if (t.lifeTime <= 0) {
              this.floatingTexts.splice(i, 1);
          }
      }
  }

  updateItems() {
      for (let i = this.items.length - 1; i >= 0; i--) {
        const item = this.items[i];
        item.vy += this.gravity;
        item.y += item.vy;
        item.x += item.vx;
        const groundY = this.height - 50;
        if (item.y + item.height > groundY) {
            item.y = groundY - item.height;
            item.vy = -item.vy * 0.3;
            item.vx *= 0.5;
        }

        if (this.rectIntersect(item, this.player)) {
            // Collect
            audioSystem.playPickup();
            if (item.type === 'health') {
                this.player.hp = Math.min(this.player.maxHp, this.player.hp + 25);
            } else if (item.type === 'grenade') {
                this.player.grenades += 2;
            } else {
                // Weapon
                const w = item.type as WeaponType;
                if (this.player.currentWeapon === w || this.player.secondaryWeapon === w) {
                   this.player.ammo[w] = Math.min(WEAPON_DEFS[w].maxAmmo, this.player.ammo[w] + Math.floor(WEAPON_DEFS[w].maxAmmo/2));
                } else {
                   if (this.player.currentWeapon !== 'pistol' && this.player.secondaryWeapon === null) {
                       this.player.secondaryWeapon = w;
                   } else if (this.player.currentWeapon === 'pistol') {
                       this.player.currentWeapon = w;
                   } else {
                       this.player.currentWeapon = w; // replace current
                   }
                   this.player.ammo[w] = WEAPON_DEFS[w].maxAmmo;
                }

                // Check combo
                if (this.player.secondaryWeapon) {
                    const c = getCombo(this.player.currentWeapon, this.player.secondaryWeapon);
                    if (c) {
                        this.player.comboActive = c;
                        this.player.comboTimer = 600; // 10 seconds (60fps)
                        // Clear secondary to indicate they fused
                        this.player.secondaryWeapon = null;
                        this.player.currentWeapon = 'pistol'; // Revert to base pistol after combo finishes
                    }
                }
            }
            this.items.splice(i, 1);
        }
      }
  }

  updateCrates() {
      for (let i = this.crates.length - 1; i >= 0; i--) {
          const c = this.crates[i];
          if (c.markedForDeletion || c.hp <= 0) {
              const creds = Math.floor(Math.random() * 21) + 5; // 5 to 25
              this.player.creditsEarned += creds;
              this.floatingTexts.push({ x: c.x, y: c.y, text: `+${creds}`, color: '#fbbf24', lifeTime: 60, maxLifeTime: 60, width: 0, height: 0, vx: 0, vy: -1 });

              this.explode(c.x+c.width/2, c.y+c.height/2, false, 0, 20);
              this.spawnItemDrop(c.x, c.y);
              this.crates.splice(i, 1);
          }
      }
  }

  spawnItemDrop(x: number, y: number) {
      const types: ItemDrop['type'][] = ['health', 'grenade', 'machineGun', 'shotgun', 'rocketLauncher', 'flamethrower', 'laserRifle'];
      const type = types[Math.floor(Math.random() * types.length)];
      this.items.push({
          x, y, width: 20, height: 20, vx: Math.random()*4-2, vy: -5, type
      });
  }

  spawnEntities() {
      // Spawn enemies
      if (!this.bossActive) {
          const diffMult = this.levelConfig ? this.levelConfig.enemyMultiplier : 1 + (this.frameCount / 3600);
          const spawnInv = this.levelConfig ? Math.max(30, 120 / diffMult) : Math.max(30, 120 - (this.frameCount/100));

          if (this.frameCount % Math.floor(spawnInv) === 0 && Math.random() > 0.3) {
              const types: Enemy['type'][] = this.levelConfig ? this.levelConfig.enemyTypes : ['grunt', 'grunt', 'rifle', 'shield', 'drone'];
              const type = types[Math.floor(Math.random() * types.length)];
              
              let hp = 30 * diffMult;
              let speed = 2;
              let width = 40, height = 50;
              
              if (type === 'drone') { speed = 3; hp = 20 * diffMult; width = 30; height = 30; }
              if (type === 'shield') { hp = 100 * diffMult; }
              if (type === 'heavy') { hp = 150 * diffMult; speed = 1; width=50; height=60; }
              
              const e: Enemy = {
                  type, x: this.width + 50, y: this.height - 100, width, height,
                  vx: type === 'drone' ? -speed : -speed, vy: 0, hp, maxHp: hp, speed, attackTimer: 60
              };
              if (type === 'drone') e.y -= 150;
              if (type === 'shield') { e.color = '#3b82f6'; }
              if (type === 'heavy') { e.color = '#111827'; }
              this.enemies.push(e);
          }

          const crateDropRate = this.levelConfig ? this.levelConfig.crateDropRate : 0.2;
          if (this.frameCount % 300 === 0 && Math.random() < crateDropRate) {
              this.crates.push({
                  x: this.width + 50, y: this.height - 90, width: 40, height: 40, vx: 0, vy: 0, hp: 20
              });
          }

          this.bossSpawningTimer--;
          if (this.bossSpawningTimer <= 0) {
              this.bossActive = true;
              const bossName = this.levelConfig ? this.levelConfig.boss : 'Iron Beetle Tank';
              const diffMult = this.levelConfig ? this.levelConfig.enemyMultiplier : 1.5;
              this.enemies.push({
                  type: 'boss', x: this.width, y: this.height - 250, width: 200, height: 200,
                  vx: -0.5, vy: 0, hp: 2000 * diffMult, maxHp: 2000 * diffMult, speed: 0.5, attackTimer: 100, phase: 1
              });
          }
      }
  }

  checkCollisions() {
    // Player vs Enemies
    if (this.player.invulnerableTimer <= 0) {
        for (const e of this.enemies) {
            if (this.rectIntersect(this.player, e)) {
                this.damagePlayer(20);
                this.player.vx = (this.player.x > e.x ? 5 : -5);
                this.player.vy = -5;
                break;
            }
        }
    }

    // Bullets vs Entities
    for (let i = this.bullets.length - 1; i >= 0; i--) {
        const b = this.bullets[i];
        let hit = false;
        
        if (b.isPlayer) {
           // check crates
           for(const c of this.crates) {
               if (this.rectIntersect(b, c)) {
                   c.hp -= b.damage;
                   hit = true; break;
               }
           }
           if (!hit) {
               for(const e of this.enemies) {
                   if (this.rectIntersect(b, e)) {
                       // Shield logic
                       if (e.type === 'shield' && b.vx > 0) {
                          e.hp -= b.damage * 0.2; // Front facing shield
                          this.addParticles(b.x, b.y, '#3b82f6', 5);
                       } else {
                          e.hp -= b.damage;
                          this.addParticles(b.x, b.y, '#ef4444', 5);
                       }
                       hit = true;
                       
                       if (b.weaponType === 'laserRifle' || b.weaponType === 'pulseBeam' || b.weaponType === 'heavyRailgun' || b.weaponType === 'teslaCannon') {
                           hit = false; // piercing
                           e.hp -= b.damage * 0.5; // continuous piercing damage adjust
                           
                           // Tesla chain effect (visual only for now, bounces to nearest)
                           if (b.weaponType === 'teslaCannon' && Math.random() < 0.3) {
                              this.addParticles(e.x + e.width/2, e.y + e.height/2, '#8b5cf6', 8);
                           }
                       }
                       
                       audioSystem.playHurt();
                       break;
                   }
               }
           }
        } else {
            if (this.rectIntersect(b, this.player) && this.player.invulnerableTimer <= 0) {
                this.damagePlayer(b.damage);
                hit = true;
                this.addParticles(b.x, b.y, '#ef4444', 5);
            }
        }
        
        if (hit && b.weaponType !== 'laserRifle' && b.weaponType !== 'pulseBeam' && b.weaponType !== 'heavyRailgun' && b.weaponType !== 'teslaCannon') {
            if (b.weaponType === 'grenade' || b.weaponType === 'rocketLauncher' || b.weaponType === 'napalmLauncher' || b.weaponType === 'clusterCannon') {
                this.explode(b.x, b.y, b.isPlayer, b.damage, 60);
            }
            this.bullets.splice(i, 1);
        }
    }
  }

  rectIntersect(r1: Rect, r2: Rect) {
      return !(r2.x > r1.x + r1.width || 
               r2.x + r2.width < r1.x || 
               r2.y > r1.y + r1.height ||
               r2.y + r2.height < r1.y);
  }

  addParticles(x: number, y: number, color: string, count: number) {
      if (this.width < 768) count = Math.max(1, Math.ceil(count * 0.5));
      if (this.particles.length > 200) return; // cap particles for performance

      for(let i=0; i<count; i++) {
          this.particles.push({
              x, y, width: 4, height: 4,
              vx: (Math.random() - 0.5) * 10,
              vy: (Math.random() - 0.5) * 10,
              color,
              lifeTime: 20 + Math.random() * 20,
              maxLifeTime: 40,
              size: Math.random() * 4 + 2
          });
      }
  }

  draw() {
    const { ctx, width, height } = this;
    
    ctx.clearRect(0, 0, width, height);
    
    // Screen shake
    ctx.save();
    if (this.screenShakeTimer > 0) {
        ctx.translate((Math.random()-0.5)*10, (Math.random()-0.5)*10);
    }

    // Floor
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, height - 50, width, 50);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, height - 50);
    ctx.lineTo(width, height - 50);
    ctx.stroke();

    if (this.state !== 'PLAYING' && this.state !== 'PAUSED') {
       ctx.restore();
       return;
    }

    // Items
    this.items.forEach(i => {
        ctx.fillStyle = i.type === 'health' ? '#22c55e' : i.type === 'grenade' ? '#71717a' : WEAPON_DEFS[i.type as WeaponType]?.color || '#fff';
        ctx.fillRect(i.x, i.y, i.width, i.height);
        // icon
        ctx.fillStyle = '#fff';
        ctx.font = '10px Space Grotesk';
        let txt = '?';
        if (i.type === 'health') txt = '+';
        if (i.type === 'grenade') txt = 'o';
        if (i.type !== 'health' && i.type !== 'grenade') txt = 'W';
        ctx.fillText(txt, i.x + 5, i.y + 14);
    });

    // Crates
    this.crates.forEach(c => {
        ctx.fillStyle = '#78350f';
        ctx.fillRect(c.x, c.y, c.width, c.height);
        ctx.strokeStyle = '#d97706';
        ctx.strokeRect(c.x + 2, c.y + 2, c.width - 4, c.height - 4);
        ctx.beginPath();
        ctx.moveTo(c.x, c.y); ctx.lineTo(c.x+c.width, c.y+c.height);
        ctx.moveTo(c.x+c.width, c.y); ctx.lineTo(c.x, c.y+c.height);
        ctx.stroke();
    });

    // Enemies
    this.enemies.forEach(e => {
        ctx.fillStyle = e.color || '#ef4444';
        
        if (e.type === 'boss') {
            ctx.fillStyle = '#475569';
            ctx.fillRect(e.x, e.y, e.width, e.height);
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(e.x + 50, e.y + 80, 20, 0, Math.PI*2);
            ctx.fill();
            // cannon
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(e.x - 40, e.y + 90, 40, 20);
            
            // boss hp bar inside game area maybe, but HUD will handle it.
        } else if (e.type === 'drone') {
            ctx.beginPath();
            ctx.arc(e.x + e.width/2, e.y + e.height/2, e.width/2, 0, Math.PI*2);
            ctx.fill();
            // Eye
            ctx.fillStyle = '#0ff';
            ctx.beginPath();
            ctx.arc(e.x + e.width/2 - 5, e.y + e.height/2, 5, 0, Math.PI*2);
            ctx.fill();
        } else {
            ctx.fillRect(e.x, e.y, e.width, e.height);
            if (e.type === 'shield') {
               ctx.fillStyle = '#60a5fa';
               ctx.fillRect(e.x - 5, e.y, 10, e.height); // Shield in front
            }
            if (e.type === 'rifle') {
               ctx.fillStyle = '#9ca3af';
               ctx.fillRect(e.x - 15, e.y + 15, 20, 5); // gun
            }
        }
        
        // health bar for small enemies
        if (e.type !== 'boss') {
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(e.x, e.y - 10, e.width, 4);
            ctx.fillStyle = '#22c55e';
            ctx.fillRect(e.x, e.y - 10, e.width * (e.hp / e.maxHp), 4);
        }
    });

    // Player
    if (this.player.invulnerableTimer % 10 < 5) {
        ctx.fillStyle = '#22c55e'; // player color
        ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
        
        // Helmet / Head
        ctx.fillStyle = '#166534';
        ctx.fillRect(this.player.x + (this.player.facingRight ? 10 : 0), this.player.y - 10, 20, 15);
        
        // Gun
        ctx.fillStyle = WEAPON_DEFS[this.player.currentWeapon as WeaponType]?.color || '#fff';
        if (this.player.comboActive) ctx.fillStyle = '#a855f7'; // Combo color
        ctx.fillRect(this.player.facingRight ? this.player.x + 20 : this.player.x - 15, this.player.y + (this.player.isCrouching ? 5 : 15), 25, 8);
    }

    // Bullets
    this.bullets.forEach(b => {
        if (b.weaponType === 'grenade') {
            ctx.fillStyle = '#4ade80';
            ctx.beginPath();
            ctx.arc(b.x + b.width/2, b.y + b.height/2, b.width/2, 0, Math.PI*2);
            ctx.fill();
        } else if (b.weaponType === 'flamethrower' || b.weaponType === 'plasmaTorch' || b.weaponType === 'dragonBreath') {
            ctx.fillStyle = `rgba(249, 115, 22, ${b.lifeTime/20})`; // f97316
            ctx.beginPath();
            ctx.arc(b.x + b.width/2, b.y + b.height/2, b.width/2, 0, Math.PI*2);
            ctx.fill();
            ctx.fillStyle = `rgba(253, 224, 71, ${b.lifeTime/20})`;
            ctx.beginPath();
            ctx.arc(b.x + b.width/2, b.y + b.height/2, b.width/4, 0, Math.PI*2);
            ctx.fill();
        } else {
            ctx.fillStyle = b.isPlayer ? '#fbbf24' : '#ef4444';
            if (b.weaponType === 'laserRifle' || b.weaponType === 'pulseBeam') ctx.fillStyle = '#60a5fa';
            ctx.fillRect(b.x, b.y, b.width, b.height);
        }
    });

    // Particles
    this.particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.lifeTime / p.maxLifeTime;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    });

    // Weather
    if (this.weatherParticles.length > 0) {
        ctx.save();
        if (this.levelConfig?.weatherEffect === 'rain') ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        else if (this.levelConfig?.weatherEffect === 'snow') ctx.fillStyle = 'rgba(255,255,255,0.8)';
        else if (this.levelConfig?.weatherEffect === 'dust') ctx.fillStyle = 'rgba(217, 119, 6, 0.4)';
        else if (this.levelConfig?.weatherEffect === 'smoke' || this.levelConfig?.weatherEffect === 'ash') ctx.fillStyle = 'rgba(100, 100, 100, 0.5)';
        else if (this.levelConfig?.weatherEffect === 'gas') ctx.fillStyle = 'rgba(34, 197, 94, 0.3)';

        for (const w of this.weatherParticles) {
            if (this.levelConfig?.weatherEffect === 'rain') {
                ctx.beginPath();
                ctx.moveTo(w.x, w.y);
                ctx.lineTo(w.x - 10, w.y + 20);
                ctx.stroke();
            } else {
                ctx.beginPath();
                ctx.arc(w.x, w.y, w.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.restore();
    }

    // Floating Texts
    this.floatingTexts.forEach(t => {
        ctx.fillStyle = t.color;
        ctx.globalAlpha = t.lifeTime / t.maxLifeTime;
        ctx.font = 'bold 16px Space Grotesk';
        ctx.fillText(t.text, t.x, t.y);
        ctx.globalAlpha = 1.0;
    });

    ctx.restore();
  }
}
