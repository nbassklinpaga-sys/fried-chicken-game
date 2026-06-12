import { useEffect, useState, useRef } from 'react';
import { useGameStore, ROLE_NAMES, ROLE_COLORS, SUPPLY_CHAIN, StationId } from './store';

const cx = (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' ');

const MAP_CSS = `
@keyframes blow-wind {
  0%   { transform: translate(0, 0) scale(var(--sc)); opacity: 0; }
  10%  { opacity: 0.8; }
  90%  { opacity: 0.8; }
  100% { transform: translate(110vw, var(--dy)) scale(var(--sc)); opacity: 0; }
}
@keyframes flow-water {
  0%   { background-position: 200% 0; opacity: 0.1; transform: scaleY(0.3) translateX(0); }
  50%  { opacity: 0.4; }
  100% { background-position: -200% 0; opacity: 0.1; transform: scaleY(0.3) translateX(20px); }
}
@keyframes smoke-rise {
  0%   { transform: translate(0,0) scale(1); opacity: 0.8; }
  100% { transform: translate(-20px,-60px) scale(3); opacity: 0; }
}
@keyframes pulse-light {
  0%   { transform: scale(1); opacity: 0.2; }
  100% { transform: scale(1.5); opacity: 0.6; }
}
@keyframes walk1 {
  0%   { transform: translate(0,0); opacity:0; }
  10%  { opacity:1; }
  25%  { transform: translate(20px,10px); }
  50%  { transform: translate(40px,5px); }
  75%  { transform: translate(50px,20px); }
  90%  { opacity:1; }
  100% { transform: translate(60px,25px); opacity:0; }
}
@keyframes walk2 {
  0%   { transform: translate(0,0); opacity:0; }
  10%  { opacity:1; }
  90%  { opacity:1; }
  100% { transform: translate(-50px,15px); opacity:0; }
}
`;

