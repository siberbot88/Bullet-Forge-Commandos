/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState, useCallback, ReactNode } from 'react';
import { GameEngine } from './game/GameEngine';
import { Player, WeaponType } from './game/Types';
import { WEAPON_DEFS } from './game/Weapons';
import { LEVELS, LevelConfig } from './game/Levels';
import { audioSystem } from './lib/audio';
import { motion, AnimatePresence } from 'motion/react';
import { MonitorPlay, Trophy, Skull, RefreshCw, Play, Volume2, VolumeX, Shield, Swords, DollarSign, Crosshair, Zap, Anchor, Info, ArrowLeft, Trash2, CheckCircle2, Lock, Star, ChevronRight, Map } from 'lucide-react';

import { RANKS, getRankByXP, getNextRankByXP } from './game/Ranks';
import { StageBackground } from './components/StageBackground';
import { ArmoryScreen } from './components/ArmoryScreen';

interface SaveData {
  version: number;
  credits: number;
  xp: number;
  rankRewardsClaimed: number[];
  ownedWeapons: WeaponType[];
  weaponLevels: Record<string, number>;
  primaryWeapon: WeaponType;
  secondaryWeapon: WeaponType | null;

  ownedMeleeWeapons: string[];
  meleeWeaponLevels: Record<string, number>;
  equippedMeleeWeapon: string;

  ownedArmor: string[];
  equippedArmor: string | null;

  currentLives: number;
  maxLives: number;
  reviveTokens: number;

  highScore: number;
  unlockedLevels: number[];
  completedLevels: number[];
  levelScores: Record<number, number>;
  finalRewardClaimed: boolean;
  newGamePlusUnlocked: boolean;
}

const DEFAULT_SAVE: SaveData = {
  version: 2,
  credits: 0,
  xp: 0,
  rankRewardsClaimed: [],
  ownedWeapons: ['pistol'],
  weaponLevels: { pistol: 1 },
  primaryWeapon: 'pistol',
  secondaryWeapon: null,

  ownedMeleeWeapons: ['combat_knife'],
  meleeWeaponLevels: { combat_knife: 1 },
  equippedMeleeWeapon: 'combat_knife',

  ownedArmor: [],
  equippedArmor: null,

  currentLives: 3,
  maxLives: 3,
  reviveTokens: 0,

  highScore: 0,
  unlockedLevels: [1],
  completedLevels: [],
  levelScores: {},
  finalRewardClaimed: false,
  newGamePlusUnlocked: false
};


