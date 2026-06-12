import React, { useEffect, useState } from 'react';
import { useGameStore, ROLE_NAMES, ROLE_COLORS, SUPPLY_CHAIN, StationId, ClientGameState } from './store';

const cx = (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' ');

// HOME SCREEN
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
            <button onClick={clearError} className="ml-2 text-red-500 hover:text-red-300 text-lg leading-none">x</button>
          </div>
        )}

        <div className="mb-4">
          <label className="text-xs text-gray-400 mb-1.5 block font-medium">ชื่อผู้เล่น</label>
          <input
            className="w-full bg-gray-800 border border-gray-700 focus:border-orange-500 rounded-xl px-4 py-3 text-white placeholder-gray-600 outline-none transition-colors"
            placeholder="ชื่อของคุณ..."
            value={playerName}
            onChange={e => setPlayerName(e.target.value)}
            maxLength={20}
          />
        </div>

        {mode === 'menu' ? (
          <div className="space-y-3">
            <button onClick={createRoom} disabled={!connected || !playerName.trim()}
              className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 disabled:opacity-40 text-white font-bold py-3.5 rounded-xl transition-all active:scale-95">
              สร้างห้องใหม่
            </button>
            <button onClick={() => setMode('join')} disabled={!connected}
              className="w-full bg-gray-800 hover:bg-gray-700 disabled:opacity-40 border border-gray-700 text-white font-bold py-3.5 rounded-xl transition-all active:scale-95">
              เข้าร่วมห้อง
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <input
              className="w-full bg-gray-800 border border-gray-700 focus:border-blue-500 rounded-xl px-4 py-3 text-white placeholder-gray-600 outline-none text-center text-2xl font-black tracking-widest uppercase"
              placeholder="XXXX"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 4))}
              maxLength={4}
            />
            <button onClick={() => joinRoom(joinCode)} disabled={!connected || !playerName.trim() || joinCode.length < 4}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-400 hover:to-cyan-500 disabled:opacity-40 text-white font-bold py-3.5 rounded-xl transition-all active:scale-95">
              เข้าห้อง
            </button>
            <button onClick={() => setMode('menu')} className="w-full text-gray-500 hover:text-gray-300 py-2 text-sm">กลับ</button>
          </div>
        )}

        <p className="text-center text-gray-600 text-xs mt-6">เกม 20 รอบ - ต้นทุนต่ำสุดชนะ</p>
      </div>
    </div>
  );
}

// LOBBY SCREEN
function LobbyScreen() {
  const { room, chooseRole, startGame, leaveRoom } = useGameStore();
  if (!room) return null;
  const { code, players, myRole, myName, host } = room;
  const takenRoles = new Set(players.map(p => p.role).filter(Boolean));
  const isHost = myName === host;

  const roleEmoji: Record<StationId, string> = { restaurant: '&#127831;', distributor: '&#128666;', factory: '&#127981;', farm: '&#127806;' };

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
                <div className="text-white text-sm font-medium truncate">
                  {p.name} {p.name === host && <span className="text-yellow-500 text-xs">(host)</span>}
                </div>
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
                    className={cx('p-3 rounded-xl border text-left transition-all', taken
                      ? 'border-gray-700 bg-gray-800/30 opacity-40 cursor-not-allowed'
                      : `bg-gradient-to-br ${ROLE_COLORS[role]} border-transparent text-white hover:brightness-110 active:scale-95`)}>
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
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 disabled:opacity-40 text-white font-bold py-3.5 rounded-xl transition-all active:scale-95">
              เริ่มเกม {players.filter(p => p.role).length < 4 ? '(bot เติม role ที่เหลือ)' : ''}
            </button>
          ) : (
            <div className="text-center text-gray-400 text-sm py-3">รอ host เริ่มเกม...</div>
          )}
          <button onClick={leaveRoom} className="w-full text-gray-500 hover:text-gray-300 py-2 text-sm">ออกจากห้อง</button>
        </div>
      </div>
    </div>
  );
}

// CHAIN OVERVIEW
function ChainOverview({ gs }: { gs: ClientGameState }) {
  const roleEmoji: Record<StationId, string> = { restaurant: '&#127831;', distributor: '&#128666;', factory: '&#127981;', farm: '&#127806;' };
  return (
    <div className="flex items-center justify-between gap-1 px-2 py-2 bg-black/30 rounded-xl border border-white/5">
      {SUPPLY_CHAIN.map((role, i) => {
        const s = gs.stations[role];
        const isMe = role === gs.myRole;
        return (
          <React.Fragment key={role}>
            <div className={cx('flex flex-col items-center gap-0.5', isMe && 'ring-1 ring-orange-400 rounded-lg px-1 py-0.5')}>
              <span className="text-base">{roleEmoji[role]}</span>
              <span className="text-[9px] text-gray-400">{s.stock}</span>
            </div>
            {i < SUPPLY_CHAIN.length - 1 && <span className="text-gray-700 text-xs">-&gt;</span>}
          </React.Fragment>
        );
      })}
      <div className="flex flex-col items-center gap-0.5 ml-1">
        <span className="text-base">&#128101;</span>
        <span className="text-[9px] text-gray-400">{gs.lastDemand}</span>
      </div>
    </div>
  );
}

