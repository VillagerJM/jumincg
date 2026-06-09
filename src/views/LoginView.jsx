import React from 'react';
import CustomFontSetup from '../components/common/CustomFontSetup';

export const LoginView = ({ handleGoogleLogin }) => (
  <div className="flex flex-col items-center justify-center h-screen bg-slate-950 text-white">
    <CustomFontSetup />
    <h1 className="text-4xl font-extrabold text-amber-500 mb-6 tracking-wide">Gridlock TCG</h1>
    <button onClick={handleGoogleLogin} className="px-6 py-3 bg-amber-600 rounded-xl font-bold hover:bg-amber-500 transition-colors shadow-lg">구글 로그인</button>
  </div>
);