function MapOverlay() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // House lights (static)
    const lights = [[30,60],[70,55],[45,65]];
    lights.forEach(([x,y]) => {
      const l = document.createElement('div');
      l.style.cssText = `position:absolute;left:${x}%;top:${y}%;width:20px;height:20px;background:rgba(255,204,0,0.4);border-radius:50%;filter:blur(6px);animation:pulse-light ${2+Math.random()*2}s infinite alternate;pointer-events:none;z-index:7;`;
      el.appendChild(l);
    });

    // Sakura petals
    const spawnPetal = () => {
      const p = document.createElement('div');
      const size = 2 + Math.random() * 4;
      const dy = (Math.random() * 150 - 75);
      const sc = 0.5 + Math.random();
      const dur = 6 + Math.random() * 6;
      p.style.cssText = `position:absolute;left:-20px;top:${Math.random()*100}%;width:${size*(1+Math.random()*0.5)}px;height:${size}px;background:#ffa8ba;border-radius:50%;opacity:0.6;filter:blur(0.5px);pointer-events:none;z-index:10;--dy:${dy}px;--sc:${sc};animation:blow-wind ${dur}s linear forwards;`;
      el.appendChild(p);
      setTimeout(() => p.remove(), dur * 1000);
    };
    const petalInterval = setInterval(spawnPetal, 150);
    for (let i = 0; i < 40; i++) setTimeout(spawnPetal, Math.random() * 6000);

    // Factory smoke
    const spawnSmoke = (xPct: number, yPct: number) => {
      const s = document.createElement('div');
      const size = 15 + Math.random() * 10;
      s.style.cssText = `position:absolute;left:calc(${xPct}% + ${Math.random()*10-5}px);top:calc(${yPct}% + ${Math.random()*5-2}px);width:${size}px;height:${size}px;background:rgba(240,240,240,0.7);border-radius:50%;filter:blur(4px);pointer-events:none;animation:smoke-rise 3s forwards ease-in;z-index:8;`;
      el.appendChild(s);
      setTimeout(() => s.remove(), 3000);
    };
    const smokeInterval = setInterval(() => {
      spawnSmoke(35, 45);
      spawnSmoke(65, 40);
    }, 600);

    // People & chickens
    const spawnEntity = (type: 'person'|'chicken') => {
      const e = document.createElement('div');
      const x = 30 + Math.random() * 40;
      const y = 50 + Math.random() * 20;
      const dur = 8 + Math.random() * 7;
      const path = Math.random() > 0.5 ? 'walk1' : 'walk2';
      const color = type === 'person' ? '#3498db' : '#f1c40f';
      const sz = type === 'person' ? 3 : 2;
      e.style.cssText = `position:absolute;left:${x}%;top:${y}%;width:${sz}px;height:${sz}px;background:${color};border-radius:50%;pointer-events:none;z-index:6;box-shadow:0 0 2px rgba(0,0,0,0.5);animation:${path} ${dur}s linear forwards;`;
      el.appendChild(e);
      setTimeout(() => e.remove(), dur * 1000);
    };
    const personInterval = setInterval(() => spawnEntity('person'), 1500);
    const chickenInterval = setInterval(() => spawnEntity('chicken'), 1000);

    return () => {
      clearInterval(petalInterval);
      clearInterval(smokeInterval);
      clearInterval(personInterval);
      clearInterval(chickenInterval);
    };
  }, []);

  return (
    <>
      {/* Water ripples */}
      <div style={{position:'absolute',bottom:'15%',left:'10%',width:'40%',height:'100px',background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)',backgroundSize:'200% 100%',borderRadius:'50%',filter:'blur(8px)',animation:'flow-water 3s infinite linear',pointerEvents:'none',zIndex:5}} />
      <div style={{position:'absolute',bottom:'5%',left:'50%',width:'40%',height:'100px',background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)',backgroundSize:'200% 100%',borderRadius:'50%',filter:'blur(8px)',animation:'flow-water 3s 1.5s infinite linear',pointerEvents:'none',zIndex:5}} />
      <div ref={containerRef} style={{position:'absolute',inset:0,pointerEvents:'none',overflow:'hidden'}} />
    </>
  );
}

const MAP_POSITIONS: Record<StationId, { top: string; left: string }> = {
  farm:        { top: '6%',  left: '3%'  },
  factory:     { top: '6%',  left: '55%' },
  distributor: { top: '50%', left: '55%' },
  restaurant:  { top: '50%', left: '3%'  },
};

function HomeScreen() {
  const { playerName, setPlayerName, connect, connected, error, clearError, createRoom, joinRoom } = useGameStore();
  const [joinCode, setJoinCode] = useState('');
  const [mode, setMode] = useState<'menu' | 'join'>('menu');
  useEffect(() => { connect(); }, []);
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-6xl mb-2">&#127831;</div>
          <h1 className="text-3xl font-black text-orange-400 tracking-tight">Fried Chicken</h1>
          <p className="text-gray-400 text-sm mt-1">Supply Chain Game</p>
          <div className={cx('inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full text-xs font-medium', connected ? 'bg-green-900/50 text-green-400' : 'bg-gray-800 text-gray-500')}>
            <span className={cx('w-1.5 h-1.5 rounded-full', connected ? 'bg-green-400 animate-pulse' : 'bg-gray-600')} />
            {connected ? 'Server Online' : 'Connecting...'}
          </div>
        </div>
        {error && (
          <div className="mb-4 p-3 bg-red-900/40 border border-red-700/50 rounded-xl text-red-300 text-sm flex justify-between items-start">
            <span>{error}</span>
            <button onClick={clearError} className="ml-2 text-red-500 text-lg leading-none">x</button>
          </div>
        )}
        <div className="mb-4">
          <label className="text-xs text-gray-400 mb-1.5 block font-medium">ชื่อผู้เล่น</label>
          <input className="w-full bg-gray-800 border border-gray-700 focus:border-orange-500 rounded-xl px-4 py-3 text-white placeholder-gray-600 outline-none transition-colors"
            placeholder="ชื่อของคุณ..." value={playerName} onChange={e => setPlayerName(e.target.value)} maxLength={20} />
        </div>
        {mode === 'menu' ? (
          <div className="space-y-3">
            <button onClick={createRoom} disabled={!connected || !playerName.trim()}
              className="w-full bg-gradient-to-r from-orange-500 to-red-600 disabled:opacity-40 text-white font-bold py-3.5 rounded-xl active:scale-95">สร้างห้องใหม่</button>
            <button onClick={() => setMode('join')} disabled={!connected}
              className="w-full bg-gray-800 disabled:opacity-40 border border-gray-700 text-white font-bold py-3.5 rounded-xl active:scale-95">เข้าร่วมห้อง</button>
          </div>
        ) : (
          <div className="space-y-3">
            <input className="w-full bg-gray-800 border border-gray-700 focus:border-blue-500 rounded-xl px-4 py-3 text-white placeholder-gray-600 outline-none text-center text-2xl font-black tracking-widest uppercase"
              placeholder="XXXX" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 4))} maxLength={4} />
            <button onClick={() => joinRoom(joinCode)} disabled={!connected || !playerName.trim() || joinCode.length < 4}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 disabled:opacity-40 text-white font-bold py-3.5 rounded-xl active:scale-95">เข้าห้อง</button>
            <button onClick={() => setMode('menu')} className="w-full text-gray-500 py-2 text-sm">กลับ</button>
          </div>
        )}
        <p className="text-center text-gray-600 text-xs mt-6">เกม 20 รอบ - ต้นทุนต่ำสุดชนะ</p>
      </div>
    </div>
  );
}

