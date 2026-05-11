import React, { useEffect, useRef } from 'react';
import { GameEngine } from '../game/GameEngine';

export function StageBackground({ theme, engine }: { theme: string, engine: GameEngine | null }) {
    const containerRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        let frameId: number;
        const update = () => {
            if (engine && containerRef.current) {
                containerRef.current.style.setProperty('--scroll-x', `${engine.bgScrollX}px`);
            }
            frameId = requestAnimationFrame(update);
        };
        frameId = requestAnimationFrame(update);
        return () => cancelAnimationFrame(frameId);
    }, [engine]);
    
    // Convert theme into different visual styles
    if (theme === 'desert') {
        return (
            <div ref={containerRef} className="absolute inset-0 bg-amber-900 overflow-hidden pointer-events-none -z-10 bg-scroll-container">
                <style>{`
                    .bg-scroll-container { --scroll-x: 0px; }
                    .parallax-far { transform: translateX(calc(var(--scroll-x) * -0.1)); }
                    .parallax-mid { transform: translateX(calc(var(--scroll-x) * -0.3)); }
                    .parallax-fore { transform: translateX(calc(var(--scroll-x) * -0.6)); }
                    .parallax-fast { transform: translateX(calc(var(--scroll-x) * -0.8)); }
                `}</style>
                {/* Sun */}
                <div className="absolute top-10 left-20 w-32 h-32 bg-orange-500 rounded-full blur-[10px] opacity-80" />
                
                {/* Parallax Mountains Far */}
                <div className="absolute bottom-12 h-64 w-[200%] flex parallax-far">
                    <div className="flex-1 bg-amber-800/60" style={{ clipPath: 'polygon(0% 100%, 10% 40%, 30% 70%, 50% 20%, 70% 80%, 90% 30%, 100% 100%)' }} />
                    <div className="flex-1 bg-amber-800/60" style={{ clipPath: 'polygon(0% 100%, 10% 40%, 30% 70%, 50% 20%, 70% 80%, 90% 30%, 100% 100%)' }} />
                </div>
                
                {/* Parallax Dunes Mid */}
                <div className="absolute bottom-12 h-40 w-[200%] flex parallax-mid">
                    <div className="flex-1 bg-amber-700/80" style={{ clipPath: 'polygon(0% 100%, 20% 50%, 40% 100%, 60% 40%, 80% 100%, 100% 60%, 100% 100%)' }} />
                    <div className="flex-1 bg-amber-700/80" style={{ clipPath: 'polygon(0% 100%, 20% 50%, 40% 100%, 60% 40%, 80% 100%, 100% 60%, 100% 100%)' }} />
                </div>
                
                {/* Props Foreground */}
                <div className="absolute bottom-12 h-20 w-[200%] flex parallax-fore">
                   <div className="flex-1 relative">
                       <div className="absolute bottom-0 left-[10%] w-4 h-16 bg-slate-800 rounded-t-lg" />
                       <div className="absolute bottom-12 left-[9%] w-6 h-6 border-2 border-slate-700 rounded-full" />
                       <div className="absolute bottom-0 left-[50%] w-16 h-12 bg-slate-700 rounded" />
                       <div className="absolute bottom-0 left-[80%] w-2 h-10 bg-amber-950 skew-x-12" />
                   </div>
                   <div className="flex-1 relative">
                       <div className="absolute bottom-0 left-[10%] w-4 h-16 bg-slate-800 rounded-t-lg" />
                       <div className="absolute bottom-12 left-[9%] w-6 h-6 border-2 border-slate-700 rounded-full" />
                       <div className="absolute bottom-0 left-[50%] w-16 h-12 bg-slate-700 rounded" />
                       <div className="absolute bottom-0 left-[80%] w-2 h-10 bg-amber-950 skew-x-12" />
                   </div>
                </div>
            </div>
        );
    }
    
    if (theme === 'jungle') {
        return (
            <div ref={containerRef} className="absolute inset-0 bg-emerald-950 overflow-hidden pointer-events-none -z-10 bg-scroll-container">
                <style>{`
                    .bg-scroll-container { --scroll-x: 0px; }
                    .parallax-far { transform: translateX(calc(var(--scroll-x) * -0.1)); }
                    .parallax-mid { transform: translateX(calc(var(--scroll-x) * -0.3)); }
                    .parallax-fore { transform: translateX(calc(var(--scroll-x) * -0.6)); }
                    .parallax-fast { transform: translateX(calc(var(--scroll-x) * -0.8)); }
                `}</style>
                {/* Fog */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-emerald-900/50" />
                
                {/* Trees Far */}
                <div className="absolute bottom-12 h-64 w-[200%] flex gap-8 parallax-far">
                   {[...Array(20)].map((_, i) => (
                       <div key={i} className="w-16 h-full bg-emerald-900/60 rounded-t-full" />
                   ))}
                </div>
                
                {/* Ruins Mid */}
                <div className="absolute bottom-12 h-40 w-[200%] flex parallax-mid">
                    <div className="flex-1 relative">
                        <div className="absolute bottom-0 left-[20%] w-32 h-32 bg-slate-800/80" style={{ clipPath: 'polygon(10% 0, 90% 0, 100% 100%, 0 100%)' }} />
                        <div className="absolute bottom-0 left-[70%] w-24 h-48 bg-slate-800/80" />
                    </div>
                    <div className="flex-1 relative">
                        <div className="absolute bottom-0 left-[20%] w-32 h-32 bg-slate-800/80" style={{ clipPath: 'polygon(10% 0, 90% 0, 100% 100%, 0 100%)' }} />
                        <div className="absolute bottom-0 left-[70%] w-24 h-48 bg-slate-800/80" />
                    </div>
                </div>
                
                {/* Vines / Props Fore */}
                <div className="absolute top-0 h-32 w-[200%] flex parallax-fast">
                   <div className="flex-1 relative">
                       <div className="absolute top-0 left-[15%] w-2 h-32 bg-emerald-700/80 skew-x-[-10deg]" />
                       <div className="absolute top-0 left-[45%] w-4 h-24 bg-emerald-800/80 skew-x-[5deg]" />
                   </div>
                   <div className="flex-1 relative">
                       <div className="absolute top-0 left-[15%] w-2 h-32 bg-emerald-700/80 skew-x-[-10deg]" />
                       <div className="absolute top-0 left-[45%] w-4 h-24 bg-emerald-800/80 skew-x-[5deg]" />
                   </div>
                </div>
            </div>
        );
    }
    
    if (theme === 'snow') {
        return (
            <div ref={containerRef} className="absolute inset-0 bg-slate-900 overflow-hidden pointer-events-none -z-10 bg-scroll-container">
                <style>{`
                    .bg-scroll-container { --scroll-x: 0px; }
                    .parallax-far { transform: translateX(calc(var(--scroll-x) * -0.1)); }
                    .parallax-mid { transform: translateX(calc(var(--scroll-x) * -0.3)); }
                    .parallax-fore { transform: translateX(calc(var(--scroll-x) * -0.6)); }
                    .parallax-fast { transform: translateX(calc(var(--scroll-x) * -0.8)); }
                `}</style>
                {/* Ice Mountains */}
                <div className="absolute bottom-12 h-64 w-[200%] flex parallax-far">
                    <div className="flex-1 bg-slate-800/80" style={{ clipPath: 'polygon(0% 100%, 15% 20%, 35% 80%, 50% 10%, 75% 70%, 90% 30%, 100% 100%)' }} />
                    <div className="flex-1 bg-slate-800/80" style={{ clipPath: 'polygon(0% 100%, 15% 20%, 35% 80%, 50% 10%, 75% 70%, 90% 30%, 100% 100%)' }} />
                </div>
                
                {/* Base Structures */}
                <div className="absolute bottom-12 h-40 w-[200%] flex parallax-mid">
                    <div className="flex-1 relative">
                        <div className="absolute bottom-0 left-[30%] w-48 h-24 bg-slate-700/80 border-t-4 border-slate-300/50" />
                        <div className="absolute bottom-24 left-[40%] w-8 h-20 bg-slate-600/80" />
                    </div>
                    <div className="flex-1 relative">
                        <div className="absolute bottom-0 left-[30%] w-48 h-24 bg-slate-700/80 border-t-4 border-slate-300/50" />
                        <div className="absolute bottom-24 left-[40%] w-8 h-20 bg-slate-600/80" />
                    </div>
                </div>
                
                {/* Crates/Fore */}
                <div className="absolute bottom-12 h-20 w-[200%] flex parallax-fore">
                   <div className="flex-1 relative">
                       <div className="absolute bottom-0 left-[10%] w-16 h-16 bg-slate-800/90 rounded border border-slate-500" />
                       <div className="absolute bottom-16 left-[12%] w-12 h-12 bg-slate-800/90 rounded border border-slate-500" />
                   </div>
                   <div className="flex-1 relative">
                       <div className="absolute bottom-0 left-[10%] w-16 h-16 bg-slate-800/90 rounded border border-slate-500" />
                       <div className="absolute bottom-16 left-[12%] w-12 h-12 bg-slate-800/90 rounded border border-slate-500" />
                   </div>
                </div>
            </div>
        );
    }
    
    if (theme === 'urban') {
        return (
            <div ref={containerRef} className="absolute inset-0 bg-gray-950 overflow-hidden pointer-events-none -z-10 bg-scroll-container">
                <style>{`
                    .bg-scroll-container { --scroll-x: 0px; }
                    .parallax-far { transform: translateX(calc(var(--scroll-x) * -0.1)); }
                    .parallax-mid { transform: translateX(calc(var(--scroll-x) * -0.3)); }
                    .parallax-fore { transform: translateX(calc(var(--scroll-x) * -0.6)); }
                    .parallax-fast { transform: translateX(calc(var(--scroll-x) * -0.8)); }
                `}</style>
                {/* Fire background glow */}
                <div className="absolute bottom-0 inset-x-0 h-48 bg-gradient-to-t from-orange-900/30 to-transparent" />
                
                {/* Buildings Far */}
                <div className="absolute bottom-12 h-[300px] w-[200%] flex gap-2 parallax-far">
                   {[...Array(30)].map((_, i) => (
                       <div key={i} className="flex-1 border-t border-slate-800 bg-slate-900/60" style={{ height: `${(i * 13 % 60) + 40}%`, marginTop: 'auto' }} />
                   ))}
                </div>
                
                {/* Buildings Mid */}
                <div className="absolute bottom-12 h-64 w-[200%] flex gap-4 parallax-mid">
                   {[...Array(15)].map((_, i) => (
                       <div key={i} className="w-24 bg-slate-800/80 relative" style={{ height: `${(i * 17 % 50) + 50}%`, marginTop: 'auto' }}>
                           {i % 3 === 0 && <div className="absolute top-4 left-4 w-4 h-4 bg-yellow-500/20" />}
                       </div>
                   ))}
                </div>
                
                {/* Street Foreground */}
                <div className="absolute bottom-12 h-20 w-[200%] flex parallax-fore">
                   <div className="flex-1 relative">
                       <div className="absolute bottom-0 left-[20%] w-24 h-12 bg-slate-700/80 skew-x-[-20deg]" /> {/* ruined car */}
                       <div className="absolute bottom-0 left-[60%] w-4 h-32 bg-slate-800/90" /> {/* lamp post */}
                       <div className="absolute bottom-28 left-[60%] w-12 h-2 bg-slate-800/90" />
                   </div>
                   <div className="flex-1 relative">
                       <div className="absolute bottom-0 left-[20%] w-24 h-12 bg-slate-700/80 skew-x-[-20deg]" /> 
                       <div className="absolute bottom-0 left-[60%] w-4 h-32 bg-slate-800/90" />
                       <div className="absolute bottom-28 left-[60%] w-12 h-2 bg-slate-800/90" />
                   </div>
                </div>
            </div>
        );
    }
    
    if (theme === 'toxic') {
        return (
            <div ref={containerRef} className="absolute inset-0 bg-green-950 overflow-hidden pointer-events-none -z-10 bg-scroll-container">
                <style>{`
                    .bg-scroll-container { --scroll-x: 0px; }
                    .parallax-far { transform: translateX(calc(var(--scroll-x) * -0.1)); }
                    .parallax-mid { transform: translateX(calc(var(--scroll-x) * -0.3)); }
                    .parallax-fore { transform: translateX(calc(var(--scroll-x) * -0.6)); }
                    .parallax-fast { transform: translateX(calc(var(--scroll-x) * -0.8)); }
                `}</style>
                {/* Glowing Toxic Vats Far */}
                <div className="absolute bottom-12 h-[300px] w-[200%] flex gap-12 parallax-far">
                   {[...Array(10)].map((_, i) => (
                       <div key={i} className="w-32 h-64 bg-slate-900 border-x-2 border-t-2 border-slate-700 rounded-t-lg mt-auto overflow-hidden relative">
                           <div className="absolute bottom-0 w-full h-[60%] bg-emerald-500/20" />
                           <div className="absolute bottom-[60%] w-full h-[2px] bg-emerald-400/50 shadow-[0_0_10px_#34d399]" />
                       </div>
                   ))}
                </div>
                
                {/* Pipes Mid */}
                <div className="absolute bottom-12 h-64 w-[200%] flex parallax-mid">
                   <div className="flex-1 relative">
                       <div className="absolute top-[30%] w-full h-8 bg-slate-800 border-y border-slate-700" />
                       <div className="absolute top-0 left-[10%] w-12 h-full bg-slate-800 border-x border-slate-700" />
                       <div className="absolute top-[60%] left-[50%] w-16 h-full bg-slate-800 border-x border-slate-700" />
                   </div>
                   <div className="flex-1 relative">
                       <div className="absolute top-[30%] w-full h-8 bg-slate-800 border-y border-slate-700" />
                       <div className="absolute top-0 left-[10%] w-12 h-full bg-slate-800 border-x border-slate-700" />
                       <div className="absolute top-[60%] left-[50%] w-16 h-full bg-slate-800 border-x border-slate-700" />
                   </div>
                </div>
            </div>
        );
    }
    
    if (theme === 'citadel') {
        return (
            <div ref={containerRef} className="absolute inset-0 bg-red-950 overflow-hidden pointer-events-none -z-10 bg-scroll-container">
                <style>{`
                    .bg-scroll-container { --scroll-x: 0px; }
                    .parallax-far { transform: translateX(calc(var(--scroll-x) * -0.1)); }
                    .parallax-mid { transform: translateX(calc(var(--scroll-x) * -0.3)); }
                    .parallax-fore { transform: translateX(calc(var(--scroll-x) * -0.6)); }
                    .parallax-fast { transform: translateX(calc(var(--scroll-x) * -0.8)); }
                `}</style>
                {/* Red Sky Glow */}
                <div className="absolute inset-0 bg-gradient-to-t from-red-900/40 to-transparent" />
                
                {/* Searchlights */}
                <div className="absolute bottom-12 left-[20%] w-[100px] h-[800px] bg-gradient-to-t from-red-500/5 to-transparent blur-[10px] transform -rotate-12 translate-y-32" />
                <div className="absolute bottom-12 left-[70%] w-[100px] h-[800px] bg-gradient-to-t from-red-500/5 to-transparent blur-[10px] transform rotate-12 translate-y-32" />
                
                {/* Massive Fortress Wall */}
                <div className="absolute bottom-12 h-[350px] w-[200%] flex gap-2 parallax-far">
                   <div className="flex-1 bg-black/80 border-t-8 border-red-900 flex justify-around items-start pt-4">
                       {[...Array(5)].map((_, i) => (
                           <div key={i} className="w-16 h-32 bg-slate-900/50 border-2 border-red-900/50" />
                       ))}
                   </div>
                   <div className="flex-1 bg-black/80 border-t-8 border-red-900 flex justify-around items-start pt-4">
                       {[...Array(5)].map((_, i) => (
                           <div key={i} className="w-16 h-32 bg-slate-900/50 border-2 border-red-900/50" />
                       ))}
                   </div>
                </div>
            </div>
        );
    }

    // Default backdrop
    return <div className="absolute inset-0 bg-slate-900 -z-10 pointer-events-none" />;
}
