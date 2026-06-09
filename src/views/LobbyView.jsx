import React from 'react';
import CustomFontSetup from '../components/common/CustomFontSetup';

export const LobbyView = ({ user, showTester, setShowTester, handleLogout, myProfilePic, handleProfileUpload, matching, isCancelling, cancelMatching, startMatching }) => (
  <div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-white relative px-4">
    <CustomFontSetup />
    <div className="absolute top-6 right-6 flex items-center gap-4 bg-slate-800 px-4 py-2 rounded-full border border-slate-700">
      <span className="text-sm text-slate-300 font-bold">{user.email} 님</span>
      <button onClick={() => setShowTester(!showTester)} className={`px-3 py-1 rounded-full text-xs font-black transition-colors ${showTester ? 'bg-amber-500 text-slate-950 hover:bg-amber-400' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
        {showTester ? '📐 좌표창 끄기' : '📐 좌표창 켜기'}
      </button>
      <button onClick={handleLogout} className="px-3 py-1 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-full text-xs font-black transition-colors">로그아웃</button>
    </div>
    
    <h1 className="text-3xl font-bold mb-6 tracking-wider">메인 로비</h1>
    
    <div className="flex flex-col items-center bg-slate-800/40 border border-slate-700/60 rounded-2xl p-5 mb-8 max-w-xs w-full backdrop-blur-sm shadow-xl">
      <div className="drop-shadow-md mb-4">
        <div className="w-14 h-[64.67px] bg-stone-950 relative overflow-hidden" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}>
          <img src={myProfilePic} alt="Lobby Profile" className="w-full h-full object-cover" onError={(e) => { e.target.src = '/images/default_profile.png'; }} />
        </div>
      </div>
      <label className="cursor-pointer bg-slate-700 hover:bg-slate-600 text-slate-100 font-bold text-xs px-4 py-2 rounded-xl border border-slate-600 transition-transform active:scale-95 shadow">
        📷 프로필 사진 변경
        <input type="file" accept="image/*" onChange={handleProfileUpload} className="hidden" />
      </label>
    </div>

    {matching ? (
      <div className="flex flex-col items-center gap-4">
        <div className="text-xl animate-pulse text-amber-400">{isCancelling ? '매칭 취소 처리 중 (엉킴 방지 대기)...' : '매칭 대기 중... 다른 브라우저에서 로그인해 매칭을 시작하세요.'}</div>
        <button onClick={cancelMatching} disabled={isCancelling} className={`px-6 py-2 rounded-xl font-bold text-sm shadow transition-colors ${isCancelling ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-500 active:scale-95'}`}>
          {isCancelling ? '취소 대기 중...' : '❌ 매칭 취소'}
        </button>
      </div>
    ) : (
      <button onClick={startMatching} className="px-10 py-5 bg-blue-600 text-2xl font-black rounded-2xl hover:bg-blue-500 shadow-lg transition-transform hover:scale-105">대전 매칭 시작</button>
    )}
  </div>
);