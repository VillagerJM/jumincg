import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

// 📚 우표 데이터 (사용자님이 자유롭게 추가 및 수정하세요!)
// filename: 실제 public/stamps 폴더에 넣을 이미지 파일 이름입니다.
const STAMPS = [
  { id: 1, name: '1번 우표', desc: '1번 우표이다.', rarity: '일반', filename: '001.png' },
  { id: 2, name: '2번 우표', desc: '2번 우표이다.', rarity: '희귀', filename: '002.png' },
  { id: 3, name: '3번 우표', desc: '3번 우표이다.', rarity: '전설', filename: '003.png' },
  { id: 4, name: '4번 우표', desc: '4번 우표이다.', rarity: '일반', filename: '004.png' },
  { id: 5, name: '5번 우표', desc: '5번 우표이다.', rarity: '희귀', filename: '005.png' },
];

const COOLDOWN_MS = 60 * 60 * 1000; // 1시간 (밀리초 단위)

export default function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState({ collection: [], nextPullTime: 0 });
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState('MAIN'); // MAIN, GACHA, COLLECTION
  const [timeLeft, setTimeLeft] = useState(0);

  const [drawnStamp, setDrawnStamp] = useState(null);
  const [selectedStamp, setSelectedStamp] = useState(null); // 모달용

  // 1️⃣ 로그인 감지 및 데이터 불러오기
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
          setUserData(docSnap.data());
        } else {
          const newData = { email: currentUser.email, collection: [], nextPullTime: 0 };
          await setDoc(userRef, newData);
          setUserData(newData);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2️⃣ 남은 시간 카운트다운 타이머
  useEffect(() => {
    if (!user || screen !== 'GACHA') return;

    const calculateTimeLeft = () => {
      const now = Date.now();
      const remaining = userData.nextPullTime - now;
      setTimeLeft(remaining > 0 ? remaining : 0);
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [user, screen, userData.nextPullTime]);

  const formatTime = (ms) => {
    if (ms <= 0) return '뽑기 가능!';
    const totalSeconds = Math.floor(ms / 1000);
    const m = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const s = String(totalSeconds % 60).padStart(2, '0');
    return `${m}분 ${s}초 남음`;
  };

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const handleLogout = async () => {
    await signOut(auth);
    setScreen('MAIN');
  };

  // 3️⃣ 우표 뽑기 로직
  const handleDraw = async () => {
    if (timeLeft > 0) return;

    // 무작위로 우표 하나 선택 (희귀도에 따른 확률은 추후 자유롭게 구현 가능)
    const randomStamp = STAMPS[Math.floor(Math.random() * STAMPS.length)];
    const now = Date.now();
    const newCollection = [...new Set([...userData.collection, randomStamp.id])]; // 중복 방지 (Set 사용)
    const newNextPullTime = now + COOLDOWN_MS; // 다음 뽑기 시간은 지금부터 1시간 뒤

    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, {
      collection: newCollection,
      nextPullTime: newNextPullTime
    });

    setUserData({ ...userData, collection: newCollection, nextPullTime: newNextPullTime });
    setDrawnStamp(randomStamp);
  };

  // 4️⃣ 이미지 공유(다운로드) 로직 (Canvas API 사용)
  const downloadShareImage = (stamp) => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 700;
    const ctx = canvas.getContext('2d');

    // 배경색 채우기
    ctx.fillStyle = '#1e293b'; 
    ctx.fillRect(0, 0, 600, 700);

    // 텍스트 쓰기
    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    
    const today = new Date();
    const dateStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;
    
    ctx.fillText(`[ ${dateStr} ]`, 300, 60);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px sans-serif';
    const nickname = user.email.split('@')[0];
    ctx.fillText(`${nickname}님이 우표를 뽑았습니다!`, 300, 110);
    
    ctx.fillStyle = '#60a5fa';
    ctx.font = 'bold 32px sans-serif';
    ctx.fillText(`🎉 ${stamp.name} 🎉`, 300, 160);

    // 이미지 그리기
    const img = new Image();
    img.crossOrigin = 'anonymous'; // CORS 에러 방지
    img.src = `/stamps/${stamp.filename}`;
    img.onload = () => {
      // 이미지 중앙 정렬
      ctx.drawImage(img, 150, 220, 300, 300);
      
      // 다운로드 링크 생성
      const link = document.createElement('a');
      link.download = `stamp_${stamp.id}_share.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-900 text-white font-custom text-xl">로딩 중...</div>;

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-white font-custom space-y-6">
        <h1 className="text-5xl font-bold text-yellow-400">우표 수집가</h1>
        <p className="text-slate-300 text-lg">로그인하고 1시간마다 우표를 모아보세요!</p>
        <button onClick={handleLogin} className="px-6 py-3 bg-white text-slate-900 font-bold rounded shadow-lg">
          구글 계정으로 시작하기
        </button>
      </div>
    );
  }

  return (
    <div className="relative h-screen bg-slate-900 text-white font-custom overflow-hidden">
      
      {/* --- 우측 상단 로그아웃 버튼 --- */}
      <div className="absolute top-4 right-4 flex items-center gap-4 z-10">
        <span className="text-sm text-slate-400">{user.email}</span>
        <button onClick={handleLogout} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs">로그아웃</button>
      </div>

      {/* --- 화면 전환 로직 --- */}
      {screen === 'MAIN' && (
        <div className="flex flex-col items-center justify-center h-full space-y-6">
          <h1 className="text-6xl font-bold text-yellow-400 mb-8">우표 수집가</h1>
          <button onClick={() => setScreen('GACHA')} className="w-64 py-4 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-2xl shadow-lg">
            우표 뽑기
          </button>
          <button onClick={() => setScreen('COLLECTION')} className="w-64 py-4 bg-purple-600 hover:bg-purple-500 rounded-xl font-bold text-2xl shadow-lg">
            내 컬렉션 보기
          </button>
        </div>
      )}

      {screen === 'GACHA' && (
        <div className="flex flex-col items-center justify-center h-full space-y-8">
          <button onClick={() => { setScreen('MAIN'); setDrawnStamp(null); }} className="absolute top-4 left-4 text-slate-400 hover:text-white">
            ◀ 메인으로
          </button>
          
          <h2 className="text-4xl font-bold text-white mb-4">우표 뽑기</h2>
          
          {drawnStamp ? (
            <div className="flex flex-col items-center space-y-6 bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700 animate-fade-in">
              <h3 className="text-2xl text-yellow-400 font-bold">새로운 우표 획득!</h3>
              <img src={`/stamps/${drawnStamp.filename}`} alt={drawnStamp.name} className="w-48 h-48 object-contain" />
              <div className="text-center">
                <div className="text-xs text-blue-300 font-bold mb-1">{drawnStamp.rarity}</div>
                <div className="text-3xl font-bold">{drawnStamp.name}</div>
              </div>
              <div className="flex gap-4 w-full">
                 <button onClick={() => downloadShareImage(drawnStamp)} className="flex-1 py-3 bg-green-600 hover:bg-green-500 rounded font-bold">
                   자랑하기 (이미지 저장)
                 </button>
                 <button onClick={() => setDrawnStamp(null)} className="flex-1 py-3 bg-slate-600 hover:bg-slate-500 rounded font-bold">
                   돌아가기
                 </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-6">
              <div className="text-2xl text-slate-300">다음 우표까지:</div>
              <div className={`text-6xl font-bold ${timeLeft <= 0 ? 'text-green-400 animate-pulse' : 'text-slate-400'}`}>
                {formatTime(timeLeft)}
              </div>
              <button 
                onClick={handleDraw}
                disabled={timeLeft > 0}
                className={`px-12 py-4 rounded-xl font-bold text-2xl shadow-lg transition-all ${timeLeft > 0 ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-yellow-500 text-yellow-900 hover:bg-yellow-400 hover:scale-105'}`}
              >
                뽑기!
              </button>
              <p className="text-slate-500 text-sm">※ 기회는 누적되지 않으니 바로바로 뽑아주세요!</p>
            </div>
          )}
        </div>
      )}

      {screen === 'COLLECTION' && (
        <div className="flex flex-col h-full p-8">
          <button onClick={() => setScreen('MAIN')} className="text-slate-400 hover:text-white mb-6 w-fit">
            ◀ 메인으로
          </button>
          
          <h2 className="text-3xl font-bold mb-6 text-yellow-400">도감 ({userData.collection.length} / {STAMPS.length})</h2>
          
          {/* 컬렉션 그리드 */}
          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 overflow-y-auto pb-10">
            {STAMPS.map(stamp => {
              const isUnlocked = userData.collection.includes(stamp.id);
              return (
                <div 
                  key={stamp.id} 
                  onClick={() => setSelectedStamp({ ...stamp, isUnlocked })}
                  className="flex flex-col items-center bg-slate-800 p-2 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors border border-slate-700"
                >
                  <div className="text-xs text-slate-500 mb-2 w-full text-left font-bold">No.{String(stamp.id).padStart(3, '0')}</div>
                  <img 
                    src={`/stamps/${stamp.filename}`} 
                    alt="stamp" 
                    // 💡 핵심: 잠긴 우표는 CSS 필터(brightness-0)로 까만 실루엣 처리합니다.
                    className={`w-20 h-20 object-contain ${!isUnlocked ? 'brightness-0 opacity-40' : ''}`} 
                  />
                  <div className="mt-2 text-sm font-bold text-center w-full truncate">
                    {isUnlocked ? stamp.name : '???'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- 우표 상세 모달창 --- */}
      {selectedStamp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* 배경 블러 처리 */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedStamp(null)}></div>
          
          <div className="relative bg-slate-800 border-2 border-slate-600 p-8 rounded-xl shadow-2xl max-w-sm w-full flex flex-col items-center text-center">
            <button onClick={() => setSelectedStamp(null)} className="absolute top-3 right-4 text-slate-400 hover:text-white text-xl">✖</button>
            
            <div className="text-sm text-yellow-500 font-bold mb-4">No.{String(selectedStamp.id).padStart(3, '0')}</div>
            
            <img 
              src={`/stamps/${selectedStamp.filename}`} 
              className={`w-48 h-48 object-contain mb-6 ${!selectedStamp.isUnlocked ? 'brightness-0 opacity-30' : ''}`} 
              alt="detail"
            />
            
            {selectedStamp.isUnlocked ? (
              <>
                <div className="text-xs px-2 py-1 bg-slate-700 text-blue-300 rounded mb-2 inline-block">{selectedStamp.rarity}</div>
                <h3 className="text-3xl font-bold mb-3">{selectedStamp.name}</h3>
                <p className="text-slate-300 leading-relaxed break-keep">{selectedStamp.desc}</p>
              </>
            ) : (
              <div className="py-6">
                <h3 className="text-2xl font-bold text-slate-400 mb-2">???</h3>
                <p className="text-slate-500">아직 해금되지 않은 우표입니다.</p>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}