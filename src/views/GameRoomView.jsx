import React from 'react';
import CustomFontSetup from '../components/common/CustomFontSetup';
import { GameField } from '../components/game/GameField';
import { PremiumCard } from '../components/card/PremiumCard';
import { LayoutTester } from '../components/dev/LayoutTester';

export const GameRoomView = ({ gameState, user, gameRoomId, oppState, myState, isMyTurn, selectedAttackerIdx, setSelectedAttackerIdx, attackTarget, playCard, endTurn, handleSurrender, oppProfilePic, myProfilePic, coords, showTester, setShowTester, handleSliderChange, setGameState }) => {
  const canAttackHero = selectedAttackerIdx !== null && isMyTurn && oppState.field.length === 0;

  return (
    <div className="tcg-theme h-screen max-h-screen w-full text-slate-100 flex flex-col justify-between overflow-hidden relative select-none box-border" style={{ backgroundColor: coords.bgColor }}>
      <CustomFontSetup />

      {/* 상단 UI */}
      <div className="h-[14vh] w-full flex flex-col justify-start relative z-40 shrink-0">
        {/* 내부 패딩 및 요소를 vh 기반으로 반응형 확장 */}
        <div className="h-[8vh] min-h-[40px] w-full border-b border-white/10 px-[2.5vh] flex items-center justify-between backdrop-blur-sm shadow-md transition-colors" style={{ backgroundColor: coords.uiBarColor }}>
          <div className="flex items-center gap-[1vh]">
            <span className="text-[1.3vh] tracking-wider text-slate-300 font-medium">ROOM:</span>
            <span className="text-[1.4vh] text-cyan-400 font-bold">{gameRoomId?.split('-')[1] || 'Game'}</span>
          </div>
          <div className="flex items-center gap-[2.5vh]">
            <div className="text-right">
              <div className="text-[1.1vh] text-slate-300 font-semibold tracking-wider">OPPONENT</div>
              <div className="text-[1.5vh] text-white font-bold truncate max-w-[15vh]">{oppState.email.split('@')[0]}</div>
            </div>
            <div className="text-[1.4vh] text-slate-200 font-medium bg-black/15 px-[1.5vh] py-[0.6vh] rounded border border-white/5">
              덱: {oppState.deck?.length}장 | 패: {oppState.hand?.length}장
            </div>
          </div>
        </div>
        
        {/* 📐 상단 육각형: top-[8vh] -translate-y-1/2 연산으로 상단바 하단선에 '무조건 정확히 반만 걸치도록' 고정 및 크기 vh 최적화 */}
        <div className="absolute left-1/2 -translate-x-1/2 top-[8vh] -translate-y-1/2 flex items-center gap-[0.6vh] z-50 animate-gpu drop-shadow-lg">
          <div onClick={() => { if (canAttackHero) attackTarget('hero'); }} className={`w-[7.5vh] h-[8.66vh] bg-stone-900 relative overflow-hidden transition-all duration-200 ${canAttackHero ? 'cursor-pointer scale-110' : 'cursor-default'}`} style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}>
            <img src={oppProfilePic} alt="Opponent" className="w-full h-full object-cover" onError={(e) => { e.target.src = '/images/default_profile.png'; }} />
            {canAttackHero && <div className="absolute inset-0 bg-red-600/40 animate-pulse pointer-events-none"></div>}
          </div>
          <div className="w-[7.5vh] h-[8.66vh] bg-[#E07A5F] flex flex-col items-center justify-center relative cursor-default transition-all duration-200" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}>
            <span className="text-[1vh] text-stone-900/70 tracking-widest font-sans uppercase -mb-0.5 font-bold">HP</span>
            <span className="text-[3.2vh] font-black text-stone-950 tracking-tighter leading-none tcg-number">{oppState.hp}</span>
          </div>
        </div>
      </div>

      {/* 중앙 전장 */}
      <div className="h-[72vh] w-full flex flex-col relative shrink-0" onClick={() => setSelectedAttackerIdx(null)}>
        <div className="h-[24vh] w-full flex justify-center items-center relative z-10 shrink-0">
          {oppState.field.length === 0 && <div className="text-[1.4vh] text-slate-400/60 text-center absolute">상대 진영 비어있음</div>}
          <GameField fieldCards={oppState.field} isOpponentField={true} isMyTurn={isMyTurn} selectedAttackerIdx={selectedAttackerIdx} setSelectedAttackerIdx={setSelectedAttackerIdx} attackTarget={attackTarget} coords={coords} />
        </div>
        <div className="absolute top-[33.33%] w-full border-t-[2px] border-dashed border-white/5 z-0"></div>
        <div className="h-[24vh] w-full flex justify-center items-center relative z-20 shrink-0">
          {myState.field.length === 0 && <div className="text-[1.4vh] text-slate-400/60 text-center absolute">아군 진영 비어있음</div>}
          <GameField fieldCards={myState.field} isOpponentField={false} isMyTurn={isMyTurn} selectedAttackerIdx={selectedAttackerIdx} setSelectedAttackerIdx={setSelectedAttackerIdx} attackTarget={attackTarget} coords={coords} />
        </div>
        <div className="h-[24vh] w-full flex justify-center items-end pb-[2vh] overflow-visible px-[5vh] relative z-30 shrink-0 group/hand gap-[0.5vh]">
          {(myState.hand || []).map((card, idx) => {
            const isPlayable = isMyTurn && myState.energy >= card.cost;
            const wrapperClass = `relative transition-all duration-200 origin-bottom transform hover:scale-125 hover:mx-[1.5vh] z-10 hover:z-50 group/card ${isPlayable ? 'hover:-translate-y-[3vh] cursor-pointer' : 'cursor-default'}`;
            const cardClass = isPlayable ? 'border-sky-400 group-hover/card:border-cyan-300 shadow-xl shadow-sky-500/20 ring-2 ring-sky-400/40' : 'border-slate-950 opacity-70 group-hover/card:opacity-100';
            return (
              <div key={idx} className={wrapperClass} onClick={() => isMyTurn && playCard(idx)}>
                <div className="absolute inset-y-0 -inset-x-[3vh] z-50 bg-transparent"></div>
                <div className="pointer-events-none"><PremiumCard card={card} coords={coords} borderClass={cardClass} sizeClass="w-[13vh] shrink-0" /></div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 하단 UI */}
      <div className="h-[14vh] w-full flex flex-col justify-end relative z-40 shrink-0">
        {/* 📐 하단 육각형: bottom-[8vh] translate-y-1/2 연산으로 하단바 상단선에 정확히 반만 걸치도록 완전 결속 및 크기 vh 최적화 */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-[8vh] translate-y-1/2 flex items-center gap-[0.6vh] z-50 animate-gpu drop-shadow-lg">
          <div className="w-[7.5vh] h-[8.66vh] bg-stone-900 relative overflow-hidden cursor-default" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}>
            <img src={myProfilePic} alt="Me" className="w-full h-full object-cover" onError={(e) => { e.target.src = '/images/default_profile.png'; }} />
          </div>
          <div className="w-[7.5vh] h-[8.66vh] bg-[#3D5A80] flex flex-col items-center justify-center relative cursor-default" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}>
            <span className="text-[1vh] text-slate-200/80 tracking-widest font-sans uppercase -mb-0.5 font-bold">HP</span>
            <span className="text-[3.2vh] font-black text-white tracking-tighter leading-none tcg-number">{myState.hp}</span>
          </div>
        </div>
        
        {/* 하단 바 */}
        <div className="h-[8vh] min-h-[45px] w-full border-t border-white/10 px-[2.5vh] flex items-center justify-between backdrop-blur-sm shadow-md transition-colors relative" style={{ backgroundColor: coords.uiBarColor }}>
          {/* 왼쪽 정렬 레이아웃: 모든 간격, 패딩, 폰트를 vh화 하여 모니터 크기에 정비례하도록 수정 */}
          <div className="flex items-center gap-[2.5vh]">
            <button onClick={handleSurrender} className="px-[1.8vh] py-[0.7vh] bg-[#A35D5D]/40 border border-[#C27A7A]/30 text-rose-100 rounded text-[1.3vh] font-bold hover:bg-red-600 hover:border-red-500 hover:text-white transition-colors shrink-0">
              🏳️ 기권
            </button>
            <div className="text-[1.4vh] text-slate-100 font-semibold bg-black/15 px-[1.5vh] py-[0.6vh] rounded border border-white/5 shrink-0">
              덱: {myState.deck?.length}장 | 패: {myState.hand?.length}장
            </div>
            <span className="text-[1.5vh] font-bold text-white tracking-wide truncate max-w-[15vh]">
              {user.email.split('@')[0]}
            </span>
          </div>

          {/* 💡 마나 창: 옆으로 더 여유 있게 벌어지도록 정밀 조율 완료 (X축: left-[calc(50%+9vh)] / Y축: 바 내부 정중앙 안착 및 전면 vh 규격화) */}
          <div className="absolute left-[calc(50%+9vh)] top-1/2 -translate-y-1/2 flex items-center bg-black/40 border border-white/10 px-[1.5vh] py-[0.6vh] rounded-lg h-[3.8vh] gap-[1vh] shadow-inner backdrop-blur-md z-50">
            <span className="text-[1vh] text-cyan-400 font-black tracking-wider uppercase">MANA</span>
            <span className="text-[1.5vh] font-black text-white font-mono leading-none min-w-[3.5vh] text-center">{myState.energy}/{myState.maxEnergy}</span>
            <div className="w-[8vh] bg-black/50 h-[0.6vh] rounded-full overflow-hidden border border-black/40">
              <div className="bg-cyan-400 h-full transition-all duration-300 shadow-[0_0_5px_#22d3ee]" style={{ width: `${Math.min(100, (myState.energy / (myState.maxEnergy || 1)) * 100)}%` }}></div>
            </div>
          </div>

          {/* 오른쪽 정렬 레이아웃: 버튼 크기와 텍스트를 모니터 크기에 완벽 동기화 */}
          <div className="flex items-center gap-[2.5vh]">
            <div className="bg-black/20 border border-white/10 px-[1.5vh] py-[0.6vh] rounded text-[1.2vh] text-cyan-400 font-bold tracking-wide">
              TURN {gameState.globalTurn || 1}
            </div>
            <button 
              onClick={endTurn} 
              disabled={!isMyTurn} 
              className={`px-[2.5vh] py-[1vh] rounded-md text-[1.5vh] font-black tracking-wider transition-all shadow-lg ${
                isMyTurn 
                  ? 'bg-sky-500 text-white hover:bg-sky-400 hover:scale-105 active:scale-95 shadow-sky-500/20' 
                  : 'bg-black/20 text-slate-400/70 cursor-not-allowed border border-white/5'
              }`}
            >
              {isMyTurn ? '턴 종료 ⏱️' : '상대 턴'}
            </button>
          </div>
        </div>
      </div>

      {showTester && <LayoutTester coords={coords} handleSliderChange={handleSliderChange} setShowTester={setShowTester} />}
      {gameState.status === 'finished' && (
        <div className="fixed inset-0 bg-black/90 flex flex-col items-center justify-center space-y-4 z-[70]">
          <h2 className="text-[6vh] font-black tracking-widest text-cyan-400 drop-shadow-lg">{gameState.winner === user.uid ? '🎉 VICTORY' : '💀 DEFEAT'}</h2>
          <button onClick={() => setGameState(null)} className="px-[3vh] py-[1vh] bg-slate-700 text-white font-bold rounded-xl text-[1.6vh] hover:bg-slate-600 transition-colors">로비로 가기</button>
        </div>
      )}
    </div>
  );
};