export default function App() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  
  const [gameState, setGameState] = useState<string>('START');
  const [playerData, setPlayerData] = useState<Player | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [saveData, setSaveData] = useState<SaveData>(DEFAULT_SAVE);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [currentLevel, setCurrentLevel] = useState<LevelConfig | null>(null);
  const wasFirstClearRef = useRef(false);

  // Load Save
  useEffect(() => {
     const stored = localStorage.getItem('bfc_save');
     if (stored) {
         try {
            setSaveData({ ...DEFAULT_SAVE, ...JSON.parse(stored) });
         } catch(e) {}
     }
  }, []);

  const persistSave = (newSave: SaveData) => {
      setSaveData(newSave);
      localStorage.setItem('bfc_save', JSON.stringify(newSave));
  };

  const resetProgress = () => {
      persistSave(DEFAULT_SAVE);
      setShowConfirmReset(false);
  };

  // State Handler Wrapper
  const handleGameStateChange = (newState: string) => {
      if (newState === 'GAMEOVER' || newState === 'VICTORY') {
         // handle score/credits merging when game ends
         setGameState(s => {
             // to prevent double trigger
             return newState;
         });
      } else {
         setGameState(newState);
      }
  };

  // Safe end game logic, we only want to update once
  useEffect(() => {
     if ((gameState === 'GAMEOVER' || gameState === 'VICTORY') && engineRef.current) {
         const p = engineRef.current.player;
         const addedCredits = p.creditsEarned;
         let addedXP = p.xpEarned;
         
         let newSave = { ...saveData };
         
         if (currentLevel) {
             const isVictory = gameState === 'VICTORY';
             if (isVictory) {
                 addedXP += 300; // Complete mission bonus
                 if (p.lives === newSave.currentLives || p.lives === newSave.maxLives || p.lives >= 3) {
                     addedXP += 250; // No dying bonus (approximate check based on remaining lives vs starting)
                 }

                 if (!newSave.completedLevels.includes(currentLevel.id)) {
                     newSave.completedLevels.push(currentLevel.id);
                     newSave.credits += currentLevel.rewardCredits;
                     wasFirstClearRef.current = true;
                 } else {
                     wasFirstClearRef.current = false;
                 }
                 if (!newSave.unlockedLevels.includes(currentLevel.id + 1) && currentLevel.id < LEVELS.length) {
                     newSave.unlockedLevels.push(currentLevel.id + 1);
                 }
                 
                 // Final stage unlock
                 if (currentLevel.id === LEVELS[LEVELS.length - 1].id) {
                     newSave.finalRewardClaimed = true;
                     newSave.newGamePlusUnlocked = true;
                     
                     if (!newSave.ownedMeleeWeapons) newSave.ownedMeleeWeapons = [];
                     if (!newSave.ownedArmor) newSave.ownedArmor = [];
                     if (!newSave.meleeWeaponLevels) newSave.meleeWeaponLevels = {};
                     
                     if (!newSave.ownedMeleeWeapons.includes('plasma_saber')) {
                         newSave.ownedMeleeWeapons.push('plasma_saber');
                         newSave.meleeWeaponLevels['plasma_saber'] = 5; // Start at max level
                     }
                     if (!newSave.ownedArmor.includes('iron_phoenix_armor')) {
                         newSave.ownedArmor.push('iron_phoenix_armor');
                     }
                 }
             }
             
             const bestScore = newSave.levelScores[currentLevel.id] || 0;
             if (p.score > bestScore) {
                 newSave.levelScores[currentLevel.id] = p.score;
             }
         } else {
             const newScore = Math.max(saveData.highScore, p.score);
             newSave.highScore = newScore;
         }
         
         newSave.credits += addedCredits;
         newSave.xp += addedXP;
         // Note: p doesn't persist xpEarned back, so we reflect the total here.
         p.xpEarned = addedXP; 
         persistSave(newSave);
     }
  }, [gameState]);

  // Resize canvas 
  useEffect(() => {
    const handleResize = () => {
       if (canvasRef.current && wrapperRef.current) {
          const rect = wrapperRef.current.getBoundingClientRect();
          canvasRef.current.width = rect.width;
          canvasRef.current.height = rect.height;
          if (engineRef.current) {
             engineRef.current.width = rect.width;
             engineRef.current.height = rect.height;
          }
       }
    };
    
    // Initial size
    handleResize();

    // Use ResizeObserver for wrapper
    const observer = new ResizeObserver(handleResize);
    if (wrapperRef.current) {
      observer.observe(wrapperRef.current);
    }
    
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (canvasRef.current && !engineRef.current) {
       engineRef.current = new GameEngine(
           canvasRef.current,
           handleGameStateChange,
           (p) => setPlayerData({ ...p, ammo: { ...p.ammo } }) 
       );

       let animationId: number;
       const loop = () => {
           if (engineRef.current) {
               engineRef.current.update();
               engineRef.current.draw();
           }
           animationId = requestAnimationFrame(loop);
       };
       loop();

       return () => {
           cancelAnimationFrame(animationId);
           engineRef.current?.destroy();
           engineRef.current = null;
       };
    }
  }, []);

  const tryLockLandscape = () => {
     try {
         if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(() => {});
         }
         if (window.screen && window.screen.orientation && (window.screen.orientation as any).lock) {
            (window.screen.orientation as any).lock('landscape').catch(() => {});
         }
     } catch (e) {
         // ignore
     }
  };

  const startGame = useCallback((level?: LevelConfig) => {
    audioSystem.init();
    tryLockLandscape();
    if (level) setCurrentLevel(level);
    else setCurrentLevel(null);
    
    if (engineRef.current) {
        engineRef.current.initGame({
            primary: saveData.primaryWeapon,
            secondary: saveData.secondaryWeapon,
            levels: saveData.weaponLevels,
            levelConfig: level, // passing null means endless mode
            equippedArmor: saveData.equippedArmor,
            equippedMeleeWeapon: saveData.equippedMeleeWeapon,
            meleeLevels: saveData.meleeWeaponLevels,
            maxLives: saveData.maxLives,
            currentLives: saveData.currentLives,
        });
        engineRef.current.width = canvasRef.current?.width || 800;
        engineRef.current.height = canvasRef.current?.height || 600;
        setGameState('PLAYING');
    }
  }, [saveData]);

  const togglePause = () => {
     if (engineRef.current) {
         if (gameState === 'PLAYING') engineRef.current.setState('PAUSED');
         else if (gameState === 'PAUSED') engineRef.current.setState('PLAYING');
     }
  };

  const toggleAudio = () => {
      audioSystem.toggle();
      setAudioEnabled(audioSystem.enabled);
  };

  const handleBtnDown = (key: string) => {
      if (engineRef.current) engineRef.current.keys[key] = true;
  };
  const handleBtnUp = (key: string) => {
      if (engineRef.current) engineRef.current.keys[key] = false;
  };

  return (
    <div className="relative w-full h-[100dvh] bg-slate-950 overflow-hidden font-display select-none flex flex-col justify-center portrait:justify-start portrait:pt-8 items-center">
      {/* Portrait warning / Rotate device overlay */}
      {gameState === 'PLAYING' && (
        <div className="hidden sm:hidden portrait:flex fixed inset-0 z-[100] bg-slate-950/95 flex-col items-center justify-center p-6 text-center backdrop-blur-sm">
           <div className="text-yellow-400 mb-4 animate-bounce">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 14c.3 0 .7.1 1 .3l2.8 1.9c.7.5 1.7.3 2.2-.3s.3-1.7-.3-2.2l-2.8-1.9c-.3-.2-.5-.5-.5-.8V6a2 2 0 0 0-4 0v5"></path><path d="M12 5V2.5A1.5 1.5 0 0 0 10.5 1h-7A1.5 1.5 0 0 0 2 2.5v15A1.5 1.5 0 0 0 3.5 19H8"></path><path d="M13 18.5A2.5 2.5 0 0 0 15.5 21h3.75a2.25 2.25 0 0 0 1.97-3.32l-3-5.26a1.5 1.5 0 0 0-2.6 0l-1.62 2.84"></path></svg>
           </div>
           <h2 className="text-2xl font-black text-white mb-2">ROTATE DEVICE</h2>
           <p className="text-slate-400 text-sm max-w-xs mb-8">
              For the best experience, please rotate your phone to landscape to play Bullet Forge Commandos.
           </p>
           <button 
             onClick={() => {
                if (document.documentElement.requestFullscreen) {
                    document.documentElement.requestFullscreen().catch(()=>{});
                }
             }}
             className="px-6 py-3 bg-slate-800 text-white font-bold rounded-lg border-2 border-slate-600 active:bg-slate-700"
           >
             Try Fullscreen
           </button>
        </div>
      )}

      {/* Basic portrait warning for menus */}
      {gameState !== 'PLAYING' && (
         <div className="hidden sm:hidden portrait:flex absolute top-0 z-[60] w-full bg-yellow-500 text-black text-[10px] font-bold justify-center p-1 pointer-events-none">
           For the best experience, rotate your phone to landscape.
         </div>
      )}

      <div 
        ref={wrapperRef} 
        className="relative w-full h-full lg:w-[92vw] lg:h-[92vh] lg:aspect-video lg:max-w-7xl lg:max-h-[85vh] lg:rounded-xl bg-slate-900 lg:shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden touch-none"
      >
        <StageBackground theme={currentLevel?.theme || 'urban'} engine={engineRef.current} />
        <canvas 
          ref={canvasRef} 
          className="absolute inset-0 block shadow-inner bg-transparent w-full h-full"
        />

        <button onClick={toggleAudio} className="absolute top-4 right-4 z-50 p-2 bg-slate-800/80 text-white rounded-full hover:bg-slate-700 transition">
           {audioEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
        </button>

         {/* Close wrapperRef div */}
      </div>

      <AnimatePresence>
        {gameState === 'START' && (
          <Overlay title="BULLET FORGE" subtitle="COMMANDOS">
            <div className="flex flex-col items-center gap-4 mt-8 px-4 w-full">
               
               <RankDisplay xp={saveData.xp} />

               <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setGameState('CAMPAIGN')} className="w-full max-w-[260px] flex items-center justify-center gap-2 px-6 py-4 bg-red-600 text-white text-xl font-bold rounded-lg shadow-[0_0_15px_rgba(220,38,38,0.5)] border-2 border-red-400 hover:bg-red-500 transition-colors">
                 <Map fill="currentColor" /> CAMPAIGN
               </motion.button>

               <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => startGame(undefined)} className="w-full max-w-[260px] flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 text-white text-lg font-bold rounded-lg border-2 border-slate-600 hover:bg-slate-700 transition-colors">
                 <RefreshCw /> ENDLESS MODE
               </motion.button>

               <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setGameState('SHOP')} className="w-full max-w-[260px] flex items-center gap-2 justify-center px-6 py-3 bg-slate-800 text-yellow-400 text-lg font-bold rounded-lg border-2 border-slate-600 hover:bg-slate-700 transition-colors">
                 <Shield /> ARMORY
               </motion.button>
               
               <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setGameState('CONTROLS')} className="w-full max-w-[260px] flex items-center gap-2 justify-center px-6 py-3 bg-slate-800 text-slate-300 text-lg font-bold rounded-lg border-2 border-slate-600 hover:bg-slate-700 transition-colors">
                 <MonitorPlay /> CONTROLS
               </motion.button>

               <button onClick={() => setShowConfirmReset(true)} className="mt-8 text-slate-500 hover:text-red-400 transition text-sm flex items-center gap-1 font-bold">
                 <Trash2 size={16} /> RESET PROGRESS
               </button>
            </div>
          </Overlay>
        )}

        {showConfirmReset && (
            <div className="absolute inset-0 z-[100] bg-black/80 flex items-center justify-center backdrop-blur-sm">
                <div className="bg-slate-800 border-2 border-red-500 p-8 rounded-xl max-w-sm text-center">
                   <h2 className="text-2xl font-bold text-red-500 mb-4 tracking-wider">RESET ALL PROGRESS?</h2>
                   <p className="text-slate-300 mb-8">This will permanently delete all weapons, upgrades, high score, and credits. This cannot be undone.</p>
                   <div className="flex gap-4 justify-center">
                       <button onClick={() => setShowConfirmReset(false)} className="px-6 py-2 bg-slate-600 text-white font-bold rounded hover:bg-slate-500 transition">CANCEL</button>
                       <button onClick={resetProgress} className="px-6 py-2 bg-red-600 text-white font-bold rounded hover:bg-red-500 transition">RESET</button>
                   </div>
                </div>
            </div>
        )}

        {gameState === 'CONTROLS' && (
          <Overlay title="CONTROLS">
             <div className="grid grid-cols-2 gap-x-12 gap-y-4 text-slate-300 text-sm bg-slate-800/80 p-8 rounded-xl border border-slate-700 max-w-lg mt-8">
                  <div className="flex justify-between w-48"><span>Move Left/Right</span> <span className="text-yellow-400 font-mono">A / D</span></div>
                  <div className="flex justify-between w-48"><span>Jump</span> <span className="text-yellow-400 font-mono">W / SP</span></div>
                  <div className="flex justify-between w-48"><span>Crouch</span> <span className="text-yellow-400 font-mono">S</span></div>
                  <div className="flex justify-between w-48"><span>Shoot</span> <span className="text-red-400 font-mono">J</span></div>
                  <div className="flex justify-between w-48"><span>Throw Grenade</span> <span className="text-green-400 font-mono">K</span></div>
                  <div className="flex justify-between w-48"><span>Swap Weapon</span> <span className="text-blue-400 font-mono">L</span></div>
                  <div className="flex justify-between w-48"><span>Pause</span> <span className="text-slate-400 font-mono">P / ESC</span></div>
                  
                  <div className="col-span-2 text-center text-slate-400 mt-4 border-t border-slate-700 pt-4">
                      Collect items in-game to temporarily fuse weapons! Note that you can only swap weapons if you have a secondary equipped.
                  </div>
             </div>
             <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setGameState('START')} className="mt-8 flex items-center gap-2 px-8 py-3 bg-slate-800 text-white font-bold rounded-lg border-2 border-slate-600 hover:bg-slate-700 transition">
                 <ArrowLeft /> BACK
             </motion.button>
          </Overlay>
        )}

        {gameState === 'CAMPAIGN' && (
            <CampaignScreen 
                saveData={saveData} 
                onStart={(l) => startGame(l)} 
                onClose={() => setGameState('START')} 
            />
        )}

        {gameState === 'SHOP' && (
            <ArmoryScreen 
                saveData={saveData} 
                onSave={persistSave} 
                onClose={() => setGameState('START')} 
            />
        )}

        {(gameState === 'GAMEOVER' || gameState === 'VICTORY') && (
          <Overlay 
              title={gameState === 'VICTORY' ? 'MISSION ACCOMPLISHED' : 'MISSION FAILED'} 
              subtitle={gameState === 'VICTORY' ? (currentLevel ? `Level ${currentLevel.id} Cleared` : 'Boss Destroyed') : 'The frontline fell...'}
              titleColor={gameState === 'VICTORY' ? 'text-green-500' : 'text-red-600'}
          >
            <div className="flex flex-col items-center gap-6 mt-8 max-w-md w-full bg-slate-800/80 p-8 rounded-xl border border-slate-700 shadow-2xl">
               
               <div className="flex justify-between w-full border-b border-slate-700 pb-2">
                  <span className="text-slate-400">Score Earned:</span>
                  <span className="text-white font-mono font-bold">{playerData?.score || 0}</span>
               </div>
               
               {currentLevel && (
                   <div className="flex justify-between w-full border-b border-slate-700 pb-2">
                      <span className="text-slate-400">Level:</span>
                      <span className="text-white font-mono font-bold">{currentLevel.name}</span>
                   </div>
               )}

               <div className="flex justify-between w-full border-b border-slate-700 pb-2">
                  <span className="text-slate-400">Boss Defeated:</span>
                  <span className={`font-mono font-bold ${engineRef.current?.bossActive && engineRef.current?.enemies.find(e => e.type==='boss')?.hp! <= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {gameState === 'VICTORY' ? 'YES' : 'NO'}
                  </span>
               </div>
               <div className="flex justify-between w-full border-b border-slate-700 pb-2">
                  <span className="text-slate-400">Combat Credits:</span>
                  <span className="text-yellow-400 font-mono font-bold flex items-center gap-1">+<DollarSign size={16}/>{playerData?.creditsEarned || 0}</span>
               </div>
               
               <div className="flex justify-between w-full border-b border-slate-700 pb-2">
                  <span className="text-slate-400">XP Earned:</span>
                  <span className="text-blue-400 font-mono font-bold flex items-center gap-1">+{playerData?.xpEarned || 0} XP</span>
               </div>

               <div className="w-full mt-4">
                  <RankDisplay xp={saveData.xp} />
               </div>
               
               {gameState === 'VICTORY' && currentLevel && wasFirstClearRef.current && (
                   <div className="flex justify-between w-full border-b border-slate-700 pb-2">
                      <span className="text-slate-400">Mission Reward:</span>
                      <span className="text-yellow-400 font-mono font-bold flex items-center gap-1">+<DollarSign size={16}/>{currentLevel.rewardCredits} (First Clear)</span>
                   </div>
               )}

               <div className="flex justify-between w-full pb-2">
                  <span className="text-slate-400">Total Credits:</span>
                  <span className="text-yellow-400 font-mono font-bold flex items-center gap-1"><DollarSign size={16}/>{saveData.credits}</span>
               </div>

               <div className="flex flex-col gap-3 w-full mt-4">
                   {currentLevel ? (
                       <>
                         <motion.button onClick={() => startGame(currentLevel)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex items-center justify-center gap-2 w-full py-3 bg-red-600 text-white font-bold rounded hover:bg-red-500 transition border border-red-400">
                           <RefreshCw size={20} /> {gameState === 'VICTORY' ? 'REPLAY LEVEL' : 'RETRY LEVEL'}
                         </motion.button>
                         {gameState === 'VICTORY' && currentLevel.id < LEVELS.length && (
                             <motion.button onClick={() => startGame(LEVELS[currentLevel.id])} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex items-center justify-center gap-2 w-full py-3 bg-green-600 text-white font-bold rounded hover:bg-green-500 transition border border-green-500">
                               <Play size={20} fill="currentColor" /> NEXT LEVEL
                             </motion.button>
                         )}
                         <motion.button onClick={() => setGameState('CAMPAIGN')} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex items-center justify-center gap-2 w-full py-3 bg-slate-700 text-white font-bold rounded hover:bg-slate-600 transition border border-slate-500">
                           <Map size={20} /> CAMPAIGN MAP
                         </motion.button>
                       </>
                   ) : (
                       <motion.button onClick={() => startGame(undefined)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex items-center justify-center gap-2 w-full py-3 bg-red-600 text-white font-bold rounded hover:bg-red-500 transition border border-red-400">
                         <RefreshCw size={20} /> PLAY AGAIN
                       </motion.button>
                   )}
                   <motion.button onClick={() => setGameState('SHOP')} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex items-center justify-center gap-2 w-full py-3 bg-slate-700 text-yellow-400 font-bold rounded hover:bg-slate-600 transition border border-slate-500">
                     <Shield size={20} /> GO TO ARMORY
                   </motion.button>
                   <motion.button onClick={() => setGameState('START')} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex items-center justify-center gap-2 w-full py-3 bg-slate-900 text-white font-bold rounded hover:bg-slate-800 transition border border-slate-700">
                     <ArrowLeft size={20} /> MAIN MENU
                   </motion.button>
               </div>
            </div>
          </Overlay>
        )}

        {gameState === 'PAUSED' && (
          <Overlay title="PAUSED">
             <motion.button 
                 whileHover={{ scale: 1.05 }}
                 whileTap={{ scale: 0.95 }}
                 onClick={togglePause}
                 className="mt-12 flex items-center gap-2 px-8 py-4 bg-blue-600 text-white text-xl font-bold rounded-lg border-2 border-blue-400 hover:bg-blue-500 transition"
               >
                 <Play fill="currentColor" /> RESUME
             </motion.button>
          </Overlay>
        )}
      </AnimatePresence>

      {/* Touch Controls for Mobile */}
      {gameState === 'PLAYING' && (
         <TouchControls 
             onBtnDown={handleBtnDown} 
             onBtnUp={handleBtnUp} 
             onToggleFullscreen={() => {
                 if (!document.fullscreenElement) {
                     document.documentElement.requestFullscreen().catch(() => {});
                 } else {
                     document.exitFullscreen().catch(() => {});
                 }
             }}
         />
      )}

      {/* HUD inside root but overlaid on wrapper or screen depending on layout */}
      {gameState === 'PLAYING' && playerData && (
         <div className="absolute top-0 w-full lg:max-w-7xl portrait:h-[55dvh] portrait:max-h-[60dvh] sm:portrait:max-h-full sm:portrait:h-[90vh] pointer-events-none z-10 mx-auto">
             <GameHUD 
                playerData={playerData} 
                saveData={saveData} 
                togglePause={togglePause} 
                boss={engineRef.current?.bossActive ? engineRef.current?.enemies.find(e=>e.type==='boss') : undefined} 
                currentLevel={currentLevel}
             />
         </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// Component: GameHUD
// -------------------------------------------------------------
function GameHUD({ playerData, saveData, togglePause, boss, currentLevel }: any) {
    return (
        <>
            <div className="absolute top-0 left-0 w-full p-2 sm:p-4 pt-safe pl-safe pr-safe flex flex-col sm:flex-row justify-between items-start pointer-events-none z-10 gap-2">
                <div className="flex flex-wrap gap-2">
                    <div className="flex items-center gap-1 sm:gap-2 bg-slate-900/80 p-1 sm:p-2 rounded-lg border border-slate-700 backdrop-blur-sm">
                        <Shield className="text-green-400" size={16} />
                        <div className="w-24 sm:w-48 h-3 sm:h-4 bg-slate-800 rounded-full overflow-hidden border border-slate-600 shadow-inner inline-block">
                            <div
                                className="h-full bg-gradient-to-r from-red-600 to-green-500 transition-all duration-300"
                                style={{ width: `${(Math.max(0, playerData.hp) / playerData.maxHp) * 100}%` }}
                            />
                        </div>
                        <span className="text-white font-mono font-bold w-6 sm:w-12 text-right text-xs sm:text-base">{Math.max(0, Math.floor(playerData.hp))}</span>
                    </div>

                    <div className="flex gap-1 sm:gap-2 text-[10px] sm:text-sm">
                        <div className="bg-slate-900/80 px-2 py-1 rounded border border-slate-700 text-red-500 font-bold flex items-center gap-1">
                            ♥ {playerData.lives}
                        </div>
                        <div className="bg-slate-900/80 px-2 py-1 rounded border border-slate-700 text-green-400 font-bold flex items-center gap-1">
                            ◎ {playerData.grenades}
                        </div>
                        <div className="bg-slate-900/80 px-2 py-1 rounded border border-slate-700 text-yellow-400 font-bold flex items-center gap-1 outline outline-yellow-400/20">
                            <DollarSign size={14} /> {saveData.credits + playerData.creditsEarned}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 items-end sm:items-start ml-auto">
                    <div className="flex flex-col items-end gap-1">
                        <div className="bg-slate-900/80 px-2 sm:px-4 py-1 sm:py-2 rounded-lg border border-slate-700 text-yellow-400 font-mono font-bold text-sm sm:text-2xl drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]">
                           {playerData.score.toString().padStart(6, '0')}
                        </div>
                        <div className="bg-slate-900/80 px-2 py-0.5 rounded border border-slate-700 flex items-center gap-1 text-[10px] sm:text-xs font-bold text-white uppercase mt-1">
                           <Star size={12} className="text-yellow-400 fill-yellow-400" />
                           {getRankByXP(saveData.xp + playerData.xpEarned).name}
                        </div>
                    </div>
                    
                    <div className="flex items-start gap-1 sm:gap-2 max-w-sm">
                      {/* Secondary Wpn */}
                      {playerData.secondaryWeapon && (
                         <div className="flex flex-col items-center bg-slate-900/80 p-2 rounded border border-slate-700 opacity-60">
                             <span className="text-[10px] text-slate-400 uppercase">Stow</span>
                             <div 
                               className="w-4 h-4 rounded-sm mt-1" 
                               style={{backgroundColor: WEAPON_DEFS[playerData.secondaryWeapon as WeaponType]?.color}}
                             />
                         </div>
                      )}
                      
                      {/* Current Wpn */}
                      <div className="flex flex-col items-end bg-slate-900/80 p-1.5 sm:p-2 rounded border border-slate-700">
                          <span className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider leading-none">
                             {playerData.comboActive ? playerData.comboActive.replace(/([A-Z])/g, ' $1').trim() : (WEAPON_DEFS[playerData.currentWeapon as WeaponType]?.name?.slice(0, 10) || playerData.currentWeapon)}
                          </span>
                          <div className="flex items-center gap-1 sm:gap-2 mt-1">
                             <div 
                               className={`w-3 h-3 sm:w-6 sm:h-6 rounded-sm ${playerData.comboActive ? 'animate-pulse' : ''}`} 
                               style={{backgroundColor: playerData.comboActive ? '#a855f7' : WEAPON_DEFS[playerData.currentWeapon as WeaponType]?.color}}
                             />
                             <div className="font-mono text-xs sm:text-lg text-white w-6 sm:w-12 text-right leading-none">
                                {playerData.currentWeapon === 'pistol' && !playerData.comboActive ? '∞' : 
                                 playerData.comboActive ? Math.ceil(playerData.comboTimer/60) + 's' : 
                                 playerData.ammo[playerData.currentWeapon]}
                             </div>
                          </div>
                          {playerData.comboActive && (
                              <div className="w-full h-1 bg-slate-800 mt-1 sm:mt-2 rounded overflow-hidden">
                                 <div className="h-full bg-purple-500" style={{width: `${(playerData.comboTimer / 600)*100}%`}} />
                              </div>
                          )}
                      </div>
                  </div>
              </div>
           </div>

           <button 
             onClick={togglePause}
             className="hidden md:block absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-slate-800/50 text-slate-300 font-mono text-sm rounded border border-slate-600 hover:bg-slate-700 pointer-events-auto z-10"
           >
              ESC / P TO PAUSE
           </button>

           {boss && (
              <div className="absolute top-16 sm:top-20 left-1/2 -translate-x-1/2 w-[90%] sm:w-1/2 max-w-2xl text-center pointer-events-none z-10 text-[10px] sm:text-base mt-4 sm:mt-0">
                 <div className="text-red-500 font-bold mb-1 drop-shadow-[0_0_5px_rgba(239,68,68,0.8)] tracking-widest sm:text-lg uppercase">
                     {currentLevel ? currentLevel.boss : 'IRON BEETLE TANK'}
                 </div>
                 <div className="w-full h-3 sm:h-6 bg-slate-950 rounded-sm border sm:border-2 border-slate-700 p-0.5 sm:p-[2px]">
                    <div 
                        className="h-full bg-red-600 transition-all"
                        style={{ width: `${(boss.hp / boss.maxHp) * 100}%` }}
                    />
                 </div>
              </div>
           )}
        </>
    );
}

// -------------------------------------------------------------------
// Component: CampaignScreen
// -------------------------------------------------------------
function CampaignScreen({ saveData, onStart, onClose }: { saveData: SaveData, onStart: (level: LevelConfig) => void, onClose: () => void }) {
    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900 border-x-4 border-slate-800 z-50 flex flex-col overflow-hidden font-display"
        >
            <div className="flex items-center justify-between p-6 bg-slate-950 border-b-2 border-slate-700">
               <div className="flex items-center gap-4">
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onClose} className="p-2 bg-slate-800 text-slate-300 rounded border border-slate-600 hover:bg-slate-700">
                     <ArrowLeft />
                  </motion.button>
                  <h1 className="text-3xl font-bold font-mono text-white tracking-widest flex items-center gap-2"><Map className="text-red-500"/> CAMPAIGN MAP</h1>
               </div>
               <div className="flex items-center gap-2 bg-slate-800 px-6 py-2 rounded-lg border border-slate-600 shadow-inner">
                   <span className="text-slate-400 font-bold uppercase tracking-wider text-sm">Credits</span>
                   <span className="text-yellow-400 font-mono text-2xl font-bold flex items-center gap-1"><DollarSign size={20}/> {saveData.credits}</span>
               </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
                    {LEVELS.map((level, i) => {
                        const isUnlocked = saveData.unlockedLevels.includes(level.id);
                        const isCompleted = saveData.completedLevels.includes(level.id);
                        const bestScore = saveData.levelScores[level.id] || 0;
                        const isNext = isUnlocked && !isCompleted;
                        
                        return (
                            <motion.div 
                                key={level.id}
                                whileHover={isUnlocked ? { scale: 1.02, y: -5 } : {}}
                                className={`relative flex flex-col rounded-xl border-2 overflow-hidden bg-slate-800/80 
                                    ${isCompleted ? 'border-green-500/50' : 
                                      isNext ? 'border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.2)]' : 
                                      isUnlocked ? 'border-slate-500' : 'border-slate-700 opacity-60'}`}
                            >
                                {/* Background Header Theme */}
                                <div className="h-32 p-4 flex flex-col justify-between" style={{ backgroundColor: level.backgroundClass }}>
                                    <div className="flex justify-between items-start">
                                        <div className="flex gap-1 justify-center rounded bg-black/40 px-2 py-1">
                                            {[...Array(level.difficulty)].map((_, idx) => (
                                                <Star key={idx} size={14} className="text-yellow-400 fill-yellow-400" />
                                            ))}
                                            {[...Array(6 - level.difficulty)].map((_, idx) => (
                                                <Star key={idx} size={14} className="text-slate-500" />
                                            ))}
                                        </div>
                                        {isCompleted && (
                                            <div className="bg-green-500 text-white text-xs font-bold px-2 py-1 flex items-center gap-1 rounded">
                                                <CheckCircle2 size={14} /> CLEARED
                                            </div>
                                        )}
                                        {isNext && (
                                            <div className="bg-yellow-400 text-black text-xs font-bold px-2 py-1 flex items-center gap-1 rounded border border-yellow-500 animate-pulse">
                                                NEXT MISSION
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <div className="text-white/80 font-mono text-sm tracking-widest">MISSION 0{level.id}</div>
                                        <div className="text-white font-bold text-2xl uppercase truncate drop-shadow-md">{level.name}</div>
                                    </div>
                                </div>
                                
                                <div className="p-5 flex-1 flex flex-col">
                                    <p className="text-slate-300 text-sm italic mb-4 flex-1">"{level.objective}"</p>
                                    
                                    <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/50 mb-4 space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-slate-400 font-bold uppercase text-xs">Target</span>
                                            <span className="text-red-400 uppercase font-bold">{level.boss}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400 font-bold uppercase text-xs">Reward</span>
                                            <span className="text-yellow-400 font-mono">+{level.rewardCredits} CR</span>
                                        </div>
                                        {isCompleted && (
                                            <div className="flex justify-between border-t border-slate-700/50 pt-2 mt-2">
                                                <span className="text-slate-400 font-bold uppercase text-xs">High Score</span>
                                                <span className="text-white font-mono">{bestScore}</span>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {isUnlocked ? (
                                        <motion.button 
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => onStart(level)}
                                            className={`w-full py-3 font-bold rounded flex items-center justify-center gap-2 border-2 transition-colors
                                                ${isCompleted ? 'bg-slate-700 border-slate-500 text-white hover:bg-slate-600' : 
                                                  'bg-red-600 border-red-500 text-white shadow-[0_0_15px_rgba(220,38,38,0.3)] hover:bg-red-500'}`}
                                        >
                                            <Play size={18} fill="currentColor" /> START MISSION
                                        </motion.button>
                                    ) : (
                                        <div className="w-full py-3 bg-slate-900 border-2 border-slate-700 text-slate-500 font-bold rounded flex items-center justify-center gap-2">
                                            <Lock size={18} /> LOCKED
                                        </div>
                                    )}
                                </div>
                                
                                {!isUnlocked && (
                                    <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] z-10 flex items-center justify-center">
                                        <div className="text-red-500 font-bold tracking-widest text-xl rotate-[-15deg] border-4 border-red-500 px-4 py-1 rounded bg-black/50">CLASSIFIED</div>
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </motion.div>
    );
}

// -------------------------------------------------------------
// Component: RankDisplay
// -------------------------------------------------------------

function RankDisplay({ xp }: { xp: number }) {
    const currentRank = getRankByXP(xp);
    const nextRank = getNextRankByXP(xp);
    const progress = nextRank ? ((xp - currentRank.xpRequired) / (nextRank.xpRequired - currentRank.xpRequired)) * 100 : 100;
    
    return (
        <div className="bg-slate-900/80 border border-slate-700 p-3 rounded-lg flex flex-col items-center gap-2 mb-4 w-full max-w-[260px]">
           <div className="flex justify-between w-full items-center">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Rank</span>
              <span className={`font-black text-lg drop-shadow-[0_0_5px_currentColor]`} style={{ color: currentRank.color === 'gray' ? '#9ca3af' : currentRank.color === 'green' ? '#4ade80' : currentRank.color === 'blue' ? '#60a5fa' : currentRank.color === 'cyan' ? '#22d3ee' : currentRank.color === 'teal' ? '#2dd4bf' : currentRank.color === 'indigo' ? '#818cf8' : currentRank.color === 'purple' ? '#c084fc' : currentRank.color === 'fuchsia' ? '#e879f9' : currentRank.color === 'pink' ? '#f472b6' : currentRank.color === 'rose' ? '#fb7185' : currentRank.color === 'red' ? '#f87171' : currentRank.color === 'orange' ? '#fb923c' : currentRank.color === 'yellow' ? '#facc15' : currentRank.color === 'amber' ? '#fbbf24' : '#ffffff' }}>{currentRank.name} {currentRank.badge}</span>
           </div>
           {nextRank ? (
               <div className="w-full">
                   <div className="flex justify-between text-[10px] text-slate-500 font-mono mb-1">
                      <span>{xp} XP</span>
                      <span>{nextRank.xpRequired} XP</span>
                   </div>
                   <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                      <div className="h-full bg-yellow-400" style={{ width: `${progress}%` }} />
                   </div>
               </div>
           ) : (
               <div className="text-yellow-400 text-xs font-bold uppercase tracking-widest mt-1">MAX RANK REACHED</div>
           )}
        </div>
    );
}

function Overlay({ children, title, subtitle, titleColor = "text-white" }: { children: ReactNode, title: string, subtitle?: string, titleColor?: string }) {
   return (
      <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center z-50 text-center"
      >
          <motion.h1 
             initial={{ y: -50, opacity: 0 }}
             animate={{ y: 0, opacity: 1 }}
             className={`text-5xl sm:text-7xl font-bold font-mono tracking-tighter drop-shadow-[0_0_20px_rgba(255,255,255,0.2)] ${titleColor} px-2`}
          >
             {title}
          </motion.h1>
          {subtitle && <h2 className="text-xl sm:text-2xl text-slate-400 mt-2 font-light tracking-widest uppercase">{subtitle}</h2>}
          {children}
      </motion.div>
   )
}

function TouchControls({ onBtnDown, onBtnUp, onToggleFullscreen }: { onBtnDown: (key: string) => void, onBtnUp: (key: string) => void, onToggleFullscreen: () => void }) {
  const press = (key: string) => onBtnDown(key);
  const release = (key: string) => onBtnUp(key);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex items-end justify-between p-4 sm:p-6 lg:p-8 sm:hidden portrait:hidden pointer-events-none touch-none pb-safe pl-safe pr-safe">
      {/* Left Thumb Zone */}
      <div className="pointer-events-auto flex gap-2">
        <div className="grid grid-cols-2 gap-2">
           <button
             className="w-14 h-14 rounded-2xl bg-slate-800/80 border-b-4 border-slate-900 border-x-2 border-t-2 border-slate-600 text-slate-300 font-black text-2xl active:translate-y-1 active:border-b-0 touch-manipulation flex items-center justify-center shadow-lg"
             onTouchStart={(e) => { e.preventDefault(); press('a'); }}
             onTouchEnd={(e) => { e.preventDefault(); release('a'); }}
             onMouseDown={() => press('a')}
             onMouseUp={() => release('a')}
             onMouseLeave={() => release('a')}
           >
             ◀
           </button>
           <button
             className="w-14 h-14 rounded-2xl bg-slate-800/80 border-b-4 border-slate-900 border-x-2 border-t-2 border-slate-600 text-slate-300 font-black text-2xl active:translate-y-1 active:border-b-0 touch-manipulation flex items-center justify-center shadow-lg"
             onTouchStart={(e) => { e.preventDefault(); press('d'); }}
             onTouchEnd={(e) => { e.preventDefault(); release('d'); }}
             onMouseDown={() => press('d')}
             onMouseUp={() => release('d')}
             onMouseLeave={() => release('d')}
           >
             ▶
           </button>
        </div>
        <button
           className="w-14 h-14 ml-2 rounded-full bg-cyan-700/80 border-b-4 border-cyan-900 border-x-2 border-t-2 border-cyan-500 text-cyan-200 font-bold active:translate-y-1 active:border-b-2 touch-manipulation flex items-center justify-center shadow-lg"
           onTouchStart={(e) => { e.preventDefault(); press('w'); }}
           onTouchEnd={(e) => { e.preventDefault(); release('w'); }}
           onMouseDown={() => press('w')}
           onMouseUp={() => release('w')}
           onMouseLeave={() => release('w')}
        >
           JUMP
        </button>
      </div>

      {/* Right Thumb Zone */}
      <div className="pointer-events-auto flex items-end gap-2 relative">
        <div className="flex flex-col gap-2 pb-14 mr-2">
            <button
               className="w-12 h-12 rounded-full bg-purple-700/80 border-b-4 border-purple-900 border-x-2 border-t-2 border-purple-500 text-purple-200 font-bold text-xs active:translate-y-1 active:border-b-2 touch-manipulation flex items-center justify-center shadow-lg"
               onTouchStart={(e) => { e.preventDefault(); press('l'); }}
               onTouchEnd={(e) => { e.preventDefault(); release('l'); }}
               onMouseDown={() => press('l')}
               onMouseUp={() => release('l')}
               onMouseLeave={() => release('l')}
            >
               SWAP
            </button>
            <button
               className="w-12 h-12 rounded-full bg-amber-600/80 border-b-4 border-amber-800 border-x-2 border-t-2 border-amber-400 text-amber-100 font-bold text-xs active:translate-y-1 active:border-b-2 touch-manipulation flex items-center justify-center shadow-lg"
               onTouchStart={(e) => { e.preventDefault(); press('k'); }}
               onTouchEnd={(e) => { e.preventDefault(); release('k'); }}
               onMouseDown={() => press('k')}
               onMouseUp={() => release('k')}
               onMouseLeave={() => release('k')}
            >
               BOMB
            </button>
            <button
               className="w-12 h-12 rounded-full bg-emerald-600/80 border-b-4 border-emerald-800 border-x-2 border-t-2 border-emerald-400 text-emerald-100 font-bold text-xs active:translate-y-1 active:border-b-2 touch-manipulation flex items-center justify-center shadow-lg"
               onTouchStart={(e) => { e.preventDefault(); press('i'); }}
               onTouchEnd={(e) => { e.preventDefault(); release('i'); }}
               onMouseDown={() => press('i')}
               onMouseUp={() => release('i')}
               onMouseLeave={() => release('i')}
            >
               MELEE
            </button>
        </div>
        
        <button
          className="w-20 h-20 rounded-full bg-red-600/90 border-b-4 border-red-900 border-x-2 border-t-2 border-red-400 text-red-100 font-bold text-lg active:translate-y-1 active:border-b-0 touch-manipulation flex items-center justify-center shadow-lg"
          onTouchStart={(e) => { e.preventDefault(); press('j'); }}
          onTouchEnd={(e) => { e.preventDefault(); release('j'); }}
          onMouseDown={() => press('j')}
          onMouseUp={() => release('j')}
          onMouseLeave={() => release('j')}
        >
          FIRE
        </button>

        {/* Top-right floating utility buttons */}
        <div className="absolute -top-32 right-0 flex flex-col gap-2">
            <button
               className="w-10 h-10 rounded-lg bg-slate-800/80 border border-slate-500 text-slate-300 font-bold text-xl active:scale-95 touch-manipulation flex items-center justify-center shadow-lg"
               onClick={() => { press('p'); setTimeout(() => release('p'), 100); }}
            >
               II
            </button>
            <button
               className="w-10 h-10 rounded-lg bg-slate-800/80 border border-slate-500 text-slate-300 font-bold text-xl active:scale-95 touch-manipulation flex items-center justify-center shadow-lg"
               onClick={onToggleFullscreen}
            >
               ⛶
            </button>
        </div>
      </div>
    </div>
  );
}

