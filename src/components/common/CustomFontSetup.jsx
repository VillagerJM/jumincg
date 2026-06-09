import React from 'react';

const CustomFontSetup = () => (
  <style>{`
    @font-face { font-family: 'MyCustomFont'; src: url('/fonts/pfbold.woff2') format('woff2'), url('/fonts/pfbold.ttf') format('truetype'); font-weight: normal; font-style: normal; font-display: block; }
    @font-face { font-family: 'MyNumberFont'; src: url('/fonts/pfbold.woff2') format('woff2'), url('/fonts/pfbold.ttf') format('truetype'); font-weight: bold; font-style: normal; font-display: block; }
    body, .tcg-theme, .tcg-number { font-family: 'MyCustomFont', sans-serif !important; -webkit-font-smoothing: none !important; -moz-osx-font-smoothing: grayscale !important; font-smooth: never !important; text-rendering: geometricPrecision !important; }
    .tcg-number { font-family: 'MyNumberFont', sans-serif !important; }
    @keyframes short-bounce { 0%, 100% { transform: translateY(0) translateZ(0); } 50% { transform: translateY(-8px) translateZ(0); } }
    .animate-short-bounce { animation: short-bounce 0.7s ease-in-out infinite; }
  `}</style>
);

export default CustomFontSetup;