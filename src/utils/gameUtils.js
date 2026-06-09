export const shuffleDeck = (deck) => {
  return [...deck].sort(() => Math.random() - 0.5).map((card, idx) => ({ ...card, instanceId: `${card.id}-${idx}-${Date.now()}` }));
};