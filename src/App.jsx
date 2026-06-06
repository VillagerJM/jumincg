import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from './firebase'; 
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, onSnapshot, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';

// 폰트 및 스타일 커스텀 (그림자/윤곽선 제거됨)
// 폰트 및 스타일 커스텀 (그림자/윤곽선 제거 + 🌟 대형 모니터 글자 흐림 방지 패치)
const CustomFontSetup = () => (
  <style>{`
    @font-face {
      font-family: 'MyCustomFont';
      src: url('/fonts/pfbold.ttf') format('truetype');
      font-weight: normal;
      font-style: normal;
    }
    @font-face {
      font-family: 'MyNumberFont';
      src: url('/fonts/pfbold.ttf') format('truetype');
      font-weight: bold;
      font-style: normal;
    }
    
    /* ✅ 1. 전체 앱에 고해상도 안티앨리어싱(외곽선 다듬기) 강제 적용 */
    /* 도트(픽셀) 폰트 전용 선명도 옵션 */
    body, .tcg-theme, .tcg-number { 
      -webkit-font-smoothing: none;
      font-smooth: never;
    }

    /* ✅ 2. 동적 크기 변환 시 텍스트가 흐려지는 현상 완화 (하드웨어 가속) */
    .tcg-theme, .tcg-number, span, p {
      transform: translateZ(0);
      backface-visibility: hidden;
    }

    .tcg-theme { font-family: 'MyCustomFont', sans-serif; }
    .tcg-number { font-family: 'MyNumberFont', sans-serif; font-weight: bold; }

    /* ✅ 추가: 짧고 부드러운 점프 애니메이션 */
    @keyframes short-bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-8px); } /* 기존보다 훨씬 낮은 8px만 뜀 */
    }
    .animate-short-bounce {
      animation: short-bounce 0.7s ease-in-out infinite;
    }
  `}</style>
);

const DEFAULT_DECK = [
  { id: '001', name: '용맹한 기사', cost: 1, atk: 1, hp: 2, ability: '등장: 내 다른 카드 한 장에 공격력을 1 부여합니다.', tag: '등장' },
  { id: '002', name: '멍멍이', cost: 1, atk: 1, hp: 3, ability: '능력 없음', tag: '능력 없음' },
  { id: '003', name: '유령', cost: 4, atk: 0, hp: 1, ability: '이 카드는 처치되지 않습니다.', tag: '패시브' },
  { id: '004', name: '강령술사', cost: 4, atk: 43, hp: 4, ability: '등장: 부활', tag: '등장' },
  { id: '005', name: '바람 마법사', cost: 3, atk: 3, hp: 4, ability: '등장: 바운스', tag: '등장' },
  { id: '006', name: '도적단', cost: 2, atk: 2, hp: 2, ability: '등장: 훔치기', tag: '등장' },
  { id: '007', name: '겁쟁이 기사', cost: 2, atk: 1, hp: 3, ability: '등장: 공격력+1', tag: '등장' },
  { id: '008', name: '7번 드래곤', cost: 7, atk: 7, hp: 7, ability: '능력 없음', tag: '능력 없음' },
  { id: '009', name: '6번 드래곤', cost: 6, atk: 6, hp: 6, ability: '능력 없음', tag: '능력 없음' },
  { id: '010', name: '5번 드래곤', cost: 5, atk: 5, hp: 5, ability: '능력 없음', tag: '능력 없음' },
  { id: '011', name: '4번 드래곤', cost: 4, atk: 4, hp: 4, ability: '능력 없음', tag: '능력 없음' },
  { id: '012', name: '3번 드래곤', cost: 3, atk: 33, hp: 33, ability: '능력 없음', tag: '능력 없음' },
  { id: '013', name: '2번 드래곤', cost: 2, atk: 2, hp: 2, ability: '능력 없음', tag: '능력 없음' },
  { id: '014', name: '1번 드래곤', cost: 1, atk: 1, hp: 1, ability: '능력 없음', tag: '능력 없음' },
  { id: '015', name: '음악인', cost: 7, atk: 4, hp: 6, ability: '등장: 비용 감소', tag: '등장' },
  { id: '016', name: '화난 사람', cost: 1, atk: 1, hp: 1, ability: '능력 없음', tag: '능력 없음' },
  { id: '017', name: '이만진', cost: 2, atk: 2, hp: 2, ability: '능력 없음', tag: '능력 없음' },
  { id: '018', name: '삼만진', cost: 3, atk: 3, hp: 3, ability: '능력 없음', tag: '능력 없음' },
  { id: '019', name: '사만진', cost: 1, atk: 1, hp: 3, ability: '능력 없음', tag: '능력 없음' },
  { id: '020', name: '도적단 두목', cost: 2, atk: 2, hp: 2, ability: '등장: 훔치기', tag: '등장' },
];

