import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase'; // 우리가 만든 파이어베이스 통로
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

export default function App() {
  const [user, setUser] = useState(null);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);

  // 1️⃣ 앱이 켜질 때 유저가 로그인 상태인지 확인
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        // 로그인이 되어 있다면, Firestore(DB)에서 내 점수를 가져옴
        const userRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(userRef);
        
        if (docSnap.exists()) {
          // 기존 유저라면 저장된 점수를 불러옴
          setScore(docSnap.data().score);
        } else {
          // 처음 가입한 유저라면 DB에 점수를 0으로 새로 만들어줌 (setDoc)
          await setDoc(userRef, {
            email: currentUser.email,
            score: 0
          });
          setScore(0);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2️⃣ 구글 로그인 팝업 띄우기
  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("로그인 에러:", error);
      alert("로그인에 실패했습니다.");
    }
  };

  // 3️⃣ 로그아웃
  const handleLogout = async () => {
    await signOut(auth);
    setScore(0);
  };

  // 4️⃣ 점수 올리고 DB에 저장하기
  const handleIncreaseScore = async () => {
    if (!user) return;

    // 화면의 점수를 즉시 +1 해서 빠르게 보여줌 (최적화)
    const newScore = score + 1;
    setScore(newScore);

    // Firebase DB에 바뀐 점수를 업데이트해서 영구 저장 (updateDoc)
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, {
      score: newScore
    });
  };

  // 데이터를 불러오는 중일 때 보여줄 화면
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-white">
        <div className="text-xl">로딩 중...</div>
      </div>
    );
  }

  // ------------------------------------------------
  // 🎨 화면(UI) 그리기
  // ------------------------------------------------
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-white font-sans">
      
      {/* ❌ 비로그인 상태 화면 */}
      {!user ? (
        <div className="flex flex-col items-center space-y-6">
          <h1 className="text-4xl font-bold text-yellow-400">데이터 저장 테스트</h1>
          <p className="text-slate-300">로그인하여 나만의 점수를 저장해 보세요!</p>
          <button 
            onClick={handleGoogleLogin}
            className="px-6 py-3 bg-white text-slate-900 font-bold rounded-full shadow-lg hover:bg-slate-200 transition-colors flex items-center gap-2"
          >
            {/* 간단한 구글 아이콘 대체 (G) */}
            <span className="text-blue-600 font-extrabold text-xl">G</span> 구글로 계속하기
          </button>
        </div>
      ) 
      
      // ✅ 로그인 상태 화면
      : (
        <div className="flex flex-col items-center space-y-8 w-full max-w-md bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700">
          
          <div className="flex items-center justify-between w-full border-b border-slate-600 pb-4">
            <div className="text-slate-300 text-sm">
              환영합니다, <span className="font-bold text-white">{user.email}</span> 님!
            </div>
            <button 
              onClick={handleLogout}
              className="px-3 py-1 bg-red-600/20 text-red-400 text-xs font-bold rounded hover:bg-red-600/40 transition-colors"
            >
              로그아웃
            </button>
          </div>

          <div className="flex flex-col items-center space-y-2">
            <div className="text-slate-400 text-lg">내 기록</div>
            <div className="text-7xl font-extrabold text-yellow-400">{score}</div>
          </div>

          <button 
            onClick={handleIncreaseScore}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-2xl shadow-[0_4px_0_rgb(37,99,235)] hover:shadow-[0_2px_0_rgb(37,99,235)] hover:translate-y-0.5 transition-all active:shadow-none active:translate-y-1"
          >
            점수 올리기 (+1)
          </button>
          
          <p className="text-xs text-slate-500 text-center">
            버튼을 누를 때마다 Firestore 데이터베이스에 실시간으로 점수가 영구 저장됩니다. <br/>새로고침해도 점수가 유지됩니다!
          </p>

        </div>
      )}
    </div>
  );
}