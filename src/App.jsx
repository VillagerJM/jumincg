import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

// 📚 우표 데이터 (사용자님이 자유롭게 추가 및 수정하세요!)
// filename: 실제 public/stamps 폴더에 넣을 이미지 파일 이름입니다.
const STAMPS = [
  { id: 1, name: '치탄다 에루 우표', desc: '내 아내임', rarity: '전설', filename: '001.png' },
  { id: 2, name: '웃긴 우표', desc: '웃끼끼.', rarity: '희귀', filename: '002.png' },
  { id: 3, name: '이상 우표', desc: '날개야 다시 돋아라.\n날자. 날자. 날자. 한 번만 더 날자꾸나.\n한 번만 더 날아 보자꾸나.g', rarity: '전설', filename: '003.png' },
  { id: 4, name: '양치 우표', desc: '양치를 30분간 하자.', rarity: '일반', filename: '004.png' },
  { id: 5, name: '5번 우표', desc: '5번 우표이다.', rarity: '희귀', filename: '005.png' },
  { id: 6, name: '6번 우표', desc: '6번 우표이다.', rarity: '희귀', filename: '006.png' },
  { id: 7, name: '정사각숭이 우표', desc: '정확한 정사각형 원숭이 우표.', rarity: '전설', filename: '007.png' },
  { id: 8, name: '8번 우표', desc: '6번 우표이다.', rarity: '전설', filename: '006.png' },
  { id: 9, name: '9번 우표', desc: '9번 우표이다.', rarity: '일반', filename: '006.png' },
  { id: 10, name: '빙과 우표', desc: '6번 우표이다.', rarity: '일반', filename: '006.png' },
  { id: 11, name: '앙버블 우표', desc: '6번 우표이다.', rarity: '희귀', filename: '006.png' },
  { id: 12, name: '김철순 우표', desc: '김철순 추모', rarity: '희귀', filename: '006.png' },
  { id: 13, name: '이종윤 우표', desc: '보고싶은 이존윤', rarity: '일반', filename: '006.png' },
  { id: 14, name: '엄필규 우표', desc: '6번 우표이다.', rarity: '일반', filename: '006.png' },
  { id: 15, name: '바보임? 우표', desc: '6번 우표이다.', rarity: '일반', filename: '006.png' },
  { id: 16, name: '우표 우표', desc: '6번 우표이다.', rarity: '일반', filename: '006.png' },
];

const COOLDOWN_MS = 15 * 60 * 1000; // 1시간 (밀리초 단위)

