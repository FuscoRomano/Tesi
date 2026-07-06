import React from 'react';

export default function PatientBadge({ score }: { score: number }) {
  const getStyle = (val: number) => {
    if (val >= 18) return { backgroundColor: '#ef4444', color: 'white' }; // Critico (rosso)
    if (val >= 10) return { backgroundColor: '#facc15', color: 'black' }; // Attenzione (giallo)
    return { backgroundColor: '#22c55e', color: 'white' }; // Stabile (verde)
  };

  return (
    <span 
      style={{
        padding: '0.25rem 0.75rem',
        borderRadius: '9999px',
        fontWeight: 'bold',
        ...getStyle(score)
      }}
    >
      Stato: {score.toFixed(1)}
    </span>
  );
}
