import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Shield, Swords, DollarSign, Crosshair, ArrowLeft, Star, Heart, Zap, RefreshCw, Trophy } from 'lucide-react';
import { WEAPON_DEFS } from '../game/Weapons';
import { WeaponType } from '../game/Types';
import { ARMORS } from '../game/Armors';
import { MELEE_WEAPONS } from '../game/MeleeWeapons';
import { audioSystem } from '../lib/audio';

export function ArmoryScreen({ saveData, onSave, onClose }: any) {
    const [activeTab, setActiveTab] = useState<'guns' | 'melee' | 'armor' | 'items' | 'rewards'>('guns');

    // ... helper logic for purchasing, tabs, etc. Let's build it out completely.
    const getWeaponUpgradePrice = (level: number) => {
        if (level === 1) return 250;
        if (level === 2) return 500;
        if (level === 3) return 800;
        if (level === 4) return 1200;
        return null;
    };

    const getMeleeUpgradePrice = (level: number) => {
        if (level === 1) return 200;
        if (level === 2) return 400;
        if (level === 3) return 700;
        if (level === 4) return 1000;
        return null;
    };

    const handleBuyGun = (w: any) => {
        if (saveData.credits >= w.price) {
           onSave({
               ...saveData,
               credits: saveData.credits - w.price,
               ownedWeapons: [...saveData.ownedWeapons, w.id],
               weaponLevels: { ...saveData.weaponLevels, [w.id]: 1 }
           });
           audioSystem.playPickup();
        }
    };

    const handleUpgradeGun = (w: any) => {
        const cost = getWeaponUpgradePrice(w.level);
        if (cost && saveData.credits >= cost) {
             onSave({
                 ...saveData,
                 credits: saveData.credits - cost,
                 weaponLevels: { ...saveData.weaponLevels, [w.id]: w.level + 1 }
             });
             audioSystem.playPickup();
        }
    };

    const handleEquipGunPrimary = (w: any) => {
        let newSec = saveData.secondaryWeapon;
        if (newSec === w.id) newSec = null;
        onSave({ ...saveData, primaryWeapon: w.id, secondaryWeapon: newSec });
    };

    const handleEquipGunSecondary = (w: any) => {
        let newPrim = saveData.primaryWeapon;
        if (newPrim === w.id) return;
        onSave({ ...saveData, secondaryWeapon: w.id });
    };

    const handleBuyMelee = (w: any) => {
        if (saveData.credits >= w.price && w.price < 99999) {
           onSave({
               ...saveData,
               credits: saveData.credits - w.price,
               ownedMeleeWeapons: [...(saveData.ownedMeleeWeapons || []), w.id],
               meleeWeaponLevels: { ...(saveData.meleeWeaponLevels || {}), [w.id]: 1 }
           });
           audioSystem.playPickup();
        }
    };

    const handleUpgradeMelee = (w: any) => {
        const cost = getMeleeUpgradePrice(w.level);
        if (cost && saveData.credits >= cost) {
             onSave({
                 ...saveData,
                 credits: saveData.credits - cost,
                 meleeWeaponLevels: { ...saveData.meleeWeaponLevels, [w.id]: w.level + 1 }
             });
             audioSystem.playPickup();
        }
    };

    const handleEquipMelee = (w: any) => {
        onSave({ ...saveData, equippedMeleeWeapon: w.id });
    };

    const handleBuyArmor = (a: any) => {
        if (saveData.credits >= a.price && a.price < 99999) {
           onSave({
               ...saveData,
               credits: saveData.credits - a.price,
               ownedArmor: [...(saveData.ownedArmor || []), a.id],
           });
           audioSystem.playPickup();
        }
    };

    const handleEquipArmor = (a: any) => {
        onSave({ ...saveData, equippedArmor: a.id });
    };

    const handleUnequipArmor = () => {
        onSave({ ...saveData, equippedArmor: null });
    };

    const handleBuyItem = (item: string, cost: number) => {
        if (saveData.credits >= cost) {
            let newSave = { ...saveData, credits: saveData.credits - cost };
            if (item === 'lives') {
                if (newSave.currentLives >= newSave.maxLives) return; // Full
                newSave.currentLives += 1;
            } else if (item === 'revive') {
                newSave.reviveTokens = (newSave.reviveTokens || 0) + 1;
            }
            onSave(newSave);
            audioSystem.playPickup();
        }
    };

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900 z-50 flex flex-col overflow-hidden font-display"
        >
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-6 bg-slate-950 border-b-2 border-slate-700 gap-4 pt-safe shrink-0">
               <div className="flex items-center gap-4">
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onClose} className="p-2 bg-slate-800 text-slate-300 rounded border border-slate-600 hover:bg-slate-700">
                     <ArrowLeft />
                  </motion.button>
                  <h1 className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-widest flex items-center gap-2"><Shield className="text-blue-500"/> ARMORY</h1>
               </div>
               
               <div className="flex gap-2 text-sm sm:text-base px-2">
                   {/* Lives & Revives count header */}
                   <div className="flex items-center gap-2 bg-slate-800 px-3 sm:px-4 py-2 rounded-lg border border-slate-600">
                       <span className="text-red-400 font-bold flex items-center gap-1"><Heart size={16}/> {saveData.currentLives}/{saveData.maxLives}</span>
                       {(saveData.reviveTokens || 0) > 0 && <span className="text-purple-400 font-bold flex items-center gap-1"><RefreshCw size={16}/> {saveData.reviveTokens}</span>}
                   </div>
                   <div className="flex items-center gap-2 bg-slate-800 px-3 sm:px-6 py-2 rounded-lg border border-slate-600 shadow-inner">
                       <span className="hidden sm:inline text-slate-400 font-bold uppercase tracking-wider text-sm">Credits</span>
                       <span className="text-yellow-400 font-mono text-xl sm:text-2xl font-bold flex items-center gap-1"><DollarSign size={16}/> {saveData.credits}</span>
                   </div>
               </div>
            </div>

            {/* Tabs */}
            <div className="flex overflow-x-auto p-4 gap-2 bg-slate-900 shrink-0 custom-scrollbar">
                {[ 
                  { id: 'guns', label: 'GUNS', icon: Crosshair },
                  { id: 'melee', label: 'MELEE', icon: Swords },
                  { id: 'armor', label: 'ARMOR', icon: Shield },
                  { id: 'items', label: 'ITEMS', icon: Zap },
                  { id: 'rewards', label: 'REWARDS', icon: Trophy },
                ].map(tab => (
                   <button 
                       key={tab.id}
                       onClick={() => setActiveTab(tab.id as any)}
                       className={`flex items-center gap-2 px-6 py-3 font-bold rounded-lg whitespace-nowrap transition-colors border-2 ${
                           activeTab === tab.id 
                           ? 'bg-blue-600/20 text-blue-400 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]' 
                           : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-200'
                       }`}
                   >
                       <tab.icon size={18} /> {tab.label}
                   </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar">
                
                {/* --- GUNS --- */}
                {activeTab === 'guns' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 max-w-7xl mx-auto">
                        {Object.entries(WEAPON_DEFS).map(([id, wDef]) => {
                            const isOwned = saveData.ownedWeapons.includes(id as WeaponType);
                            const level = saveData.weaponLevels[id] || 1;
                            const isEquippedPrimary = saveData.primaryWeapon === id;
                            const isEquippedSecondary = saveData.secondaryWeapon === id;
                            const upgradeCost = getWeaponUpgradePrice(level);

                            return (
                                <div key={id} className={`flex flex-col bg-slate-800/80 rounded-xl p-6 border-2 
                                        ${isEquippedPrimary ? 'border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)]' : 
                                          isEquippedSecondary ? 'border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)]' : 
                                          isOwned ? 'border-slate-500' : 'border-slate-700 opacity-60'}`}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-4 h-12 rounded-sm" style={{ backgroundColor: wDef.color }} />
                                            <div>
                                                <h3 className="text-xl font-bold font-mono text-white tracking-widest">{wDef.name}</h3>
                                                <p className="text-slate-400 text-sm mt-1">{wDef.description}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex-1 text-sm bg-slate-900/50 p-4 rounded-lg mb-6 border border-slate-700">
                                        <div className="flex justify-between mb-2">
                                            <span className="text-slate-500">Damage</span>
                                            <span className="font-mono font-bold text-red-400">{wDef.damage * (1 + (level-1)*0.2)} / hit</span>
                                        </div>
                                        <div className="flex justify-between mb-2">
                                            <span className="text-slate-500">Fire Rate</span>
                                            <span className="font-mono font-bold text-amber-400">{wDef.fireRate} ms</span>
                                        </div>
                                        <div className="flex justify-between mb-4">
                                            <span className="text-slate-500">Ammo</span>
                                            <span className="font-mono font-bold text-blue-400">{wDef.maxAmmo === Infinity ? 'Infinite' : Math.floor(wDef.maxAmmo * (1 + (level === 5 ? 0.5 : (level >= 3 ? 0.2 : 0))))}</span>
                                        </div>
                                        {isOwned && (
                                            <div className="flex justify-between items-center border-t border-slate-700 pt-3">
                                                <span className="text-slate-500">Upgrade LVL {level} {level===5 && '(MAX)'}</span>
                                                {upgradeCost && (
                                                    <button 
                                                        disabled={saveData.credits < upgradeCost}
                                                        onClick={() => handleUpgradeGun({id, level})}
                                                        className={`px-3 py-1 bg-yellow-400 text-black font-bold font-mono rounded hover:bg-yellow-300 disabled:opacity-50 disabled:bg-slate-600 disabled:text-slate-400 transition-colors flex items-center gap-1`}
                                                    >
                                                        <DollarSign size={14}/> {upgradeCost}
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="flex gap-2">
                                        {!isOwned ? (
                                            <button 
                                                disabled={saveData.credits < wDef.price}
                                                onClick={() => handleBuyGun({id, price: wDef.price})}
                                                className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded hover:bg-indigo-500 disabled:opacity-50 disabled:bg-slate-700 transition"
                                            >
                                                BUY - {wDef.price} CR
                                            </button>
                                        ) : (
                                            <>
                                                <button 
                                                    onClick={() => handleEquipGunPrimary({id})}
                                                    className={`flex-1 py-3 font-bold rounded border-2 transition-colors
                                                        ${isEquippedPrimary ? 'bg-green-600/20 text-green-400 border-green-500' : 'bg-slate-800 text-slate-300 border-slate-600 hover:bg-slate-700'}`}
                                                >
                                                    {isEquippedPrimary ? 'PRIMARY' : 'EQUIP PRI'}
                                                </button>
                                                <button 
                                                    onClick={() => handleEquipGunSecondary({id})}
                                                    className={`flex-1 py-3 font-bold rounded border-2 transition-colors
                                                        ${isEquippedSecondary ? 'bg-blue-600/20 text-blue-400 border-blue-500' : 'bg-slate-800 text-slate-300 border-slate-600 hover:bg-slate-700'}`}
                                                >
                                                    {isEquippedSecondary ? 'SECONDARY' : 'EQUIP SEC'}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* --- MELEE --- */}
                {activeTab === 'melee' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 max-w-7xl mx-auto">
                        {MELEE_WEAPONS.map(w => {
                            const isOwned = (saveData.ownedMeleeWeapons || []).includes(w.id);
                            const level = (saveData.meleeWeaponLevels || {})[w.id] || 1;
                            const isEquipped = saveData.equippedMeleeWeapon === w.id;
                            const upgradeCost = getMeleeUpgradePrice(level);

                            return (
                                <div key={w.id} className={`flex flex-col bg-slate-800/80 rounded-xl p-6 border-2 
                                        ${isEquipped ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]' : 
                                          isOwned ? 'border-slate-500' : 'border-slate-700 opacity-60'}`}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-4 rounded-sm" style={{ backgroundColor: w.color }} />
                                            <h3 className="text-xl font-bold font-mono text-white tracking-widest">{w.name}</h3>
                                        </div>
                                    </div>
                                    <div className="flex-1 text-sm bg-slate-900/50 p-4 rounded-lg mb-6 border border-slate-700">
                                        <div className="flex justify-between mb-2">
                                            <span className="text-slate-500">Damage</span>
                                            <span className="font-mono font-bold text-red-400">{Math.floor(w.baseDamage * (1 + (level-1)*0.15))}</span>
                                        </div>
                                        <div className="flex justify-between mb-2">
                                            <span className="text-slate-500">Range</span>
                                            <span className="font-mono font-bold text-emerald-400">{w.range + (level >= 4 ? 20 : 0)}</span>
                                        </div>
                                        {w.specialEffect && (
                                            <div className="flex justify-between mb-4">
                                                <span className="text-slate-500">Special</span>
                                                <span className="font-mono font-bold text-purple-400">{w.specialEffect} {level >= 5 && '(MAX EFF)'}</span>
                                            </div>
                                        )}
                                        {isOwned && (
                                            <div className="flex justify-between items-center border-t border-slate-700 pt-3 mt-4">
                                                <span className="text-slate-500">Upgrade LVL {level} {level===5 && '(MAX)'}</span>
                                                {upgradeCost && (
                                                    <button 
                                                        disabled={saveData.credits < upgradeCost}
                                                        onClick={() => handleUpgradeMelee({id: w.id, level})}
                                                        className={`px-3 py-1 bg-yellow-400 text-black font-bold font-mono rounded hover:bg-yellow-300 disabled:opacity-50 disabled:bg-slate-600 disabled:text-slate-400 transition-colors flex items-center gap-1`}
                                                    >
                                                        <DollarSign size={14}/> {upgradeCost}
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        {!isOwned ? (
                                            <button 
                                                disabled={saveData.credits < w.price || w.price >= 99999}
                                                onClick={() => handleBuyMelee(w)}
                                                className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded hover:bg-indigo-500 disabled:opacity-50 disabled:bg-slate-700 transition"
                                            >
                                                {w.price >= 99999 ? 'LOCKED' : `BUY - ${w.price} CR`}
                                            </button>
                                        ) : (
                                            <button 
                                                onClick={() => handleEquipMelee(w)}
                                                className={`flex-1 py-3 font-bold rounded border-2 transition-colors
                                                    ${isEquipped ? 'bg-red-600/20 text-red-500 border-red-500' : 'bg-slate-800 text-slate-300 border-slate-600 hover:bg-slate-700'}`}
                                            >
                                                {isEquipped ? 'EQUIPPED' : 'EQUIP'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* --- ARMOR --- */}
                {activeTab === 'armor' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 max-w-7xl mx-auto">
                        <div className={`col-span-full mb-4 flex justify-end`}>
                           {saveData.equippedArmor && (
                               <button 
                                 onClick={handleUnequipArmor} 
                                 className="px-4 py-2 bg-slate-800 text-slate-300 rounded border border-slate-600 hover:bg-slate-700 font-bold text-sm"
                               >
                                  UNEQUIP CURRENT ARMOR
                               </button>
                           )}
                        </div>
                        {ARMORS.map(a => {
                            const isOwned = (saveData.ownedArmor || []).includes(a.id);
                            const isEquipped = saveData.equippedArmor === a.id;

                            return (
                                <div key={a.id} className={`flex flex-col bg-slate-800/80 rounded-xl p-6 border-2 
                                        ${isEquipped ? 'border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.3)]' : 
                                          isOwned ? 'border-slate-500' : 'border-slate-700 opacity-60'}`}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <Shield size={24} className={isEquipped ? 'text-amber-500' : 'text-slate-400'} />
                                            <h3 className="text-xl font-bold font-mono text-white tracking-widest">{a.name}</h3>
                                        </div>
                                    </div>
                                    <div className="flex-1 text-sm bg-slate-900/50 p-4 rounded-lg mb-6 border border-slate-700">
                                        <div className="flex justify-between mb-2">
                                            <span className="text-slate-500">Max HP</span>
                                            <span className="font-mono font-bold text-green-400">+{a.maxHpBonus}</span>
                                        </div>
                                        <div className="flex justify-between mb-2">
                                            <span className="text-slate-500">Damage Reduc.</span>
                                            <span className="font-mono font-bold text-blue-400">{a.damageReduction * 100}%</span>
                                        </div>
                                        <div className="flex justify-between mb-2">
                                            <span className="text-slate-500">Speed Mod.</span>
                                            <span className={`font-mono font-bold ${a.speedModifier >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {a.speedModifier > 0 ? '+' : ''}{a.speedModifier * 100}%
                                            </span>
                                        </div>
                                        {a.specialEffect && a.specialEffect !== "None" && (
                                            <div className="flex justify-between mb-4 border-t border-slate-700 pt-2 mt-2">
                                                <span className="text-slate-500">Special</span>
                                                <span className="font-mono font-bold text-amber-400">{a.specialEffect}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        {!isOwned ? (
                                            <button 
                                                disabled={saveData.credits < a.price || a.price >= 99999}
                                                onClick={() => handleBuyArmor(a)}
                                                className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded hover:bg-indigo-500 disabled:opacity-50 disabled:bg-slate-700 transition"
                                            >
                                                {a.price >= 99999 ? 'LOCKED' : `BUY - ${a.price} CR`}
                                            </button>
                                        ) : (
                                            <button 
                                                onClick={() => handleEquipArmor(a)}
                                                className={`flex-1 py-3 font-bold rounded border-2 transition-colors
                                                    ${isEquipped ? 'bg-amber-600/20 text-amber-500 border-amber-500' : 'bg-slate-800 text-slate-300 border-slate-600 hover:bg-slate-700'}`}
                                            >
                                                {isEquipped ? 'EQUIPPED' : 'EQUIP'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* --- ITEMS --- */}
                {activeTab === 'items' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
                        <div className="bg-slate-800 border bg-slate-800 border-slate-700 p-6 rounded-xl flex flex-col items-center text-center">
                            <Heart size={48} className="text-red-500 mb-4" />
                            <h3 className="text-lg font-bold text-white mb-2">+1 Extra Life</h3>
                            <p className="text-slate-400 text-sm mb-6 flex-1">Start missions with an additional life if you're below maximum capacity.</p>
                            <button 
                                disabled={saveData.credits < 300 || saveData.currentLives >= saveData.maxLives}
                                onClick={() => handleBuyItem('lives', 300)}
                                className="w-full py-3 bg-green-600 text-white font-bold rounded hover:bg-green-500 disabled:opacity-50 disabled:bg-slate-700 transition"
                            >
                                {saveData.currentLives >= saveData.maxLives ? 'MAX LIVES' : 'BUY - 300 CR'}
                            </button>
                        </div>
                        <div className="bg-slate-800 border bg-slate-800 border-slate-700 p-6 rounded-xl flex flex-col items-center text-center">
                            <RefreshCw size={48} className="text-purple-500 mb-4" />
                            <h3 className="text-lg font-bold text-white mb-2">Revive Token</h3>
                            <p className="text-slate-400 text-sm mb-6 flex-1">Automatically revive with 50% HP once per life if you run out of HP.</p>
                            <button 
                                disabled={saveData.credits < 1000}
                                onClick={() => handleBuyItem('revive', 1000)}
                                className="w-full py-3 bg-indigo-600 text-white font-bold rounded hover:bg-indigo-500 disabled:opacity-50 disabled:bg-slate-700 transition"
                            >
                                BUY - 1000 CR
                            </button>
                        </div>
                    </div>
                )}

                {/* --- REWARDS --- */}
                {activeTab === 'rewards' && (
                    <div className="max-w-4xl mx-auto">
                       <h2 className="text-2xl font-bold text-white mb-6 border-b border-slate-700 pb-2">Unlocked Legendary Artifacts</h2>
                       {!saveData.finalRewardClaimed ? (
                           <div className="text-slate-400 text-center py-12 bg-slate-900 border border-slate-800 rounded-xl">
                               Defeat the Iron Overlord to discover legendary rewards.
                           </div>
                       ) : (
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                               <div className="bg-gradient-to-br from-amber-900/50 to-slate-900 border border-amber-600/50 p-4 rounded-xl flex items-center gap-4">
                                   <Shield size={32} className="text-amber-500" />
                                   <div>
                                       <h4 className="font-bold text-amber-500">Iron Phoenix Armor</h4>
                                       <p className="text-xs text-slate-300">Unlocked in Armor tab.</p>
                                   </div>
                               </div>
                               <div className="bg-gradient-to-br from-purple-900/50 to-slate-900 border border-purple-600/50 p-4 rounded-xl flex items-center gap-4">
                                   <Swords size={32} className="text-purple-400" />
                                   <div>
                                       <h4 className="font-bold text-purple-400">Plasma Saber</h4>
                                       <p className="text-xs text-slate-300">Unlocked in Melee tab.</p>
                                   </div>
                               </div>
                           </div>
                       )}
                    </div>
                )}

            </div>
        </motion.div>
    );
}
