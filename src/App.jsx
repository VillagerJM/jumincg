import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase'; 
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, updateDoc, onSnapshot, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';

// 엑셀에서 추출한 고정 덱 목록 (20장)
const DEFAULT_DECK = [
  { id: 'k1', name: '용맹한 기사', cost: 1, atk: 1, hp: 2, ability: '등장: 내 다른 카드 한 장에 공격력을 1 부여합니다.', tag: '등장' },
  { id: 'k2', name: '멍멍이', cost: 1, atk: 1, hp: 3, ability: '능력 없음', tag: '능력 없음' },
  { id: 'k3', name: '유령', cost: 4, atk: 0, hp: 1, ability: '이 카드는 처치되지 않습니다.', tag: '패시브' },
  { id: 'k4', name: '강령술사', cost: 4, atk: 4, hp: 4, ability: '등장: 부활', tag: '등장' },
  { id: 'k5', name: '바람 마법사', cost: 3, atk: 3, hp: 4, ability: '등장: 바운스', tag: '등장' },
  { id: 'k6', name: '도적단', cost: 2, atk: 2, hp: 2, ability: '등장: 훔치기', tag: '등장' },
  { id: 'k7', name: '겁쟁이 기사', cost: 2, atk: 1, hp: 3, ability: '등장: 공격력+1', tag: '등장' },
  { id: 'd7', name: '7번 드래곤', cost: 7, atk: 7, hp: 7, ability: '능력 없음', tag: '능력 없음' },
  { id: 'd6', name: '6번 드래곤', cost: 6, atk: 6, hp: 6, ability: '능력 없음', tag: '능력 없음' },
  { id: 'd5', name: '5번 드래곤', cost: 5, atk: 5, hp: 5, ability: '능력 없음', tag: '능력 없음' },
  { id: 'd4', name: '4번 드래곤', cost: 4, atk: 4, hp: 4, ability: '능력 없음', tag: '능력 없음' },
  { id: 'd3', name: '3번 드래곤', cost: 3, atk: 3, hp: 3, ability: '능력 없음', tag: '능력 없음' },
  { id: 'd2', name: '2번 드래곤', cost: 2, atk: 2, hp: 2, ability: '능력 없음', tag: '능력 없음' },
  { id: 'd1', name: '1번 드래곤', cost: 1, atk: 1, hp: 1, ability: '능력 없음', tag: '능력 없음' },
  { id: 'k8', name: '음악인', cost: 7, atk: 4, hp: 6, ability: '등장: 비용 감소', tag: '등장' },
  // 20장을 채우기 위한 드래곤 및 기본 카드 복사본들
  { id: 'd1_2', name: '1번 드래곤', cost: 1, atk: 1, hp: 1, ability: '능력 없음', tag: '능력 없음' },
  { id: 'd2_2', name: '2번 드래곤', cost: 2, atk: 2, hp: 2, ability: '능력 없음', tag: '능력 없음' },
  { id: 'd3_2', name: '3번 드래곤', cost: 3, atk: 3, hp: 3, ability: '능력 없음', tag: '능력 없음' },
  { id: 'k2_2', name: '멍멍이', cost: 1, atk: 1, hp: 3, ability: '능력 없음', tag: '능력 없음' },
  { id: 'k6_2', name: '도적단', cost: 2, atk: 2, hp: 2, ability: '등장: 훔치기', tag: '등장' },
];

// 덱 셔플 함수
const shuffleDeck = (deck) => {
  return [...deck].sort(() => Math.random() - 0.5).map((card, idx) => ({ ...card, instanceId: `${card.id}-${idx}-${Date.now()}` }));
};

