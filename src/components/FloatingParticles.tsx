import React from 'react';

function FloatingParticle({ delay, x, size }: { delay: number; x: number; size: number }) {
  return (
    <div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: size,
        height: size,
        left: `${x}%`,
        bottom: '-20px',
        background: `radial-gradient(circle, rgba(251, 191, 36, ${0.4 + Math.random() * 0.3}) 0%, transparent 70%)`,
        animation: `particleRise ${8 + Math.random() * 6}s ease-in infinite`,
        animationDelay: `${delay}s`,
      }}
    />
  );
}

export default function FloatingParticles() {
  return (
    <>
      {[...Array(20)].map((_, i) => (
        <FloatingParticle
          key={`bg-particle-${i}`}
          delay={Math.random() * 5}
          x={Math.random() * 100}
          size={10 + Math.random() * 20}
        />
      ))}
    </>
  );
}
