import React from 'react';

export const LayoutTester = ({ coords, handleSliderChange, setShowTester }) => (
  <div className="w-80 bg-stone-950 border-l border-stone-800 p-2 overflow-y-auto text-xs text-slate-300 z-[60] font-mono flex flex-col justify-between absolute right-0 top-0 h-full shadow-2xl">
    <div>
      <div className="flex justify-between items-center mb-2 pb-1 border-b border-stone-800">
        <span className="font-bold text-amber-500 text-sm">📐 레이아웃/테마 튜너</span>
        <button onClick={() => setShowTester(false)} className="text-red-400 text-[10px]">닫기 ×</button>
      </div>
      <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
        {Object.keys(coords).map((key) => {
          const isColor = key.toLowerCase().includes('color'); // ✅ 컬러 타입 판별
          const isSize = key.toLowerCase().includes('size');
          const isWidth = key.toLowerCase().includes('width');
          let min = 0, max = 100;
          if (isSize) { min = 5; max = 30; }
          if (isWidth) { min = 30; max = 100; }
          
          return (
            <div key={key} className="bg-stone-900/60 p-1.5 rounded border border-stone-800/40">
              <div className="flex justify-between items-center text-[10px] mb-0.5 font-sans">
                <span className="text-slate-400 font-bold">{key}</span>
                {!isColor && <span className="text-amber-400 font-mono font-bold">{coords[key]}{isSize ? 'cqw' : '%'}</span>}
              </div>
              
              {/* ✅ 컬러 값이면 컬러 픽커를, 숫자 값이면 슬라이더를 렌더링 */}
              {isColor ? (
                <div className="flex items-center gap-2">
                  <input type="color" value={coords[key]} onChange={(e) => handleSliderChange(key, e.target.value)} className="w-8 h-6 p-0 border-0 rounded cursor-pointer" />
                  <span className="text-amber-400 font-mono font-bold">{coords[key]}</span>
                </div>
              ) : (
                <input type="range" min={min} max={max} value={coords[key]} onChange={(e) => handleSliderChange(key, e.target.value)} className="w-full accent-amber-500 h-1 bg-stone-700 rounded-lg appearance-none cursor-pointer" />
              )}
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
    </div>
  </div>
);