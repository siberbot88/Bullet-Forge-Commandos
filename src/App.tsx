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

interface SaveData {
  credits: number;
  ownedWeapons: WeaponType[];
  weaponLevels: Record<string, number>;
  primaryWeapon: WeaponType;
  secondaryWeapon: WeaponType | null;
  highScore: number;
  unlockedLevels: number[];
  completedLevels: number[];
  levelScores: Record<number, number>;
}

const DEFAULT_SAVE: SaveData = {
  credits: 0,
  ownedWeapons: ['pistol'],
  weaponLevels: { pistol: 1 },
  primaryWeapon: 'pistol',
  secondaryWeapon: null,
  highScore: 0,
  unlockedLevels: [1],
  completedLevels: [],
  levelScores: {}
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
         
         let newSave = { ...saveData };
         
         if (currentLevel) {
             const isVictory = gameState === 'VICTORY';
             if (isVictory) {
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

  const startGame = useCallback((level?: LevelConfig) => {
    audioSystem.init();
    if (level) setCurrentLevel(level);
    else setCurrentLevel(null);
    
    if (engineRef.current) {
        engineRef.current.initGame({
            primary: saveData.primaryWeapon,
            secondary: saveData.secondaryWeapon,
            levels: saveData.weaponLevels,
            levelConfig: level // passing null means endless mode
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
      <div className="hidden sm:hidden portrait:flex absolute top-0 z-[60] w-full bg-yellow-500 text-black text-xs font-bold justify-center p-1 pointer-events-none">
        For the best experience, rotate your phone to landscape.
      </div>

      <div 
        ref={wrapperRef} 
        className="relative w-full h-full sm:w-[90vw] sm:h-[90vh] sm:aspect-video lg:max-w-7xl lg:max-h-[80vh] portrait:h-[55dvh] portrait:max-h-[60dvh] sm:portrait:max-h-full sm:portrait:h-[90vh] bg-slate-900 shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden touch-none"
      >
        <canvas 
          ref={canvasRef} 
          className="absolute inset-0 block shadow-inner bg-slate-900 w-full h-full"
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
           <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start pointer-events-none z-10">
              <div className="flex flex-col gap-2">
                 <div className="flex items-center gap-2 bg-slate-900/80 p-2 rounded-lg border border-slate-700 backdrop-blur-sm">
                    <Shield className="text-green-400" />
                    <div className="w-48 h-4 bg-slate-800 rounded-full overflow-hidden border border-slate-600 shadow-inner inline-block">
                        <div 
                          className="h-full bg-gradient-to-r from-red-600 to-green-500 transition-all duration-300"
                          style={{ width: `${(Math.max(0, playerData.hp) / playerData.maxHp) * 100}%` }}
                        />
                    </div>
                    <span className="text-white font-mono font-bold w-12 text-right">{Math.max(0, Math.floor(playerData.hp))}</span>
                 </div>
                 
                 <div className="flex gap-2">
                     <div className="bg-slate-900/80 px-3 py-1 rounded border border-slate-700 text-red-500 font-bold flex items-center gap-1">
                        ♥ {playerData.lives} LIVES
                     </div>
                     <div className="bg-slate-900/80 px-3 py-1 rounded border border-slate-700 text-green-400 font-bold flex items-center gap-1">
                        ◎ {playerData.grenades}
                     </div>
                     <div className="bg-slate-900/80 px-3 py-1 rounded border border-slate-700 text-yellow-400 font-bold flex items-center gap-1">
                        <DollarSign size={16}/> {saveData.credits + playerData.creditsEarned}
                     </div>
                 </div>
              </div>

              <div className="flex flex-col gap-2 items-end">
                  <div className="bg-slate-900/80 px-4 py-2 rounded-lg border border-slate-700 text-yellow-400 font-mono font-bold text-2xl drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]">
                     {playerData.score.toString().padStart(6, '0')}
                  </div>
                  
                  <div className="flex items-start gap-2 max-w-sm">
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
                      <div className="flex flex-col items-end bg-slate-900/80 p-2 rounded border border-slate-700">
                          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                             {playerData.comboActive ? playerData.comboActive.replace(/([A-Z])/g, ' $1').trim() : WEAPON_DEFS[playerData.currentWeapon as WeaponType]?.name}
                          </span>
                          <div className="flex items-center gap-2 mt-1">
                             <div 
                               className={`w-6 h-6 rounded-sm ${playerData.comboActive ? 'animate-pulse' : ''}`} 
                               style={{backgroundColor: playerData.comboActive ? '#a855f7' : WEAPON_DEFS[playerData.currentWeapon as WeaponType]?.color}}
                             />
                             <div className="font-mono text-lg text-white w-12 text-right">
                                {playerData.currentWeapon === 'pistol' && !playerData.comboActive ? '∞' : 
                                 playerData.comboActive ? Math.ceil(playerData.comboTimer/60) + 's' : 
                                 playerData.ammo[playerData.currentWeapon]}
                             </div>
                          </div>
                          {playerData.comboActive && (
                              <div className="w-full h-1 bg-slate-800 mt-2 rounded overflow-hidden">
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
              <div className="absolute top-16 sm:top-20 left-1/2 -translate-x-1/2 w-[90%] sm:w-1/2 max-w-2xl text-center pointer-events-none z-10 text-xs sm:text-base">
                 <div className="text-red-500 font-bold mb-1 drop-shadow-[0_0_5px_rgba(239,68,68,0.8)] tracking-widest sm:text-lg uppercase">
                     {currentLevel ? currentLevel.boss : 'IRON BEETLE TANK'}
                 </div>
                 <div className="w-full h-6 bg-slate-950 rounded-sm border-2 border-slate-700 p-[2px]">
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
// Component: ArmoryScreen
// -------------------------------------------------------------
function ArmoryScreen({ saveData, onSave, onClose }: { saveData: SaveData, onSave: (d: SaveData) => void, onClose: () => void }) {
    
    // Convert to array of entries for UI mapping
    const weaponList = Object.entries(WEAPON_DEFS).map(([id, wDef]) => {
        const isOwned = saveData.ownedWeapons.includes(id as WeaponType);
        const level = saveData.weaponLevels[id] || 1;
        const isEquippedPrimary = saveData.primaryWeapon === id;
        const isEquippedSecondary = saveData.secondaryWeapon === id;
        return { id: id as WeaponType, ...wDef, isOwned, level, isEquippedPrimary, isEquippedSecondary };
    });

    const getUpgradePrice = (level: number) => {
        if (level === 1) return 250;
        if (level === 2) return 500;
        if (level === 3) return 800;
        if (level === 4) return 1200;
        return null; // max level
    };

    const handleBuy = (w: any) => {
        if (saveData.credits >= w.price) {
           onSave({
               ...saveData,
               credits: saveData.credits - w.price,
               ownedWeapons: [...saveData.ownedWeapons, w.id],
               weaponLevels: { ...saveData.weaponLevels, [w.id]: 1 }
           });
           audioSystem.init();
           audioSystem.playPickup();
        }
    };

    const handleUpgrade = (w: any) => {
        const cost = getUpgradePrice(w.level);
        if (cost && saveData.credits >= cost) {
             onSave({
                 ...saveData,
                 credits: saveData.credits - cost,
                 weaponLevels: { ...saveData.weaponLevels, [w.id]: w.level + 1 }
             });
             audioSystem.init();
             audioSystem.playPickup();
        }
    };

    const handleEquipPrimary = (w: any) => {
        let newSec = saveData.secondaryWeapon;
        if (newSec === w.id) newSec = null; // Can't have same for both
        onSave({ ...saveData, primaryWeapon: w.id, secondaryWeapon: newSec });
    };

    const handleEquipSecondary = (w: any) => {
        let newPrim = saveData.primaryWeapon;
        if (newPrim === w.id) return; // Disallow doing this directly to keep simple
        onSave({ ...saveData, secondaryWeapon: w.id });
    };

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900 z-50 flex flex-col overflow-hidden font-display"
        >
            <div className="flex items-center justify-between p-6 bg-slate-950 border-b-2 border-slate-700">
               <div className="flex items-center gap-4">
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onClose} className="p-2 bg-slate-800 text-slate-300 rounded border border-slate-600 hover:bg-slate-700">
                     <ArrowLeft />
                  </motion.button>
                  <h1 className="text-3xl font-bold font-mono text-white tracking-widest flex items-center gap-2"><Shield className="text-blue-500"/> ARMORY</h1>
               </div>
               <div className="flex items-center gap-2 bg-slate-800 px-6 py-2 rounded-lg border border-slate-600 shadow-inner">
                   <span className="text-slate-400 font-bold uppercase tracking-wider text-sm">Credits</span>
                   <span className="text-yellow-400 font-mono text-2xl font-bold flex items-center gap-1"><DollarSign size={20}/> {saveData.credits}</span>
               </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar relative">
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
                   {weaponList.map(w => (
                       <div key={w.id} className={`flex flex-col bg-slate-800/80 rounded-xl border-2 ${w.isEquippedPrimary ? 'border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]' : w.isOwned ? 'border-blue-500/50' : 'border-slate-700'} overflow-hidden relative`}>
                           
                           {w.isEquippedPrimary && <div className="absolute top-0 right-0 bg-green-500 text-slate-950 text-[10px] font-bold px-2 py-1 rounded-bl-lg uppercase tracking-widest flex items-center gap-1"><CheckCircle2 size={12}/> Primary</div>}
                           {w.isEquippedSecondary && <div className="absolute top-0 right-0 bg-yellow-500 text-slate-950 text-[10px] font-bold px-2 py-1 rounded-bl-lg uppercase tracking-widest flex items-center gap-1"><CheckCircle2 size={12}/> Secondary</div>}

                           <div className="p-4 border-b border-slate-700/50 flex items-center gap-3 bg-slate-900/50">
                               <div className="w-10 h-10 rounded border border-slate-600 shadow-inner flex items-center justify-center shrink-0" style={{backgroundColor: w.color}}>
                                  <Swords size={20} className="text-slate-950 opacity-50" />
                               </div>
                               <div>
                                   <h3 className="text-lg font-bold text-white leading-tight">{w.name}</h3>
                                   <div className="text-xs text-slate-400">{w.isOwned ? `Level ${w.level} / 5` : 'Locked'}</div>
                               </div>
                           </div>

                           <div className="p-4 flex-1 flex flex-col gap-4">
                               <p className="text-sm text-slate-300 min-h-[40px] italic">"{w.description}"</p>
                               
                               <div className="space-y-2 bg-slate-900/60 p-3 rounded border border-slate-700/50">
                                  {/* Calculate visual stats based on level */}
                                  <StatRow label="Damage" value={w.isOwned && w.level >= 2 ? Math.floor(w.damage * 1.15) : w.damage} isUpgraded={w.isOwned && w.level>=2} />
                                  <StatRow label="Fire Rate" value={w.fireRate} inverse isUpgraded={w.isOwned && w.level>=4} suffix="ms" />
                                  <StatRow label="Ammo" value={w.maxAmmo === Infinity ? '∞' : (w.isOwned && w.level>=3 ? Math.floor(w.maxAmmo*1.2) : w.maxAmmo)} isUpgraded={w.maxAmmo !== Infinity && w.isOwned && w.level>=3} />
                               </div>

                               {w.isOwned && w.level === 5 && (
                                   <div className="text-xs text-purple-400 flex items-center gap-1 bg-purple-900/20 p-2 rounded border border-purple-500/30">
                                      <Zap size={14} /> Masterwork Unlocked (Special FX active)
                                   </div>
                               )}
                           </div>

                           <div className="p-4 pt-0 mt-auto flex flex-col gap-2">
                               {!w.isOwned ? (
                                   <button 
                                      onClick={() => handleBuy(w)}
                                      disabled={saveData.credits < w.price}
                                      className={`w-full py-3 rounded font-bold transition flex justify-center items-center gap-2 ${saveData.credits >= w.price ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}
                                   >
                                      BUY FOR <DollarSign size={16}/>{w.price}
                                   </button>
                               ) : (
                                   <>
                                      <div className="flex gap-2">
                                          <button 
                                            onClick={() => handleEquipPrimary(w)}
                                            disabled={w.isEquippedPrimary}
                                            className={`flex-1 py-2 text-xs font-bold rounded uppercase tracking-wider ${w.isEquippedPrimary ? 'bg-green-600/20 text-green-500 border border-green-500/50' : 'bg-slate-700 text-white hover:bg-slate-600'}`}
                                          >
                                             {w.isEquippedPrimary ? 'Primary' : 'Equip Pri'}
                                          </button>
                                          <button 
                                            onClick={() => handleEquipSecondary(w)}
                                            disabled={w.isEquippedSecondary || w.isEquippedPrimary}
                                            className={`flex-1 py-2 text-xs font-bold rounded uppercase tracking-wider ${(w.isEquippedSecondary) ? 'bg-yellow-600/20 text-yellow-500 border border-yellow-500/50' : w.isEquippedPrimary ? 'opacity-30 cursor-not-allowed bg-slate-800 text-slate-500' : 'bg-slate-700 text-white hover:bg-slate-600'}`}
                                          >
                                             {w.isEquippedSecondary ? 'Secondary' : 'Equip Sec'}
                                          </button>
                                      </div>

                                      {w.level < 5 && (
                                          <button 
                                            onClick={() => handleUpgrade(w)}
                                            disabled={saveData.credits < getUpgradePrice(w.level)!}
                                            className={`w-full py-2 mt-1 rounded text-sm font-bold transition flex justify-between items-center px-4 ${saveData.credits >= getUpgradePrice(w.level)! ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-slate-800 border border-slate-700 text-slate-500 cursor-not-allowed'}`}
                                          >
                                             <span>UPGRADE LV {w.level + 1}</span>
                                             <span className="flex items-center"><DollarSign size={14}/>{getUpgradePrice(w.level)}</span>
                                          </button>
                                      )}
                                   </>
                               )}
                           </div>

                       </div>
                   ))}
               </div>
            </div>
        </motion.div>
    );
}

function StatRow({ label, value, isUpgraded = false, inverse = false, suffix = '' }: any) {
    return (
        <div className="flex justify-between items-center text-sm">
            <span className="text-slate-400 font-mono">{label}</span>
            <span className={`font-bold font-mono ${isUpgraded ? 'text-green-400' : 'text-slate-200'}`}>
                {value}{suffix} {isUpgraded && <span className="text-green-500 text-xs ml-1">↑</span>}
            </span>
        </div>
    )
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

function TouchControls({ onBtnDown, onBtnUp }: { onBtnDown: (key: string) => void, onBtnUp: (key: string) => void }) {
  const press = (key: string) => onBtnDown(key);
  const release = (key: string) => onBtnUp(key);

  const requestFullscreen = () => {
     if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch((err) => console.log(err));
     }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex items-end justify-between gap-2 p-3 sm:hidden pointer-events-none pb-8 landscape:pb-4 touch-none">
      <div className="pointer-events-auto grid grid-cols-3 gap-2">
        <button
          className="h-14 w-12 sm:h-16 sm:w-16 rounded-2xl bg-slate-900/80 border border-cyan-400 text-white text-xl active:scale-95 active:bg-cyan-900 touch-manipulation flex items-center justify-center"
          onTouchStart={(e) => { e.preventDefault(); press('a'); }}
          onTouchEnd={(e) => { e.preventDefault(); release('a'); }}
          onMouseDown={() => press('a')}
          onMouseUp={() => release('a')}
          onMouseLeave={() => release('a')}
        >
          ◀
        </button>

        <button
          className="h-14 w-12 sm:h-16 sm:w-16 rounded-2xl bg-slate-900/80 border border-cyan-400 text-white text-xl active:scale-95 active:bg-cyan-900 touch-manipulation flex items-center justify-center"
          onTouchStart={(e) => { e.preventDefault(); press('w'); }}
          onTouchEnd={(e) => { e.preventDefault(); release('w'); }}
          onMouseDown={() => press('w')}
          onMouseUp={() => release('w')}
          onMouseLeave={() => release('w')}
        >
          ⬆
        </button>

        <button
          className="h-14 w-12 sm:h-16 sm:w-16 rounded-2xl bg-slate-900/80 border border-cyan-400 text-white text-xl active:scale-95 active:bg-cyan-900 touch-manipulation flex items-center justify-center"
          onTouchStart={(e) => { e.preventDefault(); press('d'); }}
          onTouchEnd={(e) => { e.preventDefault(); release('d'); }}
          onMouseDown={() => press('d')}
          onMouseUp={() => release('d')}
          onMouseLeave={() => release('d')}
        >
          ▶
        </button>
      </div>

      <div className="pointer-events-auto grid grid-cols-2 gap-2">
        <button
          className="h-14 min-w-[3.5rem] rounded-2xl bg-slate-800/90 border border-slate-400 text-white text-xs font-black active:scale-95 touch-manipulation col-span-2 flex items-center justify-center -translate-y-12 fixed right-[4.5rem] bottom-20 w-16 portrait:-translate-y-20 portrait:right-32"
          onClick={requestFullscreen}
        >
           ⛶
        </button>

        <button
          className="h-14 min-w-[3.5rem] rounded-2xl bg-red-600/90 border border-red-300 text-white text-xs font-black active:scale-95 active:bg-red-700 touch-manipulation"
          onTouchStart={(e) => { e.preventDefault(); press('j'); }}
          onTouchEnd={(e) => { e.preventDefault(); release('j'); }}
          onMouseDown={() => press('j')}
          onMouseUp={() => release('j')}
          onMouseLeave={() => release('j')}
        >
          FIRE
        </button>

        <button
          className="h-14 min-w-[3.5rem] rounded-2xl bg-orange-600/90 border border-orange-300 text-white text-xs font-black active:scale-95 active:bg-orange-700 touch-manipulation"
          onTouchStart={(e) => { e.preventDefault(); press('k'); }}
          onTouchEnd={(e) => { e.preventDefault(); release('k'); }}
          onMouseDown={() => press('k')}
          onMouseUp={() => release('k')}
          onMouseLeave={() => release('k')}
        >
          BOMB
        </button>

        <button
          className="h-14 min-w-[3.5rem] rounded-2xl bg-purple-700/90 border border-purple-300 text-white text-[10px] sm:text-xs font-black active:scale-95 active:bg-purple-800 touch-manipulation"
          onTouchStart={(e) => { e.preventDefault(); press('l'); }}
          onTouchEnd={(e) => { e.preventDefault(); release('l'); }}
          onMouseDown={() => press('l')}
          onMouseUp={() => release('l')}
          onMouseLeave={() => release('l')}
        >
          SWAP
        </button>

        <button
          className="h-14 min-w-[3.5rem] rounded-2xl bg-slate-800/90 border border-slate-300 text-white text-[10px] sm:text-xs font-black active:scale-95 active:bg-slate-700 touch-manipulation"
          onTouchStart={(e) => { e.preventDefault(); press('p'); }}
          onTouchEnd={(e) => { e.preventDefault(); release('p'); }}
          onMouseDown={() => press('p')}
          onMouseUp={() => release('p')}
          onMouseLeave={() => release('p')}
        >
          PAUSE
        </button>
      </div>
    </div>
  );
}