// GAME SCREEN
function GameScreen() {
  const { room, orderInput, setOrderInput, submitOrder, leaveRoom } = useGameStore();
  if (!room || !room.gameState) return null;
  const gs = room.gameState;
  const myRole = gs.myRole;
  const myStation = gs.stations[myRole];
  const progress = Math.round(((gs.turn - 1) / gs.maxTurns) * 100);

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-3">
      <div className="w-full max-w-sm flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white font-black text-lg leading-tight">{ROLE_NAMES[myRole]}</h2>
            <p className="text-gray-500 text-xs">ห้อง {room.code}</p>
          </div>
          <div className="text-right">
            <div className="text-orange-400 font-black text-lg">รอบ {gs.turn}<span className="text-gray-600 font-normal text-sm">/{gs.maxTurns}</span></div>
            <div className="text-gray-500 text-xs">{gs.submittedCount}/{gs.totalPlayers} ส่งแล้ว</div>
          </div>
        </div>

        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>

        <ChainOverview gs={gs} />

        <div className={cx('rounded-2xl p-4 bg-gradient-to-br border border-white/10', ROLE_COLORS[myRole])}>
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className="text-white/80 text-xs font-medium">สต็อก</div>
              <div className="text-white font-black text-4xl">{myStation.stock}</div>
            </div>
            <div className="text-right">
              <div className="text-white/80 text-xs font-medium">คงค้าง</div>
              <div className={cx('font-black text-4xl', myStation.backorder > 0 ? 'text-red-300' : 'text-white/30')}>{myStation.backorder}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-black/20 rounded-xl p-2">
              <div className="text-white/60 text-xs">รับสินค้า</div>
              <div className="text-white font-bold text-lg">+{myStation.incomingShipment}</div>
            </div>
            <div className="bg-black/20 rounded-xl p-2">
              <div className="text-white/60 text-xs">ออเดอร์เข้า</div>
              <div className="text-white font-bold text-lg">
                {myRole === 'restaurant' && gs.customerDemand !== undefined ? gs.customerDemand : (myStation.incomingOrder ?? '?')}
              </div>
            </div>
          </div>
          <div className="mt-2 bg-black/20 rounded-xl p-2 flex justify-between items-center">
            <span className="text-white/60 text-xs">ต้นทุนสะสม</span>
            <span className="text-yellow-300 font-black text-lg">${myStation.cost}</span>
          </div>
        </div>

        {!gs.mySubmitted ? (
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4">
            <div className="text-gray-400 text-xs font-medium mb-3">สั่งซื้อจาก supplier (หน่วย)</div>
            <div className="flex items-center gap-3 mb-3">
              <button onClick={() => setOrderInput(orderInput - 1)}
                className="w-12 h-12 bg-gray-700 hover:bg-gray-600 active:scale-95 rounded-xl text-white font-black text-xl transition-all">-</button>
              <input type="number" min={0} max={99} value={orderInput}
                onChange={e => setOrderInput(parseInt(e.target.value) || 0)}
                className="flex-1 bg-gray-800 border border-gray-600 rounded-xl text-center text-white font-black text-3xl py-2 outline-none focus:border-orange-500 transition-colors" />
              <button onClick={() => setOrderInput(orderInput + 1)}
                className="w-12 h-12 bg-gray-700 hover:bg-gray-600 active:scale-95 rounded-xl text-white font-black text-xl transition-all">+</button>
            </div>
            <button onClick={submitOrder}
              className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white font-black py-3.5 rounded-xl text-base transition-all active:scale-95">
              ส่งออเดอร์
            </button>
          </div>
        ) : (
          <div className="bg-green-900/30 border border-green-700/50 rounded-2xl p-4 text-center">
            <div className="text-green-400 font-bold text-lg">ส่งออเดอร์แล้ว!</div>
            <div className="text-gray-400 text-sm mt-1">รอผู้เล่นอื่น... ({gs.submittedCount}/{gs.totalPlayers})</div>
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          {room.players.map((p, i) => (
            <div key={i} className={cx('flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium',
              p.submitted ? 'bg-green-900/40 border-green-700/50 text-green-400' : 'bg-gray-800 border-gray-700 text-gray-400')}>
              <span>{p.name.replace('bot_', '')}</span>
              {p.submitted && <span>(ok)</span>}
            </div>
          ))}
        </div>

        <button onClick={leaveRoom} className="text-gray-600 hover:text-gray-400 text-xs text-center">ออกจากเกม</button>
      </div>
    </div>
  );
}

// GAME OVER SCREEN
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
            <div key={s.role} className={cx('flex items-center gap-3 p-4 rounded-2xl border',
              i === 0 ? 'bg-yellow-900/30 border-yellow-600/50' : 'bg-gray-800/60 border-gray-700/50')}>
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
          <div className="text-gray-500 text-xs mt-1">
            {totalCost < 500 ? 'ทีมเล่นได้ดีมาก!' : totalCost < 1000 ? 'พอใช้ได้' : 'Bullwhip Effect รุนแรงมาก!'}
          </div>
        </div>

        <button onClick={leaveRoom}
          className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white font-bold py-3.5 rounded-xl transition-all active:scale-95">
          เล่นใหม่
        </button>
      </div>
    </div>
  );
}

// ROOT
export default function App() {
  const { screen, room } = useGameStore();
  if (screen === 'home') return <HomeScreen />;
  if (!room) return <HomeScreen />;
  if (room.phase === 'finished') return <GameOverScreen />;
  if (room.phase === 'playing') return <GameScreen />;
  return <LobbyScreen />;
}
