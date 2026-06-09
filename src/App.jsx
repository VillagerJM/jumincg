import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from './firebase'; 
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, onSnapshot, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';

// 💡 파일 뒤에 .js 와 .jsx 확장자를 정확하게 붙여주세요!
import { DEFAULT_DECK, INITIAL_LAYOUT_COORDS } from "./constants/gameData.js";
import { shuffleDeck } from "./utils/gameUtils.js";
import { LoginView } from "./views/LoginView.jsx";
import { LobbyView } from "./views/LobbyView.jsx";
import { GameRoomView } from "./views/GameRoomView.jsx";

export default function App() {
  const [user, setUser] = useState(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true); 
  const [matching, setMatching] = useState(false);
  const [gameRoomId, setGameRoomId] = useState(null);
  const [gameState, setGameState] = useState(null); 
  const [selectedAttackerIdx, setSelectedAttackerIdx] = useState(null);
  
  const matchUnsubscribeRef = useRef(null);
  const matchedRef = useRef(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const [coords, setCoords] = useState(INITIAL_LAYOUT_COORDS);
  const [showTester, setShowTester] = useState(false);

  const [myProfilePic, setMyProfilePic] = useState('/images/default_profile.png');
  const [oppProfilePic, setOppProfilePic] = useState('/images/default_profile.png');

  // 사용자 로그인 감지
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthChecking(false);
    }, () => setIsAuthChecking(false));
    return () => unsubscribe();
  }, []);

  // 내 프로필 로드
  useEffect(() => {
    if (user) {
      const saved = localStorage.getItem(`profile_pic_${user.uid}`);
      if (saved) setMyProfilePic(saved);
      getDoc(doc(db, 'users', user.uid)).then(docSnap => {
        if (docSnap.exists() && docSnap.data().profilePic) {
          setMyProfilePic(docSnap.data().profilePic);
          localStorage.setItem(`profile_pic_${user.uid}`, docSnap.data().profilePic);
        }
      });
    }
  }, [user]);

  // 게임방 리스너 및 상대 프로필 로드
  useEffect(() => {
    if (!gameRoomId) { setGameState(null); return; }
    const unsubscribe = onSnapshot(doc(db, 'gameRooms', gameRoomId), async (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setGameState(data);
        const myRole = data.playerA.uid === user?.uid ? 'playerA' : 'playerB';
        const oppRole = myRole === 'playerA' ? 'playerB' : 'playerA';
        const oppEmail = data[oppRole]?.email;
        if (oppEmail) {
          const q = query(collection(db, 'users'), where('email', '==', oppEmail));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty && querySnapshot.docs[0].data().profilePic) {
            setOppProfilePic(querySnapshot.docs[0].data().profilePic);
          } else {
            setOppProfilePic('/images/default_profile.png');
          }
        }
      } else {
        setGameState(null);
        setGameRoomId(null);
      }
    });
    return () => unsubscribe();
  }, [gameRoomId, user]);

  useEffect(() => {
    if (!user) return;
    const checkExistingStatus = async () => {
      try {
        const userQueueRef = doc(db, 'matchQueue', user.uid);
        const queueSnap = await getDoc(userQueueRef);
        if (queueSnap.exists() && queueSnap.data().status === 'waiting') await deleteDoc(userQueueRef);
        
        const qA = query(collection(db, 'gameRooms'), where('playerA.uid', '==', user.uid), where('status', '==', 'playing'));
        const snapA = await getDocs(qA);
        if (!snapA.empty) { setGameRoomId(snapA.docs[0].id); return; }

        const qB = query(collection(db, 'gameRooms'), where('playerB.uid', '==', user.uid), where('status', '==', 'playing'));
        const snapB = await getDocs(qB);
        if (!snapB.empty) { setGameRoomId(snapB.docs[0].id); return; }
      } catch (err) {}
    };
    checkExistingStatus();
  }, [user]);

  const handleGoogleLogin = async () => {
    try { await signInWithPopup(auth, new GoogleAuthProvider()); } catch (e) { alert("로그인 실패"); }
  };

  const handleLogout = async () => {
    if (user) await deleteDoc(doc(db, 'matchQueue', user.uid)).catch(() => {});
    await signOut(auth);
    setGameState(null);
    setGameRoomId(null);
    setUser(null);
  };

  const handleProfileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result;
      setMyProfilePic(base64String);
      localStorage.setItem(`profile_pic_${user.uid}`, base64String);
      if (user) await setDoc(doc(db, 'users', user.uid), { profilePic: base64String, email: user.email }, { merge: true });
    };
    reader.readAsDataURL(file);
  };

  const startMatching = async () => {
    if (!user) return;
    setMatching(true);
    setCoords(INITIAL_LAYOUT_COORDS);
    matchedRef.current = false;
    
    try {
      const q = query(collection(db, 'matchQueue'), where('status', '==', 'waiting'));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const opponentDoc = querySnapshot.docs[0];
        const opponentData = opponentDoc.data();

        if (opponentData.uid !== user.uid) {
          matchedRef.current = true;
          const roomId = `room-${Date.now()}`;
          const isUserFirst = Math.random() > 0.5;
          const playerADeck = shuffleDeck(DEFAULT_DECK);
          const playerBDeck = shuffleDeck(DEFAULT_DECK);

          await setDoc(doc(db, 'gameRooms', roomId), {
            playerA: { uid: user.uid, email: user.email, hp: 30, energy: isUserFirst ? 1 : 0, maxEnergy: isUserFirst ? 1 : 0, field: [], hand: playerADeck.splice(0, isUserFirst ? 3 : 4), deck: playerADeck },
            playerB: { uid: opponentData.uid, email: opponentData.email, hp: 30, energy: isUserFirst ? 0 : 1, maxEnergy: isUserFirst ? 0 : 1, field: [], hand: playerBDeck.splice(0, isUserFirst ? 4 : 3), deck: playerBDeck },
            currentTurnUid: isUserFirst ? user.uid : opponentData.uid,
            firstPlayerUid: isUserFirst ? user.uid : opponentData.uid,
            globalTurn: 1, winner: null, status: 'playing'
          });

          await updateDoc(doc(db, 'matchQueue', opponentDoc.id), { status: 'matched', roomId });
          await deleteDoc(doc(db, 'matchQueue', user.uid)).catch(() => {});
          setGameRoomId(roomId);
          setMatching(false);
          return;
        }
      }

      await setDoc(doc(db, 'matchQueue', user.uid), { uid: user.uid, email: user.email, status: 'waiting', createdAt: Date.now() });
      const unsubscribe = onSnapshot(doc(db, 'matchQueue', user.uid), (snap) => {
        if (snap.exists() && snap.data().status === 'matched') {
          matchedRef.current = true;
          setGameRoomId(snap.data().roomId);
          setMatching(false);
          unsubscribe();
          deleteDoc(doc(db, 'matchQueue', user.uid)).catch(() => {});
        }
      });
      matchUnsubscribeRef.current = unsubscribe;
    } catch (err) { setMatching(false); }
  };

  const cancelMatching = async () => {
    if (isCancelling) return;
    setIsCancelling(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    if (!matchedRef.current) {
      if (matchUnsubscribeRef.current) { matchUnsubscribeRef.current(); matchUnsubscribeRef.current = null; }
      await deleteDoc(doc(db, 'matchQueue', user.uid)).catch(() => {});
      setMatching(false);
    }
    setIsCancelling(false);
  };

  const getRole = () => (!gameState || !user || !gameState.playerA) ? null : (gameState.playerA.uid === user.uid ? 'playerA' : 'playerB');
  const getOpponentRole = () => getRole() === 'playerA' ? 'playerB' : 'playerA';

  const endTurn = async () => {
    const myRole = getRole();
    const oppRole = getOpponentRole();
    if (!gameState || gameState.currentTurnUid !== user.uid || !myRole) return;

    const updatedData = { ...gameState };
    if (user.uid !== gameState.firstPlayerUid) updatedData.globalTurn = (updatedData.globalTurn || 1) + 1;

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
      if (updatedData[oppRole].hp <= 0) { updatedData.winner = user.uid; updatedData.status = 'finished'; }
    } else if (targetType === 'minion') {
      const defender = updatedData[oppRole].field[targetIdx];
      if (!defender) return;

      defender.hp -= attacker.atk;
      attacker.canAttack = false;

      if (defender.hp <= 0 && defender.name !== '유령') updatedData[oppRole].field.splice(targetIdx, 1);
    }

    await updateDoc(doc(db, 'gameRooms', gameRoomId), updatedData);
    setSelectedAttackerIdx(null);
  };

  const handleSurrender = async () => {
    if (!window.confirm("정말로 기권하시겠습니까? 즉시 패배 처리됩니다.")) return;
    await updateDoc(doc(db, 'gameRooms', gameRoomId), { status: 'finished', winner: gameState[getOpponentRole()].uid });
  };

  // 💡 수정된 부분: '#'으로 시작하는 색상값은 숫자로 변환하지 않고 그대로 둡니다.
  const handleSliderChange = (key, value) => {
    setCoords(prev => ({
      ...prev,
      [key]: typeof value === 'string' && value.startsWith('#') ? value : Number(value)
    }));
  };

  if (isAuthChecking) return <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-400 font-bold">정보 확인 중...</div>;
  if (!user) return <LoginView handleGoogleLogin={handleGoogleLogin} />;
  if (!gameState) return <LobbyView user={user} showTester={showTester} setShowTester={setShowTester} handleLogout={handleLogout} myProfilePic={myProfilePic} handleProfileUpload={handleProfileUpload} matching={matching} isCancelling={isCancelling} cancelMatching={cancelMatching} startMatching={startMatching} />;

  const myRole = getRole();
  const oppRole = getOpponentRole();

  return (
    <GameRoomView
      gameState={gameState} user={user} gameRoomId={gameRoomId} oppState={gameState[oppRole]} myState={gameState[myRole]}
      isMyTurn={gameState.currentTurnUid === user.uid} selectedAttackerIdx={selectedAttackerIdx} setSelectedAttackerIdx={setSelectedAttackerIdx}
      attackTarget={attackTarget} playCard={playCard} endTurn={endTurn} handleSurrender={handleSurrender}
      oppProfilePic={oppProfilePic} myProfilePic={myProfilePic} coords={coords} showTester={showTester} setShowTester={setShowTester}
      handleSliderChange={handleSliderChange} setGameState={setGameState}
    />
  );
}