export default function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState({ collection: [], nextPullTime: 0 });
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState('MAIN'); // MAIN, GACHA, COLLECTION
  const [timeLeft, setTimeLeft] = useState(0);

  const [drawnStamp, setDrawnStamp] = useState(null);
  const [selectedStamp, setSelectedStamp] = useState(null); // 모달용

  // 1️⃣ 로그인 감지 및 데이터 불러오기
  // 1️⃣ 로그인 감지 및 데이터 불러오기
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(userRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          // 💡 수정된 부분: 예전 클리커 게임 데이터만 있는 경우를 대비해 안전장치(기본값) 추가!
          setUserData({
            ...data,
            collection: data.collection || [],
            nextPullTime: data.nextPullTime || 0
          });
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
  // 3️⃣ 우표 뽑기 로직
  // 3️⃣ 우표 뽑기 로직 (중복 방지 및 유동적 확률 적용)
  const handleDraw = async () => {
    if (timeLeft > 0) return;

    // 1. 아직 수집하지 않은 우표들만 걸러내기
    const uncollectedStamps = STAMPS.filter(
      (stamp) => !userData.collection.includes(stamp.id)
    );

    if (uncollectedStamps.length === 0) return; // 모두 모았으면 함수 종료

    // 2. 남은 우표들의 희귀도 존재 여부 확인
    const hasCommon = uncollectedStamps.some((s) => s.rarity === '일반');
    const hasRare = uncollectedStamps.some((s) => s.rarity === '희귀');
    const hasLegendary = uncollectedStamps.some((s) => s.rarity === '전설');

    // 3. 상황에 따른 확률 배분
    let probs = {};
    if (hasCommon && hasRare && hasLegendary) {
      probs = { '일반': 60, '희귀': 30, '전설': 10 };
    } else if (!hasCommon && hasRare && hasLegendary) {
      probs = { '희귀': 70, '전설': 30 }; // 일반이 없을 때
    } else if (hasCommon && !hasRare && hasLegendary) {
      probs = { '일반': 90, '전설': 10 }; // 희귀가 없을 때
    } else if (hasCommon && hasRare && !hasLegendary) {
      probs = { '일반': 60, '희귀': 40 }; // 전설이 없을 때
    } else if (hasCommon && !hasRare && !hasLegendary) {
      probs = { '일반': 100 }; // 일반만 남았을 때
    } else if (!hasCommon && hasRare && !hasLegendary) {
      probs = { '희귀': 100 }; // 희귀만 남았을 때
    } else if (!hasCommon && !hasRare && hasLegendary) {
      probs = { '전설': 100 }; // 전설만 남았을 때
    }

    // 4. 확률에 따라 무슨 희귀도를 뽑을지 결정 (0 ~ 99.99 랜덤)
    const rand = Math.random() * 100;
    let selectedRarity = '';
    let cumulative = 0;
    
    for (const [rarity, prob] of Object.entries(probs)) {
      cumulative += prob;
      if (rand < cumulative) {
        selectedRarity = rarity;
        break;
      }
    }

    // 5. 결정된 희귀도 안에서 '동등한 확률'로 하나 뽑기
    const pool = uncollectedStamps.filter((s) => s.rarity === selectedRarity);
    const randomStamp = pool[Math.floor(Math.random() * pool.length)];

    // 6. DB 업데이트 및 쿨타임 적용
    const now = Date.now();
    const currentCooldown = user.email === 'juminham123@gmail.com' ? 10 * 1000 : COOLDOWN_MS;
    const newNextPullTime = now + currentCooldown;
    const newCollection = [...userData.collection, randomStamp.id]; // 중복이 원천 차단되므로 그냥 푸시

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
        <h1 className="text-5xl font-bold text-yellow-400">우표 수집에 대한 길고도 짧은 고찰</h1>
        <p className="text-slate-300 text-lg">로그인하고 1시간마다 우표를 모아보세요!</p>
        <button onClick={handleLogin} className="px-6 py-3 bg-white text-slate-900 font-bold rounded shadow-lg">
          구글 계정으로 시작하기
        </button>
      </div>
    );
  }

  return (
    <div className="relative h-screen bg-slate-900 text-white font-custom overflow-hidden">
      
      {/* --- 우측 상단 유저 정보 및 로그아웃 영역 예시 --- */}
      {/* 💡 [수정] flex-1, min-w-0, truncate를 사용해 이메일이 길면 ...으로 잘리게 만듭니다 */}
      <div className="absolute top-4 right-4 flex items-center gap-3 max-w-[70vw] sm:max-w-none">
        <div className="text-xs sm:text-sm text-slate-400 truncate min-w-0 flex-1 text-right">
          {user.email}
        </div>
        <button 
          onClick={handleLogout} 
          className="bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded text-xs sm:text-sm font-bold whitespace-nowrap shrink-0"
        >
          로그아웃
        </button>
      </div>

      {/* --- 화면 전환 로직 --- */}
      {screen === 'MAIN' && (
        <div className="flex flex-col items-center justify-center h-full space-y-6">
          <h1 className="text-6xl font-bold text-yellow-400 mb-8">우표 수집에 대한 길고도 짧은 고찰</h1>
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
            // 🎉 새로운 우표를 뽑았을 때 화면
            <div className="flex flex-col items-center space-y-6 bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700 animate-fade-in">
              <h3 className="text-2xl text-yellow-400 font-bold">새로운 우표 획득!</h3>
              
              <img src={`/stamps/${drawnStamp.filename}`} alt={drawnStamp.name} className="w-48 h-48 object-contain" />
              
              <div className="text-center flex flex-col items-center">
                {/* 💡 [수정] 도감/모달과 동일한 희귀도 배지 스타일 적용 */}
                {(() => {
                  let rClass = "";
                  if (drawnStamp.rarity === '일반') rClass = "text-slate-100 bg-slate-700/60 border border-slate-600/50";
                  else if (drawnStamp.rarity === '희귀') rClass = "text-yellow-400 bg-orange-950/60 border border-orange-500/40";
                  else if (drawnStamp.rarity === '전설') rClass = "text-purple-400 bg-purple-950/50 border border-purple-500/30";
                  
                  return (
                    <span className={`text-sm px-3 py-1 rounded-md font-bold mb-3 shadow-md ${rClass}`}>
                      {drawnStamp.rarity}
                    </span>
                  );
                })()}
                
                <div className="text-4xl font-bold text-white">{drawnStamp.name}</div>
              </div>

              <div className="flex gap-4 w-full mt-4">
                 <button onClick={() => downloadShareImage(drawnStamp)} className="flex-1 py-3 bg-green-600 hover:bg-green-500 rounded-lg font-bold transition-colors">
                   자랑하기 (이미지 저장)
                 </button>
                 <button onClick={() => setDrawnStamp(null)} className="flex-1 py-3 bg-slate-600 hover:bg-slate-500 rounded-lg font-bold transition-colors">
                   확인
                 </button>
              </div>
            </div>
          ) : userData.collection.length >= STAMPS.length ? (
            // 💡 [추가된 부분] 우표를 모두 모았을 때 화면
            <div className="flex flex-col items-center space-y-6 bg-slate-800 p-8 rounded-2xl shadow-2xl border border-yellow-500/50">
              <div className="text-6xl mb-2">🏆</div>
              <h3 className="text-3xl font-bold text-yellow-400 text-center leading-relaxed">
                모든 우표를 <br/>획득하였습니다!!
              </h3>
              <p className="text-slate-300 font-bold">업데이트를 기다려주세요.</p>
            </div>
          ) : (
            // 일반적인 뽑기 대기 화면
            <div className="flex flex-col items-center space-y-6">
              <div className="text-2xl text-slate-300">다음 우표까지:</div>
              <div className={`text-6xl font-bold ${timeLeft <= 0 ? 'text-green-400 animate-pulse' : 'text-slate-400'}`}>
                {formatTime(timeLeft)}
              </div>
              {/* 💡 [수정] hover:brightness-110 클래스를 추가하고 hover 상태일 때는 pulse 애니메이션을 멈추도록 세팅! */}
              <button 
                onClick={handleDraw}
                disabled={timeLeft > 0}
                className={`px-12 py-4 rounded-xl font-bold text-2xl shadow-lg transition-all
                  ${timeLeft > 0 
                    ? 'bg-slate-700 text-slate-500 cursor-not-allowed' 
                    : 'bg-yellow-500 text-yellow-900 hover:bg-yellow-400 hover:scale-105 hover:brightness-130 hover:animate-none animate-pulse'
                  }`}
              >
                뽑기!
              </button>
              <p className="text-slate-500 text-sm">※ 기회는 누적되지 않으니 바로바로 뽑아주세요!</p>
            </div>
          )}
        </div>
      )}

      {screen === 'COLLECTION' && (
        // 💡 [수정1] 모바일에서 패딩을 줄이고(p-4 sm:p-8), 가로 스크롤을 원천 차단(w-full overflow-x-hidden)
        <div className="flex flex-col h-full p-4 sm:p-8 w-full max-w-full overflow-x-hidden">
          
          <button onClick={() => setScreen('MAIN')} className="text-slate-400 hover:text-white mb-4 sm:mb-6 w-fit text-sm sm:text-base">
            ◀ 메인으로
          </button>
          
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-yellow-400">
            도감 ({userData.collection.length} / {STAMPS.length})
          </h2>
          
          {/* 💡 [수정2] 모바일(기본) 2칸, 태블릿 4칸, PC 6칸 / 간격(gap) 조정 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 overflow-y-auto pb-10 w-full px-1">
            {STAMPS.map(stamp => {
              const isUnlocked = userData.collection.includes(stamp.id);
              
              let rarityClass = "";
              if (stamp.rarity === '일반') rarityClass = "text-slate-100 bg-slate-700/60 border border-slate-600/50";
              else if (stamp.rarity === '희귀') rarityClass = "text-yellow-400 bg-orange-950/60 border border-orange-500/40";
              else if (stamp.rarity === '전설') rarityClass = "text-purple-400 bg-purple-950/50 border border-purple-500/30";

              return (
                <div 
                  key={stamp.id} 
                  onClick={() => setSelectedStamp({ ...stamp, isUnlocked })}
                  // 💡 모바일에서 카드가 너무 답답하지 않게 안쪽 여백(p-3) 증가
                  className="flex flex-col items-center bg-slate-800 p-3 sm:p-2 rounded-lg cursor-pointer 
                             hover:bg-slate-700 hover:brightness-110 transition-all duration-150 border border-slate-700 
                             transform translate-z-0 will-change-transform w-full"
                >
                  {/* 상단 레이아웃 (번호와 배지가 겹치지 않게 gap-1 및 shrink-0 추가) */}
                  <div className="flex justify-between items-center w-full mb-3 sm:mb-2 pointer-events-none gap-1">
                    <div className="text-xs text-slate-500 font-bold whitespace-nowrap">No.{String(stamp.id).padStart(3, '0')}</div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap shrink-0 ${rarityClass}`}>
                      {stamp.rarity}
                    </span>
                  </div>

                  {/* 💡 모바일에서 2열이 되면 카드가 커지므로 이미지도 살짝(w-24) 키움 */}
                  <img 
                    src={`/stamps/${stamp.filename}`} 
                    alt="stamp" 
                    className={`w-24 h-24 sm:w-20 sm:h-20 object-contain pointer-events-none ${!isUnlocked ? 'brightness-0 opacity-40' : ''}`} 
                  />
                  <div className="mt-3 sm:mt-2 text-sm font-bold text-center w-full truncate pointer-events-none px-1">
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
            <button onClick={() => setSelectedStamp(null)} className="absolute top-4 right-5 text-slate-400 hover:text-white text-2xl transition-colors">✖</button>
            
            {/* 💡 [수정] mt-6으로 살짝 더 내리고, 번호 크기를 sm과 lg의 중간인 text-base로 조절! */}
            <div className="flex justify-between items-center w-full mt-6 mb-6 px-1">
              <div className="text-base text-slate-400 font-bold tracking-wider">
                No.{String(selectedStamp.id).padStart(3, '0')}
              </div>
              
              {(() => {
                let rClass = "";
                if (selectedStamp.rarity === '일반') rClass = "text-slate-100 bg-slate-700/60 border border-slate-600/50";
                else if (selectedStamp.rarity === '희귀') rClass = "text-yellow-400 bg-orange-950/60 border border-orange-500/40";
                else if (selectedStamp.rarity === '전설') rClass = "text-purple-400 bg-purple-950/50 border border-purple-500/30";
                
                return (
                  <span className={`text-sm px-3 py-1.5 rounded-md font-bold shadow-sm ${rClass}`}>
                    {selectedStamp.rarity}
                  </span>
                );
              })()}
            </div>
            
            <img 
              src={`/stamps/${selectedStamp.filename}`} 
              className={`w-48 h-48 object-contain mb-6 transition-all duration-500 ${!selectedStamp.isUnlocked ? 'brightness-0 opacity-30 scale-95' : 'scale-100'}`} 
              alt="detail"
            />
            
            {selectedStamp.isUnlocked ? (
              <div className="animate-fade-in">
                <h3 className="text-3xl font-bold mb-3 text-white">{selectedStamp.name}</h3>
                {/* 💡 [수정] whitespace-pre-wrap 추가! */}
                <p className="text-slate-300 leading-relaxed break-keep text-lg whitespace-pre-wrap">
                  {selectedStamp.desc}
                </p>
              </div>
            ) : (
              <div className="py-4">
                <h3 className="text-3xl font-bold text-slate-500 mb-2">???</h3>
                <p className="text-slate-500 font-bold">아직 해금되지 않았습니다.</p>
              </div>
            )}

            <button 
              onClick={() => setSelectedStamp(null)}
              className="mt-8 w-full py-4 bg-slate-700 hover:bg-slate-600 rounded-xl font-bold text-lg transition-colors shadow-lg"
            >
              닫기
            </button>
          </div>
        </div>
      )}

    </div>
  );
}