function LobbyScreen() {
  const { room, chooseRole, startGame, leaveRoom } = useGameStore();
  if (!room) return null;
  const { code, players, myRole, myName, host } = room;
  const takenRoles = new Set(players.map(p => p.role).filter(Boolean));
  const isHost = myName === host;
  const roleEmoji: Record<StationId, string> = { restaurant: '\u{1F357}', distributor: '\u{1F69A}', factory: '\u{1F3ED}', farm: '\u{1F33E}' };
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">&#127831;</div>
          <h2 className="text-xl font-black text-white">ห้องเกม</h2>
          <div className="mt-2 flex items-center justify-center gap-2">
            <span className="text-gray-400 text-sm">รหัสห้อง:</span>
            <span className="bg-gray-800 border border-gray-600 text-orange-400 font-black text-xl px-4 py-1 rounded-lg tracking-widest">{code}</span>
          </div>
          <p className="text-gray-500 text-xs mt-2">แชร์รหัสให้เพื่อน</p>
        </div>
        <div className="mb-5 space-y-2">
          {players.map((p, i) => (
            <div key={i} className="flex items-center gap-3 bg-gray-800/60 rounded-xl px-3 py-2.5 border border-gray-700/50">
              <span className="text-lg">{p.role ? roleEmoji[p.role] : '?'}</span>
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-medium truncate">{p.name} {p.name === host && <span className="text-yellow-500 text-xs">(host)</span>}</div>
                <div className="text-gray-400 text-xs">{p.role ? ROLE_NAMES[p.role] : 'ยังไม่เลือก role'}</div>
              </div>
              {p.name === myName && <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full border border-orange-500/30">คุณ</span>}
            </div>
          ))}
        </div>
        {!myRole && (
          <div className="mb-4">
            <p className="text-gray-400 text-xs font-medium mb-2">เลือก Role ของคุณ</p>
            <div className="grid grid-cols-2 gap-2">
              {SUPPLY_CHAIN.map(role => {
                const taken = takenRoles.has(role);
                return (
                  <button key={role} onClick={() => !taken && chooseRole(role)} disabled={taken}
                    className={cx('p-3 rounded-xl border text-left transition-all', taken ? 'border-gray-700 bg-gray-800/30 opacity-40 cursor-not-allowed' : `bg-gradient-to-br ${ROLE_COLORS[role]} border-transparent text-white hover:brightness-110 active:scale-95`)}>
                    <div className="text-2xl">{roleEmoji[role]}</div>
                    <div className="text-xs font-bold mt-1">{ROLE_NAMES[role]}</div>
                    {taken && <div className="text-xs opacity-70 mt-0.5">มีคนเลือกแล้ว</div>}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {myRole && (
          <div className={cx('mb-4 p-3 rounded-xl bg-gradient-to-r border border-white/10', ROLE_COLORS[myRole])}>
            <div className="text-white font-bold text-sm">Role ของคุณ: {ROLE_NAMES[myRole]}</div>
          </div>
        )}
        <div className="space-y-2">
          {isHost ? (
            <button onClick={startGame} disabled={!players.some(p => p.role)}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 disabled:opacity-40 text-white font-bold py-3.5 rounded-xl active:scale-95">เริ่มเกม</button>
          ) : (
            <div className="text-center text-gray-400 text-sm py-3">รอ host เริ่มเกม...</div>
          )}
          <button onClick={leaveRoom} className="w-full text-gray-500 py-2 text-sm">ออกจากห้อง</button>
        </div>
      </div>
    </div>
  );
}

function GameScreen() {
  const { room, orderInput, setOrderInput, submitOrder, leaveRoom } = useGameStore();
  if (!room || !room.gameState) return null;
  const gs = room.gameState;
  const myRole = gs.myRole;
  const myStation = gs.stations[myRole];
  const progress = Math.round(((gs.turn - 1) / gs.maxTurns) * 100);
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black flex flex-col">
      <style>{MAP_CSS}</style>
      {/* MAP */}
      <div className="relative flex-1 overflow-hidden min-h-0">
        <div className="absolute inset-0" style={{ backgroundImage: 'url(/bg.png)', backgroundSize: 'cover', backgroundPosition: 'center top' }} />
        <MapOverlay />
        {/* STOCK LABELS */}
        {SUPPLY_CHAIN.map(role => {
          const s = gs.stations[role];
          const pos = MAP_POSITIONS[role];
          const isMe = role === myRole;
          return (
            <div key={role} style={{ position: 'absolute', top: pos.top, left: pos.left, zIndex: 20 }}>
              <div className={cx('rounded-xl px-2 py-1 text-white text-xs font-bold shadow-xl border backdrop-blur-sm',
                isMe ? 'bg-orange-500/90 border-orange-300' : 'bg-black/75 border-white/20')}>
                <div className="font-black text-sm leading-tight">{ROLE_NAMES[role]}</div>
                <div>&#x1F4E6; <span className="text-yellow-300 font-black">{s.stock}</span></div>
                {s.backorder > 0 && <div className="text-red-300">&#9888; {s.backorder}</div>}
                <div className="text-gray-300">${s.cost}</div>
              </div>
            </div>
          );
        })}
        {/* TOP BAR */}
        <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-3 py-2 bg-black/60 backdrop-blur-sm">
          <div>
            <span className="text-white font-black text-sm">{ROLE_NAMES[myRole]}</span>
            <span className="text-gray-400 text-xs ml-2">ห้อง {room.code}</span>
          </div>
          <div className="text-orange-400 font-black text-sm">รอบ {gs.turn}/{gs.maxTurns}</div>
        </div>
        <div className="absolute top-9 left-0 right-0 z-30 h-1 bg-gray-800/80">
          <div className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>
      {/* BOTTOM PANEL */}
      <div className="bg-gray-950 border-t border-gray-700 p-3 z-30 flex-shrink-0">
        <div className={cx('rounded-xl p-3 mb-3 bg-gradient-to-r border border-white/10', ROLE_COLORS[myRole])}>
          <div className="flex justify-between items-center">
            <div className="flex gap-4">
              <div><div className="text-white/70 text-xs">สต็อก</div><div className="text-white font-black text-2xl">{myStation.stock}</div></div>
              <div><div className="text-white/70 text-xs">คงค้าง</div><div className={cx('font-black text-2xl', myStation.backorder > 0 ? 'text-red-300' : 'text-white/30')}>{myStation.backorder}</div></div>
              <div><div className="text-white/70 text-xs">รับ</div><div className="text-white font-bold text-2xl">+{myStation.incomingShipment}</div></div>
            </div>
            <div className="text-right">
              <div className="text-white/70 text-xs">ต้นทุน</div>
              <div className="text-yellow-300 font-black text-xl">${myStation.cost}</div>
            </div>
          </div>
        </div>
        {!gs.mySubmitted ? (
          <div className="flex items-center gap-2">
            <button onClick={() => setOrderInput(orderInput - 1)} className="w-11 h-11 bg-gray-700 rounded-xl text-white font-black text-xl flex-shrink-0 active:scale-95">-</button>
            <input type="number" min={0} max={99} value={orderInput} onChange={e => setOrderInput(parseInt(e.target.value) || 0)}
              className="flex-1 bg-gray-800 border border-gray-600 rounded-xl text-center text-white font-black text-2xl py-2 outline-none focus:border-orange-500 min-w-0" />
            <button onClick={() => setOrderInput(orderInput + 1)} className="w-11 h-11 bg-gray-700 rounded-xl text-white font-black text-xl flex-shrink-0 active:scale-95">+</button>
            <button onClick={submitOrder} className="bg-gradient-to-r from-orange-500 to-red-600 text-white font-black px-5 py-3 rounded-xl active:scale-95 whitespace-nowrap flex-shrink-0">ส่ง!</button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="text-green-400 font-bold text-sm">&#10003; ส่งแล้ว — รอ {gs.submittedCount}/{gs.totalPlayers}</div>
            <button onClick={leaveRoom} className="text-gray-600 text-xs">ออก</button>
          </div>
        )}
        <div className="flex gap-2 flex-wrap mt-2">
          {room.players.map((p, i) => (
            <div key={i} className={cx('px-2 py-1 rounded-lg border text-xs', p.submitted ? 'bg-green-900/40 border-green-700/50 text-green-400' : 'bg-gray-800 border-gray-700 text-gray-400')}>
              {p.name.replace('Bot (', '').replace(')', '')} {p.submitted && '(ok)'}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function GameOverScreen() {
  const { room, leaveRoom } = useGameStore();
  if (!room || !room.gameState) return null;
  const gs = room.gameState;
  const scores = SUPPLY_CHAIN.map(role => {
    const player = room.players.find(p => p.role === role);
    return { role, name: player?.name ?? ROLE_NAMES[role], cost: gs.stations[role].cost };
  }).sort((a, b) => a.cost - b.cost);
  const medals = ['1st', '2nd', '3rd', '4th'];
  const totalCost = scores.reduce((sum, s) => sum + s.cost, 0);
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-6xl mb-2">&#127942;</div>
          <h1 className="text-3xl font-black text-white">เกมจบแล้ว!</h1>
          <p className="text-gray-400 text-sm mt-1">ผลคะแนนรวม {gs.maxTurns} รอบ</p>
        </div>
        <div className="space-y-3 mb-8">
          {scores.map((s, i) => (
            <div key={s.role} className={cx('flex items-center gap-3 p-4 rounded-2xl border', i === 0 ? 'bg-yellow-900/30 border-yellow-600/50' : 'bg-gray-800/60 border-gray-700/50')}>
              <span className="text-2xl font-black text-gray-400">{medals[i]}</span>
              <div className="flex-1">
                <div className="text-white font-bold text-sm">{s.name}</div>
                <div className="text-gray-400 text-xs">{ROLE_NAMES[s.role]}</div>
              </div>
              <div className="text-right">
                <div className={cx('font-black text-lg', i === 0 ? 'text-yellow-400' : 'text-white')}>${s.cost.toFixed(1)}</div>
                <div className="text-gray-500 text-xs">ต้นทุน</div>
              </div>
            </div>
          ))}
        </div>
        <div className="bg-gray-800/60 rounded-2xl p-4 mb-6 border border-gray-700/50">
          <div className="text-gray-400 text-xs font-medium mb-2">ต้นทุนรวมทั้ง supply chain</div>
          <div className="text-white font-black text-2xl">${totalCost.toFixed(1)}</div>
          <div className="text-gray-500 text-xs mt-1">{totalCost < 500 ? 'ทีมเล่นได้ดีมาก!' : totalCost < 1000 ? 'พอใช้ได้' : 'Bullwhip Effect รุนแรงมาก!'}</div>
        </div>
        <button onClick={leaveRoom} className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold py-3.5 rounded-xl active:scale-95">เล่นใหม่</button>
      </div>
    </div>
  );
}

export default function App() {
  const { screen, room } = useGameStore();
  if (screen === 'home') return <HomeScreen />;
  if (!room) return <HomeScreen />;
  if (room.phase === 'finished') return <GameOverScreen />;
  if (room.phase === 'playing') return <GameScreen />;
  return <LobbyScreen />;
}