const shuffleDeck = (deck) => {
  return [...deck].sort(() => Math.random() - 0.5).map((card, idx) => ({ ...card, instanceId: `${card.id}-${idx}-${Date.now()}` }));
};

// 🎛️ 카드 레이아웃 기본값 설정 (앞으로 수치를 바꿀 때는 여기서만 수정하시면 됩니다!)
const INITIAL_LAYOUT_COORDS = {
  "costTop": 7,
  "costLeft": 10,
  "costSize": 10,
  "nameTop": 3,
  "nameLeft": 26,
  "nameSize": 10,
  "abilityTop": 68,
  "abilityLeft": 8,
  "abilitySize": 7,
  "abilityWidth": 85,
  "abilityHeight": 60,
  "atkTop": 53,
  "atkLeft": 25,
  "atkSize": 15,
  "hpTop": 53,
  "hpLeft": 73,
  "hpSize": 15
};

export default function App() {
  const [user, setUser] = useState(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true); 
  const [matching, setMatching] = useState(false);
  const [gameRoomId, setGameRoomId] = useState(null);
  const [gameState, setGameState] = useState(null); 
  const [selectedAttackerIdx, setSelectedAttackerIdx] = useState(null);
  // 🛑 매칭 취소 및 엉킴 방지용 관리 변수
  const matchUnsubscribeRef = useRef(null);
  const matchedRef = useRef(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // 🎛️ 위에서 선언한 const 값으로 최초 상태 세팅
  const [coords, setCoords] = useState(INITIAL_LAYOUT_COORDS);
  const [showTester, setShowTester] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthChecking(false);
    }, () => setIsAuthChecking(false));
    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try { await signInWithPopup(auth, provider); } catch (e) { alert("로그인 실패"); }
  };

  const handleLogout = async () => {
    if (user) await deleteDoc(doc(db, 'matchQueue', user.uid)).catch(() => {});
    await signOut(auth);
    setGameState(null);
    setGameRoomId(null);
    setUser(null);
  };

  const startMatching = async () => {
    if (!user) return;
    setMatching(true);
    setCoords(INITIAL_LAYOUT_COORDS); // 매 게임 시작 시 수치 초기화
    matchedRef.current = false;       // 매칭 성공 여부 초기화
    
    try {
      const matchQueueRef = collection(db, 'matchQueue');
      const q = query(matchQueueRef, where('status', '==', 'waiting'));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const opponentDoc = querySnapshot.docs[0];
        const opponentData = opponentDoc.data();

        if (opponentData.uid !== user.uid) {
          matchedRef.current = true; // 즉시 매칭 성공 처리
          const roomId = `room-${Date.now()}`;
          const isUserFirst = Math.random() > 0.5;
          const roomRef = doc(db, 'gameRooms', roomId);
          const playerADeck = shuffleDeck(DEFAULT_DECK);
          const playerBDeck = shuffleDeck(DEFAULT_DECK);

          await setDoc(roomRef, {
            // ✅ 기존의 turnCount: isUserFirst ? 1 : 0 부분을 삭제했습니다.
            playerA: { uid: user.uid, email: user.email, hp: 30, energy: isUserFirst ? 1 : 0, maxEnergy: isUserFirst ? 1 : 0, field: [], hand: playerADeck.splice(0, 3), deck: playerADeck },
            playerB: { uid: opponentData.uid, email: opponentData.email, hp: 30, energy: isUserFirst ? 0 : 1, maxEnergy: isUserFirst ? 0 : 1, field: [], hand: playerBDeck.splice(0, 4), deck: playerBDeck },
            currentTurnUid: isUserFirst ? user.uid : opponentData.uid,
            
            // ✅ 새롭게 추가된 공통 턴 관리 데이터
            firstPlayerUid: isUserFirst ? user.uid : opponentData.uid, // 누가 선공인지 기록
            globalTurn: 1, // 공통 게임 턴 카운터
            
            winner: null,
            status: 'playing'
          });

          await updateDoc(doc(db, 'matchQueue', opponentDoc.id), { status: 'matched', roomId: roomId });
          await deleteDoc(doc(db, 'matchQueue', user.uid)).catch(() => {});
          setGameRoomId(roomId);
          setMatching(false);
          listenToGameRoom(roomId);
          return;
        }
      }

      await setDoc(doc(db, 'matchQueue', user.uid), { uid: user.uid, email: user.email, status: 'waiting', createdAt: Date.now() });
      const unsubscribe = onSnapshot(doc(db, 'matchQueue', user.uid), (snap) => {
        if (snap.exists() && snap.data().status === 'matched') {
          matchedRef.current = true; // 실시간 매칭 성공 처리
          const roomId = snap.data().roomId;
          setGameRoomId(roomId);
          setMatching(false);
          listenToGameRoom(roomId);
          unsubscribe();
          deleteDoc(doc(db, 'matchQueue', user.uid)).catch(() => {});
        }
      });
      matchUnsubscribeRef.current = unsubscribe; // 리스너 함수 보관
    } catch (err) { setMatching(false); }
  };

  // 🛑 매칭 취소 함수 (엉킴 방지 2초 대기 포함)
  const cancelMatching = async () => {
    if (isCancelling) return;
    setIsCancelling(true);

    // 엉킴 방지용 2초 대기 (이 사이에 매칭 스냅샷이 잡히면 쩔수없이 시작됨)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 2초가 지났는데도 상대방과 매칭이 성사되지 않은 상태라면 안전하게 취소 진행
    if (!matchedRef.current) {
      if (matchUnsubscribeRef.current) {
        matchUnsubscribeRef.current(); // 리스너 구독 해제
        matchUnsubscribeRef.current = null;
      }
      // 대기열 데이터베이스에서 내 문서 지우기
      await deleteDoc(doc(db, 'matchQueue', user.uid)).catch(() => {});
      setMatching(false);
    }
    setIsCancelling(false);
  };

  const listenToGameRoom = (roomId) => {
    onSnapshot(doc(db, 'gameRooms', roomId), (snap) => {
      if (snap.exists()) setGameState(snap.data());
    });
  };

  useEffect(() => {
    if (!user) return;
    const checkExistingStatus = async () => {
      try {
        const userQueueRef = doc(db, 'matchQueue', user.uid);
        const queueSnap = await getDoc(userQueueRef);
        if (queueSnap.exists() && queueSnap.data().status === 'waiting') {
          await deleteDoc(userQueueRef);
        }
        const roomsRef = collection(db, 'gameRooms');
        const qA = query(roomsRef, where('playerA.uid', '==', user.uid), where('status', '==', 'playing'));
        const snapA = await getDocs(qA);
        if (!snapA.empty) { setGameRoomId(snapA.docs[0].id); listenToGameRoom(snapA.docs[0].id); return; }

        const qB = query(roomsRef, where('playerB.uid', '==', user.uid), where('status', '==', 'playing'));
        const snapB = await getDocs(qB);
        if (!snapB.empty) { setGameRoomId(snapB.docs[0].id); listenToGameRoom(snapB.docs[0].id); return; }
      } catch (err) { console.error(err); }
    };
    checkExistingStatus();
  }, [user]);

  const getRole = () => {
    if (!gameState || !user || !gameState.playerA || !gameState.playerB) return null;
    return gameState.playerA.uid === user.uid ? 'playerA' : 'playerB';
  };
  const getOpponentRole = () => { return getRole() === 'playerA' ? 'playerB' : 'playerA'; };

  const endTurn = async () => {
    const myRole = getRole();
    const oppRole = getOpponentRole();
    if (!gameState || gameState.currentTurnUid !== user.uid || !myRole) return;

    const updatedData = { ...gameState };

    // ✅ 공통 턴 증가 로직: '후공 플레이어'가 턴을 마칠 때만 게임의 턴(globalTurn)을 1 올립니다.
    const isSecondPlayerEndingTurn = user.uid !== gameState.firstPlayerUid;
    if (isSecondPlayerEndingTurn) {
      updatedData.globalTurn = (updatedData.globalTurn || 1) + 1;
    }

    // ✅ 에너지 부여 로직 (공통 턴 기준)
    const currentGlobalTurn = updatedData.globalTurn || 1;
    let nextMaxEnergy = currentGlobalTurn > 7 ? 7 : currentGlobalTurn;

    updatedData[oppRole].maxEnergy = nextMaxEnergy;
    updatedData[oppRole].energy = nextMaxEnergy;

    if (updatedData[oppRole].deck.length > 0) {
      const drawnCard = updatedData[oppRole].deck.shift();
      if (updatedData[oppRole].hand.length < 10) updatedData[oppRole].hand.push(drawnCard);
    }
    
    updatedData[myRole].field = updatedData[myRole].field.map(card => ({ ...card, canAttack: true }));
    updatedData.currentTurnUid = gameState[oppRole].uid;

    await updateDoc(doc(db, 'gameRooms', gameRoomId), updatedData);
    setSelectedAttackerIdx(null);
  };

  const playCard = async (cardIdx) => {
    const myRole = getRole();
    if (!gameState || gameState.currentTurnUid !== user.uid || !myRole) return;

    const myState = gameState[myRole];
    const card = myState.hand[cardIdx];

    if (myState.energy < card.cost || myState.field.length >= 8) return;

    const updatedData = { ...gameState };
    const newFieldCard = { ...card, canAttack: false };

    if (card.tag === '등장' && card.name === '용맹한 기사' && updatedData[myRole].field.length > 0) {
      updatedData[myRole].field[0].atk += 1;
    }

    updatedData[myRole].energy -= card.cost;
    updatedData[myRole].hand.splice(cardIdx, 1);
    updatedData[myRole].field.push(newFieldCard);

    await updateDoc(doc(db, 'gameRooms', gameRoomId), updatedData);
  };

  const attackTarget = async (targetType, targetIdx = null) => {
    const myRole = getRole();
    const oppRole = getOpponentRole();
    if (selectedAttackerIdx === null || !myRole) return;

    const updatedData = { ...gameState };
    const attacker = updatedData[myRole].field[selectedAttackerIdx];
    if (!attacker || !attacker.canAttack) return;

    if (targetType === 'hero') {
      updatedData[oppRole].hp -= attacker.atk;
      attacker.canAttack = false;
      if (updatedData[oppRole].hp <= 0) {
        updatedData.winner = user.uid;
        updatedData.status = 'finished';
      }
    } else if (targetType === 'minion') {
      const defender = updatedData[oppRole].field[targetIdx];
      if (!defender) return;

      defender.hp -= attacker.atk;
      attacker.canAttack = false;

      if (defender.hp <= 0 && defender.name !== '유령') {
        updatedData[oppRole].field.splice(targetIdx, 1);
      }
    }

    await updateDoc(doc(db, 'gameRooms', gameRoomId), updatedData);
    setSelectedAttackerIdx(null);
  };

  const handleSurrender = async () => {
    if (!window.confirm("정말로 기권하시겠습니까? 즉시 패배 처리됩니다.")) return;
    const oppRole = getOpponentRole();
    await updateDoc(doc(db, 'gameRooms', gameRoomId), {
      status: 'finished',
      winner: gameState[oppRole].uid,
    });
  };

  const handleSliderChange = (key, value) => {
    setCoords(prev => ({ ...prev, [key]: parseInt(value) }));
  };

  // 🃏 그림자 제거 및 색상 커스텀 텍스트 렌더러 (cqw 적용 및 이미지 디버깅 기능 추가)
  // 🃏 그림자 제거 및 색상 커스텀 텍스트 렌더러
  // 🃏 그림자 제거 및 색상 커스텀 텍스트 렌더러 (z값 레이어 정상화 + cqw 반응형 글자 적용)
  // 🃏 그림자 제거 및 색상 커스텀 텍스트 렌더러
  // 🃏 일러스트 정렬 영점 패치 완료 버전 (cqw 반응형 단위 유지)
  // 🃏 일러스트 정렬 영점 패치 완료 버전 (cqw 반응형 단위 유지 + 선택 버블링 완벽 차단)
  const renderPremiumCard = (card, onClick, borderClass, sizeClass = "w-24 sm:w-28 md:w-32") => {
    const normalizedId = card.id.split('_')[0]; 
    const illustrationPath = `/images/cards/${normalizedId}.png`;

    return (
      <div
        // ✅ 카드를 클릭했을 때 뒷배경(빈공간) 취소 이벤트가 실행되지 않도록 여기서 완벽히 차단!
        onClick={(e) => {
          e.stopPropagation();
          if (onClick) onClick();
        }}
        className={`relative ${sizeClass} aspect-[3/4] rounded-xl overflow-hidden shadow-2xl select-none transition-all cursor-pointer box-border border-[3px] ${borderClass} hover:z-50`}
        style={{ containerType: 'inline-size' }}
      >
        {/* 1. 배경 일러스트 */}
        <img 
          src={illustrationPath} 
          alt={card.name} 
          className="absolute inset-0 w-full h-full object-fill"
          onError={(e) => { e.target.style.display = 'none'; }}
        />

        {/* 2. 카드 프레임 틀 */}
        <img 
          src="/images/card_layout.png" 
          alt="Frame" 
          className="absolute inset-0 w-full h-full object-fill pointer-events-none z-10"
          onError={(e) => {
            e.target.className = "absolute inset-0 w-full h-full border border-stone-800 pointer-events-none bg-gradient-to-t from-black/80 to-transparent z-10";
          }}
        />

        {/* 3. 텍스트 레이어 */}
        <div className="absolute inset-0 z-20">
          
          <span className="tcg-number font-black text-white absolute leading-none" style={{ top: `${coords.costTop}%`, left: `${coords.costLeft}%`, fontSize: `${coords.costSize}cqw` }}>{card.cost}</span>
          <span className="font-black truncate absolute text-left tracking-tighter text-black" style={{ top: `${coords.nameTop}%`, left: `${coords.nameLeft}%`, fontSize: `${coords.nameSize}cqw`, width: `${100 - coords.nameLeft - 10}%` }}>{card.name}</span>
          
          <div className="absolute leading-tight text-black overflow-hidden flex flex-col justify-start" style={{ top: `${coords.abilityTop}%`, left: `${coords.abilityLeft}%`, width: `${coords.abilityWidth}%`, fontSize: `${coords.abilitySize}cqw`, height: `${coords.abilityHeight}%` }}>
            <p className="line-clamp-3 font-medium">{card.ability !== '능력 없음' ? card.ability : ''}</p>
          </div>

          <span className="tcg-number font-black text-amber-400 absolute leading-none" style={{ top: `${coords.atkTop}%`, left: `${coords.atkLeft}%`, fontSize: `${coords.atkSize}cqw` }}>{card.atk}</span>
          <span className="tcg-number font-black text-red-400 absolute leading-none" style={{ top: `${coords.hpTop}%`, left: `${coords.hpLeft}%`, fontSize: `${coords.hpSize}cqw` }}>{card.hp}</span>
        </div>
      </div>
    );
  };

  const renderDynamicGridField = (fieldCards, isOpponentField) => {
    return (
      <div className="w-full h-full flex justify-center items-center gap-4 px-2 overflow-visible">
        {fieldCards.map((card, idx) => {
          let borderClass = 'border-stone-900';
          if (isOpponentField) {
            borderClass = selectedAttackerIdx !== null && isMyTurn ? 'border-red-500 animate-pulse scale-105 shadow-xl shadow-red-600/50' : 'border-red-950/40';
          } else {
            borderClass = selectedAttackerIdx === idx ? 'border-yellow-400 scale-105 shadow-xl shadow-yellow-500/70' : card.canAttack && isMyTurn ? 'border-green-400 animate-short-bounce' : 'border-blue-950/40';
          }

          return renderPremiumCard(
            card,
            () => {
              if (isOpponentField) {
                if (selectedAttackerIdx !== null && isMyTurn) attackTarget('minion', idx);
              } else {
                if (isMyTurn && card.canAttack) setSelectedAttackerIdx(idx);
              }
            },
            borderClass,
            "w-[15vh] shrink-0" /* 🔥 max-w 완전 삭제! 화면 높이의 15% 가로길이로 무한 비례 확대 */
          );
        })}
      </div>
    );
  };

  if (isAuthChecking) return <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-400 font-bold">정보 확인 중...</div>;
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-950 text-white">
        <CustomFontSetup />
        <h1 className="text-4xl font-extrabold text-amber-500 mb-6 tracking-wide">Gridlock TCG</h1>
        <button onClick={handleGoogleLogin} className="px-6 py-3 bg-amber-600 rounded-xl font-bold hover:bg-amber-500 transition-colors shadow-lg">구글 로그인</button>
      </div>
    );
  }
  if (!gameState) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-white relative">
        {/* 로비 우상단 컨트롤러 유저 정보 & 좌표 창 토글 */}
        <div className="absolute top-6 right-6 flex items-center gap-4 bg-slate-800 px-4 py-2 rounded-full border border-slate-700">
          <span className="text-sm text-slate-300 font-bold">{user.email} 님</span>
          
          {/* 좌표창 토글 버튼 */}
          <button 
            onClick={() => setShowTester(!showTester)} 
            className={`px-3 py-1 rounded-full text-xs font-black transition-colors ${
              showTester 
                ? 'bg-amber-500 text-slate-950 hover:bg-amber-400' 
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {showTester ? '📐 좌표창 끄기' : '📐 좌표창 켜기'}
          </button>

          <button onClick={handleLogout} className="px-3 py-1 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-full text-xs font-black transition-colors">로그아웃</button>
        </div>
        
        <h1 className="text-3xl font-bold mb-6">메인 로비</h1>
        {matching ? (
          <div className="flex flex-col items-center gap-4">
            <div className="text-xl animate-pulse text-amber-400">
              {isCancelling ? '매칭 취소 처리 중 (엉킴 방지 대기)...' : '매칭 대기 중... 다른 브라우저에서 로그인해 매칭을 시작하세요.'}
            </div>
            
            {/* 매칭 취소 버튼 */}
            <button 
              onClick={cancelMatching} 
              disabled={isCancelling}
              className={`px-6 py-2 rounded-xl font-bold text-sm shadow transition-colors ${
                isCancelling 
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                  : 'bg-red-600 text-white hover:bg-red-500 active:scale-95'
              }`}
            >
              {isCancelling ? '취소 대기 중...' : '❌ 매칭 취소'}
            </button>
          </div>
        ) : (
          <button onClick={startMatching} className="px-10 py-5 bg-blue-600 text-2xl font-black rounded-2xl hover:bg-blue-500 shadow-lg transition-transform hover:scale-105">대전 매칭 시작</button>
        )}
      </div>
    );
  }

  const myRole = getRole();
  const oppRole = getOpponentRole();
  const myState = myRole ? gameState[myRole] : null;
  const oppState = oppRole ? gameState[oppRole] : null;
  const isMyTurn = gameState.currentTurnUid === user.uid;

  if (!myState || !oppState) return <div className="h-screen bg-stone-900 text-white flex items-center justify-center">데이터 동기화 중...</div>;

  return (
    <div className="tcg-theme h-screen max-h-screen w-full bg-stone-900 text-white flex overflow-hidden select-none box-border">
      <CustomFontSetup />
      
      {/* ✅ 패딩을 제거하고 화면 높이(vh) 비율을 정확히 나누는 메인 컨테이너 */}
      <div className="flex-1 flex flex-col h-full w-full bg-gradient-to-b from-stone-900 via-stone-950 to-stone-900 overflow-hidden relative">
        
        {/* 1. 상대방 상태창 (화면 높이의 8%) */}
        <div className="h-[8vh] min-h-[40px] bg-slate-900/90 px-4 flex justify-between items-center border-b border-red-950/40 shadow-lg z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="text-sm text-red-400 font-black max-w-[120px] truncate">{oppState.email.split('@')[0]}</div>
            <div className="text-xs text-slate-400 font-medium">덱: {oppState.deck?.length}장 | 패: {oppState.hand?.length}장</div>
          </div>
          
          <div className="flex items-center gap-4">
            {selectedAttackerIdx !== null && isMyTurn && (
              <button onClick={() => attackTarget('hero')} className="px-3 py-1 bg-red-600 font-black rounded text-xs shadow-lg animate-pulse">🎯 명치치기</button>
            )}
            <div className="flex items-center gap-1 bg-red-950/80 px-3 py-1 rounded-md border border-red-800 text-sm font-black text-red-300">
              <span className="text-xs text-red-400">HP</span> {oppState.hp}
            </div>
          </div>

          <div className="text-sm font-mono text-amber-500 font-bold">⚡ {oppState.energy} / {oppState.maxEnergy}</div>
        </div>

        {/* 2. 중앙 게임 영역 (상대필드 28% + 내필드 28% + 손패 28% = 총 84%) */}
        <div 
          className="h-[84vh] w-full flex flex-col relative shrink-0"
          onClick={() => setSelectedAttackerIdx(null)}
        >
          
          {/* 🔴 상대방 필드 (무조건 28vh 고정) */}
          <div className="h-[28vh] w-full flex justify-center items-center relative z-10 shrink-0">
            {oppState.field.length === 0 && <div className="text-xs text-slate-600 text-center absolute">상대 진영 비어있음</div>}
            {renderDynamicGridField(oppState.field, true)}
          </div>
          
          {/* 중앙 경계선 (자리를 차지하지 않도록 absolute 처리하여 정확히 1/3 지점에 배치) */}
          <div className="absolute top-[33.33%] w-full border-t-[2px] border-dashed border-stone-800/80 z-0"></div>

          {/* 🟡 내 필드 (무조건 28vh 고정) */}
          <div className="h-[28vh] w-full flex justify-center items-center relative z-20 shrink-0">
            {myState.field.length === 0 && <div className="text-xs text-slate-600 text-center absolute">아군 진영 비어있음</div>}
            {renderDynamicGridField(myState.field, false)}
          </div>

          {/* 🟢 내 손패 (무조건 28vh 고정) */}
          <div className="h-[28vh] w-full flex justify-center items-end pb-3 overflow-visible px-2 relative z-30 shrink-0">
            {(myState.hand || []).map((card, idx) => {
              const isPlayable = isMyTurn && myState.energy >= card.cost;
              const borderClass = isPlayable ? 'border-amber-400 hover:border-yellow-300 hover:-translate-y-4 shadow-amber-500/20' : 'border-slate-950 opacity-50';
              return renderPremiumCard(
                card,
                () => isMyTurn && playCard(idx),
                borderClass,
                "w-[18vh] shrink-0 mx-1.5" /* 🔥 손패 역시 max-w 박살! 화면 높이의 18%로 무한 확대 */
              );
            })}
          </div>

        </div>

        {/* 3. 내 상태창 (화면 높이의 8%) */}
        <div className="h-[8vh] min-h-[45px] bg-slate-900/95 px-4 flex justify-between items-center border-t border-slate-800 shadow-lg z-10 shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={handleSurrender} className="px-3 py-1 bg-stone-800 text-red-400 rounded text-xs font-bold hover:bg-red-950">🏳️ 기권</button>
            <div className="text-xs text-slate-400">덱: {myState.deck?.length}장</div>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-slate-800 px-3 py-1 rounded text-xs text-amber-400 font-bold">TURN {gameState.globalTurn || 1}</div>
            <div className="flex items-center gap-1 bg-blue-950/80 px-4 py-1 rounded-md border border-blue-800 text-sm font-black text-blue-300">
              <span className="text-xs text-blue-400">HP</span> {myState.hp}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="font-mono text-sm text-amber-400 font-bold">⚡ {myState.energy}/{myState.maxEnergy}</div>
            <button 
              onClick={endTurn} 
              disabled={!isMyTurn}
              className={`px-4 py-1.5 font-black text-sm rounded-md shadow-lg transition-transform ${isMyTurn ? 'bg-amber-500 text-slate-950 animate-pulse hover:scale-105' : 'bg-slate-800 text-slate-500'}`}
            >
              {isMyTurn ? '턴 종료 ⏱️' : '상대 턴'}
            </button>
          </div>
        </div>

      </div>

      {showTester && (
        <div className="w-80 bg-stone-950 border-l border-stone-800 p-2 overflow-y-auto text-xs text-slate-300 z-40 font-mono flex flex-col justify-between h-full">
          <div>
            <div className="flex justify-between items-center mb-2 pb-1 border-b border-stone-800">
              <span className="font-bold text-amber-500 text-sm">📐 레이아웃 좌표 튜너</span>
              <button onClick={() => setShowTester(false)} className="text-red-400 text-[10px]">닫기 ×</button>
            </div>

            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {Object.keys(coords).map((key) => {
                const isSize = key.toLowerCase().includes('size');
                const isWidth = key.toLowerCase().includes('width');
                let min = 0, max = 100;
                if (isSize) { min = 5; max = 30; }
                if (isWidth) { min = 30; max = 100; }
                
                return (
                  <div key={key} className="bg-stone-900/60 p-1.5 rounded border border-stone-800/40">
                    <div className="flex justify-between text-[10px] mb-0.5 font-sans">
                      <span className="text-slate-400 font-bold">{key}</span>
                      <span className="text-amber-400 font-mono font-bold">{coords[key]}{isSize ? 'cqw' : '%'}</span> {/* ✅ px -> cqw 변경 */}
                    </div>
                    <input 
                      type="range" min={min} max={max} 
                      value={coords[key]} 
                      onChange={(e) => handleSliderChange(key, e.target.value)}
                      className="w-full accent-amber-500 h-1 bg-stone-700 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-stone-800 bg-stone-900 p-2 rounded">
            <span className="text-[10px] text-green-400 block mb-1">💡 튜닝 후 고정용 셋업 데이터:</span>
            <pre className="text-[9px] bg-black p-1 rounded text-amber-300 overflow-x-auto whitespace-pre-wrap select-all cursor-pointer">
              {JSON.stringify(coords, null, 2)}
            </pre>
            <p className="text-[8px] text-slate-500 mt-1 leading-normal font-sans">※ 이 데이터 덩어리를 고정하고 싶다면 나중에 알려주세요. 기본값으로 고정 패치해 드릴게요!</p>
          </div>
        </div>
      )}

      {gameState.status === 'finished' && (
        <div className="fixed inset-0 bg-black/90 flex flex-col items-center justify-center space-y-4 z-50">
          <h2 className="text-5xl font-black tracking-widest text-yellow-400 drop-shadow-lg">
            {gameState.winner === user.uid ? '🎉 VICTORY' : '💀 DEFEAT'}
          </h2>
          <button onClick={() => setGameState(null)} className="px-6 py-2 bg-slate-700 text-white font-bold rounded-xl hover:bg-slate-600 transition-colors">
            로비로 가기
          </button>
        </div>
      )}
    </div>
  );
}