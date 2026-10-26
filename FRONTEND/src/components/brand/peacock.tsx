"use client";

/** A tiny peacock: body, head with crest, and a fanned tail of eye-feathers. */
export function Peacock({ size = 32 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
      {[-60, -35, -12, 12, 35, 60].map((a, i) => (
        <g key={i} transform={`rotate(${a} 32 44)`}>
          <ellipse cx={32} cy={20} rx={6} ry={14} fill="#2a8a7a" />
          <circle cx={32} cy={13} r={4.5} fill="#f0c35a" /><circle cx={32} cy={13} r={2.6} fill="#1e3a8a" />
        </g>
      ))}
      <ellipse cx={32} cy={46} rx={8} ry={10} fill="#1d4ed8" />
      <circle cx={32} cy={33} r={5.5} fill="#1d4ed8" />
      <circle cx={33.8} cy={32} r={1.3} fill="#fff" /><circle cx={34} cy={32} r={0.6} fill="#111" />
      <path d="M 37 33.5 L 41 34.5 L 37 35.5 Z" fill="#f0c35a" />
      {[-1, 0, 1].map((k) => <g key={k}><line x1={32 + k * 2} y1={28} x2={32 + k * 3} y2={23} stroke="#1d4ed8" strokeWidth={1} /><circle cx={32 + k * 3} cy={22.5} r={1.2} fill="#f0c35a" /></g>)}
    </svg>
  );
}
