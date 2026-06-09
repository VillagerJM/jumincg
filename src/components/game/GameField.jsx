import React from 'react';
import { PremiumCard } from '../card/PremiumCard';

export const GameField = ({ fieldCards, isOpponentField, isMyTurn, selectedAttackerIdx, setSelectedAttackerIdx, attackTarget, coords }) => {
  return (
    <div className="w-full h-full flex justify-center items-center gap-4 px-2 overflow-visible">
      {fieldCards.map((card, idx) => {
        let borderClass = 'border-stone-900';
        let wrapperClass = 'relative transition-all duration-300 z-10 w-[15vh] shrink-0';

        if (isOpponentField) {
          borderClass = selectedAttackerIdx !== null && isMyTurn ? 'border-red-500 scale-105 shadow-xl shadow-red-600/50 cursor-pointer' : 'border-red-950/40 cursor-default';
        } else {
          const isSelected = selectedAttackerIdx === idx;
          const isAttackable = card.canAttack && isMyTurn;

          if (isAttackable) wrapperClass += ' animate-short-bounce';

          if (isSelected) {
            borderClass = 'border-yellow-400 scale-110 shadow-xl shadow-yellow-500/70 cursor-pointer';
            wrapperClass = wrapperClass.replace('z-10', 'z-50');
          } else if (isAttackable) {
            borderClass = 'border-green-400 cursor-pointer';
          } else {
            borderClass = 'border-blue-950/40 cursor-default';
          }
        }

        return (
          <div key={idx} className={wrapperClass}>
            <PremiumCard 
              card={card} 
              coords={coords}
              onClick={() => {
                if (isOpponentField) {
                  if (selectedAttackerIdx !== null && isMyTurn) attackTarget('minion', idx);
                } else {
                  if (isMyTurn && card.canAttack) setSelectedAttackerIdx(idx);
                }
              }} 
              borderClass={borderClass} 
              sizeClass="w-full" 
            />
          </div>
        );
      })}
    </div>
  );
};