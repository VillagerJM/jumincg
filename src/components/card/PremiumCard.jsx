import React from 'react';

export const PremiumCard = ({ card, coords, onClick, borderClass, sizeClass = "w-24 sm:w-28 md:w-32" }) => {
  const normalizedId = card.id.split('_')[0]; 
  const illustrationPath = `/images/cards/${normalizedId}.png`;

  return (
    <div
      onClick={(e) => { e.stopPropagation(); if (onClick) onClick(); }}
      className={`relative ${sizeClass} aspect-[5/7] rounded-xl overflow-hidden shadow-2xl select-none transition-all cursor-pointer box-border border-[3px] ${borderClass} hover:z-50 transform-gpu will-change-transform`}
      style={{ containerType: 'inline-size' }}
    >
      <img src={illustrationPath} alt={card.name} className="absolute inset-0 w-full h-full object-fill" onError={(e) => { e.target.style.display = 'none'; }} />
      <img src="/images/card_layout.png" alt="Frame" className="absolute inset-0 w-full h-full object-fill pointer-events-none z-10" onError={(e) => { e.target.className = "absolute inset-0 w-full h-full border border-stone-800 pointer-events-none bg-gradient-to-t from-black/80 to-transparent z-10"; }} />

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