export default function App() {
  const [user, setUser] = useState(null);
  const [matching, setMatching] = useState(false);
  const [gameRoomId, setGameRoomId] = useState(null);
  const [gameState, setGameState] = useState(null); // Firestore 실시간 데이터 반영

  // 선택된 아군 카드 공격 대상을 고르기 위한 임시 상태
  const [selectedAttackerIdx, setSelectedAttackerIdx] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // 구글 로그인
  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  // 🔄 실시간 매칭 로직
  const startMatching = async () => {
    if (!user) return;
    setMatching(true);

    const matchQueueRef = collection(db, 'matchQueue');
    const q = query(matchQueueRef, where('status', '==', 'waiting'));
    const querySnapshot = await getDocs(q);

    // 대기 중인 유저가 있다면 매칭 성사!
    if (!querySnapshot.empty) {
      const opponentDoc = querySnapshot.docs[0];
      const opponentData = opponentDoc.data();

      if (opponentData.uid !== user.uid) {
        const roomId = `room-${Date.now()}`;
        
        // 선후공 결정 (50% 확률)
        const isUserFirst = Math.random() > 0.5;

        // 게임 룸 데이터 초기화 생성
        const roomRef = doc(db, 'gameRooms', roomId);
        const playerADeck = shuffleDeck(DEFAULT_DECK);
        const playerBDeck = shuffleDeck(DEFAULT_DECK);

        await setDoc(roomRef, {
          playerA: {
            uid: user.uid,
            email: user.email,
            hp: 30,
            energy: 1,
            maxEnergy: 1,
            turnCount: 1,
            field: [],
            hand: playerADeck.splice(0, 3), // 시작 카드 3장
            deck: playerADeck,
          },
          playerB: {
            uid: opponentData.uid,
            email: opponentData.email,
            hp: 30,
            energy: 0,
            maxEnergy: 0,
            turnCount: 1,
            field: [],
            hand: playerBDeck.splice(0, 4), // 후공은 카드 4장으로 시작
            deck: playerBDeck,
          },
          currentTurnUid: isUserFirst ? user.uid : opponentData.uid,
          winner: null,
          status: 'playing'
        });

        // 대기열에서 상대방 제거
        await deleteDoc(doc(db, 'matchQueue', opponentDoc.id));
        setGameRoomId(roomId);
        setMatching(false);
        listenToGameRoom(roomId);
        return;
      }
    }

    // 대기자가 없으면 내가 대기열에 등록
    await setDoc(doc(db, 'matchQueue', user.uid), {
      uid: user.uid,
      email: user.email,
      status: 'waiting',
      createdAt: Date.now()
    });

    // 내 문서가 변경되는지 (상대에 의해 매칭이 잡혀 방이 생기는지) 감시
    const unsubscribe = onSnapshot(doc(db, 'matchQueue', user.uid), async (snap) => {
      if (snap.exists() && snap.data().status === 'matched') {
        const roomId = snap.data().roomId;
        setGameRoomId(roomId);
        setMatching(false);
        listenToGameRoom(roomId);
        unsubscribe();
      }
    });
  };

  // 🎮 게임 룸 실시간 동기화 리스너
  const listenToGameRoom = (roomId) => {
    onSnapshot(doc(db, 'gameRooms', roomId), (snap) => {
      if (snap.exists()) {
        setGameState(snap.data());
      }
    });
  };

  // 내 역할 찾기 (playerA 인지 playerB 인지)
  const getRole = () => {
    if (!gameState || !user) return null;
    return gameState.playerA.uid === user.uid ? 'playerA' : 'playerB';
  };
  const getOpponentRole = () => {
    return getRole() === 'playerA' ? 'playerB' : 'playerA';
  };

  // 턴 종료 처리 및 에너지 증가 시스템
  const endTurn = async () => {
    const myRole = getRole();
    const oppRole = getOpponentRole();
    if (!gameState || gameState.currentTurnUid !== user.uid) return;

    const nextTurnCount = gameState[oppRole].turnCount + 1;
    
    // 기획: 1~7턴까지는 턴수만큼, 8턴부터는 매턴 시작시 에너지가 6으로 고정
    let nextMaxEnergy = nextTurnCount;
    if (nextTurnCount >= 8) {
      nextMaxEnergy = 6;
    }

    const updatedData = { ...gameState };
    
    // 상대방 턴 시작 세팅 (에너지 충전)
    updatedData[oppRole].maxEnergy = nextMaxEnergy;
    updatedData[oppRole].energy = nextMaxEnergy;
    updatedData[oppRole].turnCount = nextTurnCount;

    // 상대방 덱에서 카드 1장 드로우
    if (updatedData[oppRole].deck.length > 0) {
      const drawnCard = updatedData[oppRole].deck.shift();
      if (updatedData[oppRole].hand.length < 10) { // 패 최대 10장 제한
        updatedData[oppRole].hand.push(drawnCard);
      }
    }

    // 내 필드의 카드들 다음 턴에 공격 가능하도록 수면(소환후유증) 해제
    updatedData[myRole].field = updatedData[myRole].field.map(card => ({ ...card, canAttack: true }));

    // 턴 교체
    updatedData.currentTurnUid = gameState[oppRole].uid;

    await updateDoc(doc(db, 'gameRooms', gameRoomId), updatedData);
    setSelectedAttackerIdx(null);
  };

  // 🃏 카드 내기 (소환 및 등장 능력 처리)
  const playCard = async (cardIdx) => {
    const myRole = getRole();
    if (!gameState || gameState.currentTurnUid !== user.uid) return;

    const myState = gameState[myRole];
    const card = myState.hand[cardIdx];

    if (myState.energy < card.cost) {
      alert("에너지가 부족합니다!");
      return;
    }
    if (myState.field.length >= 8) {
      alert("필드에는 최대 8장의 카드만 배치할 수 있습니다!");
      return;
    }

    const updatedData = { ...gameState };
    const newFieldCard = { ...card, canAttack: false }; // 등장한 턴에는 공격 불가

    // 등장 능력 예시 처리 (용맹한 기사: 내 다른 카드 한 장에 공격력 +1)
    if (card.tag === '등장' && card.name === '용맹한 기사' && updatedData[myRole].field.length > 0) {
      // 필드에 있는 첫 번째 카드의 공격력을 1 올려줌
      updatedData[myRole].field[0].atk += 1;
    }

    // 에너지 차감 및 패에서 필드로 이동
    updatedData[myRole].energy -= card.cost;
    updatedData[myRole].hand.splice(cardIdx, 1);
    updatedData[myRole].field.push(newFieldCard);

    await updateDoc(doc(db, 'gameRooms', gameRoomId), updatedData);
  };

  // ⚔️ 전투 처리 (하스스톤식 동시 대미지 교환)
  const attackTarget = async (targetType, targetIdx = null) => {
    const myRole = getRole();
    const oppRole = getOpponentRole();
    if (selectedAttackerIdx === null) return;

    const updatedData = { ...gameState };
    const attacker = updatedData[myRole].field[selectedAttackerIdx];

    if (!attacker.canAttack) {
      alert("이 카드는 이번 턴에 공격할 수 없습니다!");
      return;
    }

    if (targetType === 'hero') {
      // 1. 상대 명치(진영) 공격
      updatedData[oppRole].hp -= attacker.atk;
      attacker.canAttack = false;
      
      // 승리 조건 체크 (명치 체력 0 이하)
      if (updatedData[oppRole].hp <= 0) {
        updatedData.winner = user.uid;
        updatedData.status = 'finished';
      }
    } else if (targetType === 'minion') {
      // 2. 상대 미니언(카드) 공격
      const defender = updatedData[oppRole].field[targetIdx];

      // 서로 공격력만큼 체력 차감 (동시 타격)
      defender.hp -= attacker.atk;
      
      // 패시브 능력 체크 (유령: 처치되지 않음 예외 처리)
      if (attacker.name !== '유령') {
        attacker.hp -= defender.atk;
      }

      attacker.canAttack = false;

      // 체력이 0 이하인 카드들은 필드에서 제거(무덤)
      if (defender.hp <= 0 && defender.name !== '유령') {
        updatedData[oppRole].field.splice(targetIdx, 1);
      }
      if (attacker.hp <= 0 && attacker.name !== '유령') {
        updatedData[myRole].field.splice(selectedAttackerIdx, 1);
      }
    }

    await updateDoc(doc(db, 'gameRooms', gameRoomId), updatedData);
    setSelectedAttackerIdx(null);
  };

  // --- UI 렌더링 영역 ---
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-950 text-white">
        <h1 className="text-4xl font-extrabold text-amber-500 mb-6">Gridlock TCG</h1>
        <button onClick={handleGoogleLogin} className="px-6 py-3 bg-amber-600 rounded-xl font-bold hover:bg-amber-500">
          구글 계정으로 로그인하여 대전 시작
        </button>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-white">
        <h1 className="text-3xl font-bold text-slate-200 mb-6">메인 로비</h1>
        {matching ? (
          <div className="text-xl animate-pulse text-amber-400">상대 플레이어를 매칭하는 중... 대기방 잔류 중</div>
        ) : (
          <button onClick={startMatching} className="px-10 py-5 bg-blue-600 text-2xl font-black rounded-2xl hover:bg-blue-500 shadow-lg">
            대전 매칭 시작 (무조건 고정 덱)
          </button>
        )}
      </div>
    );
  }

  const myRole = getRole();
  const oppRole = getOpponentRole();
  const myState = gameState[myRole];
  const oppState = gameState[oppRole];
  const isMyTurn = gameState.currentTurnUid === user.uid;

  return (
    <div className="h-screen w-full bg-stone-900 text-white flex flex-col justify-between p-4 overflow-hidden select-none">
      
      {/* 👑 상단: 상대방 정보 영역 */}
      <div className="bg-slate-800/60 p-3 rounded-xl flex justify-between items-center border border-red-900/30">
        <div>
          <span className="text-red-400 font-bold">상대 진영: {oppState.email}</span>
          <div className="text-2xl font-black text-red-500">HP: ❤️ {oppState.hp} / 30</div>
        </div>
        <div className="flex gap-4 text-sm text-slate-400">
          <div>남은 덱: {oppState.deck.length}장</div>
          <div>손패: 🃏 {oppState.hand.length}장</div>
          <div className="text-amber-500 font-bold">에너지: ⚡ {oppState.energy}/{oppState.maxEnergy}</div>
        </div>
        {selectedAttackerIdx !== null && isMyTurn && (
          <button onClick={() => attackTarget('hero')} className="px-4 py-2 bg-red-600 hover:bg-red-500 font-bold rounded animate-bounce">
            🎯 상대 본체 격파(공격)
          </button>
        )}
      </div>

      {/* 🏟️ 중앙: 배틀 필드 (상대 진영 최대 8칸 / 내 진영 최대 8칸) */}
      <div className="flex-1 flex flex-col justify-center space-y-6 my-4 bg-stone-950/40 rounded-3xl p-4 border border-slate-800">
        
        {/* 상대 필드 */}
        <div className="flex justify-center items-center gap-3 h-32 border-b border-dashed border-slate-800 pb-3">
          {oppState.field.length === 0 ? <div className="text-sm text-slate-600 font-mono">상대 필드가 비어있음</div> : 
            oppState.field.map((card, idx) => (
              <div 
                key={card.instanceId}
                onClick={() => selectedAttackerIdx !== null && attackTarget('minion', idx)}
                className={`w-24 h-28 bg-red-950/40 border-2 rounded-xl flex flex-col justify-between p-1 cursor-pointer transition-transform ${selectedAttackerIdx !== null ? 'border-red-500 hover:scale-105 animate-pulse' : 'border-red-900'}`}
              >
                <div className="text-xs font-bold text-slate-300 truncate">{card.name}</div>
                <div className="text-[10px] text-slate-400 scale-90 leading-tight h-10 overflow-hidden">{card.ability}</div>
                <div className="flex justify-between font-mono text-sm px-1">
                  <span className="text-amber-400">⚔️{card.atk}</span>
                  <span className="text-red-400">❤️{card.hp}</span>
                </div>
              </div>
            ))
          }
        </div>

        {/* 내 필드 */}
        <div className="flex justify-center items-center gap-3 h-32 pt-3">
          {myState.field.length === 0 ? <div className="text-sm text-slate-600 font-mono">내 필드가 비어있음</div> : 
            myState.field.map((card, idx) => (
              <div 
                key={card.instanceId}
                onClick={() => isMyTurn && card.canAttack && setSelectedAttackerIdx(idx)}
                className={`w-24 h-28 bg-blue-950/40 border-2 rounded-xl flex flex-col justify-between p-1 cursor-pointer transition-transform ${selectedAttackerIdx === idx ? 'border-yellow-400 scale-105 shadow-yellow-500/50 shadow-lg' : card.canAttack && isMyTurn ? 'border-green-400' : 'border-blue-900'}`}
              >
                <div className="text-xs font-bold text-slate-200 truncate">{card.name}</div>
                <div className="text-[10px] text-slate-400 scale-90 leading-tight h-10 overflow-hidden">{card.ability}</div>
                <div className="flex justify-between font-mono text-sm px-1">
                  <span className="text-amber-400">⚔️{card.atk}</span>
                  <span className="text-red-400">❤️{card.hp}</span>
                </div>
              </div>
            ))
          }
        </div>
      </div>

      {/* 🎒 하단: 내 정보 및 카드 손패(Hand) 제어 영역 */}
      <div className="bg-slate-800/80 p-4 rounded-2xl border border-blue-900/40 flex flex-col space-y-3">
        <div className="flex justify-between items-center">
          <div>
            <span className="text-blue-400 font-bold">내 진영 (나)</span>
            <div className="text-2xl font-black text-blue-400">HP: ❤️ {myState.hp} / 30</div>
          </div>

          {/* 중앙 제어 보드 */}
          <div className="flex items-center gap-6">
            <div className="bg-slate-900 px-4 py-2 rounded-xl border border-slate-700 text-center">
              <span className="text-xs text-slate-400 block">에너지 보유량</span>
              <span className="text-2xl font-black text-amber-400">⚡ {myState.energy} / {myState.maxEnergy}</span>
            </div>
            <button 
              onClick={endTurn} 
              disabled={!isMyTurn}
              className={`px-8 py-4 font-black text-xl rounded-xl shadow-md transition-transform ${isMyTurn ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 animate-bounce' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}
            >
              {isMyTurn ? '턴 종료 ⏱️' : '상대 턴 대기 중'}
            </button>
          </div>

          <div className="text-right text-sm text-slate-400">
            <div>남은 덱: {myState.deck.length}장</div>
            <div className="text-blue-400 font-bold">현재 {myState.turnCount}번째 턴 플레이 중</div>
          </div>
        </div>

        {/* 손패 리스트 */}
        <div className="flex justify-center gap-3 overflow-x-auto py-2">
          {myState.hand.map((card, idx) => (
            <div 
              key={card.instanceId}
              onClick={() => isMyTurn && playCard(idx)}
              className={`w-24 h-32 bg-slate-900 border rounded-xl flex flex-col justify-between p-1.5 cursor-pointer hover:-translate-y-3 transition-transform ${isMyTurn && myState.energy >= card.cost ? 'border-amber-400 hover:border-yellow-300' : 'border-slate-700 opacity-60'}`}
            >
              <div className="flex justify-between items-center border-b border-slate-800 pb-0.5">
                <span className="bg-amber-500/20 text-amber-400 font-mono text-xs font-black rounded-full w-5 h-5 flex items-center justify-center">
                  {card.cost}
                </span>
                <span className="text-[10px] text-slate-400">{card.tag}</span>
              </div>
              <div className="text-xs font-bold text-center py-1 truncate">{card.name}</div>
              <div className="text-[9px] text-slate-400 text-center leading-tight h-10 overflow-hidden line-clamp-3 bg-black/20 p-1 rounded">
                {card.ability}
              </div>
              <div className="flex justify-between font-mono text-xs px-0.5 pt-1">
                <span className="text-amber-500">⚔️{card.atk}</span>
                <span className="text-red-500">❤️{card.hp}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 🏆 게임 종료 팝업 모달 */}
      {gameState.status === 'finished' && (
        <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center space-y-4 z-50">
          <h2 className="text-6xl font-black text-yellow-400">
            {gameState.winner === user.uid ? '승리 (VICTORY) 🎉' : '패배 (DEFEAT) 💀'}
          </h2>
          <button onClick={() => setGameState(null)} className="px-6 py-2 bg-slate-700 text-white font-bold rounded-lg hover:bg-slate-600">
            로비로 돌아가기
          </button>
        </div>
      )}
    </div>
  );
}