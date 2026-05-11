function seeded(index: number, salt: number) {
  const value = Math.sin(index * 999 + salt * 137) * 10000;
  return value - Math.floor(value);
}

function FloatingParticle({
  delay,
  duration,
  opacity,
  x,
  size,
}: {
  delay: number;
  duration: number;
  opacity: number;
  x: number;
  size: number;
}) {
  return (
    <div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: size,
        height: size,
        left: `${x}%`,
        bottom: '-20px',
        background: `radial-gradient(circle, rgba(251, 191, 36, ${opacity}) 0%, transparent 70%)`,
        animation: `particleRise ${duration}s ease-in infinite`,
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
          delay={seeded(i, 1) * 5}
          duration={8 + seeded(i, 2) * 6}
          opacity={0.4 + seeded(i, 3) * 0.3}
          x={seeded(i, 4) * 100}
          size={10 + seeded(i, 5) * 20}
        />
      ))}
    </>
  );
}
