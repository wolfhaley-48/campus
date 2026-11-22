import { useEffect, useState } from "react";

const COLORS = ["#3448dd", "#dcec9b", "#ffdfbd", "#c1f1ed", "#70205f"];

export function PaperBurst({ trigger }) {
  const [pieces, setPieces] = useState([]);

  useEffect(() => {
    if (!trigger) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const next = Array.from({ length: 12 }, (_, index) => {
      const angle = (index / 12) * Math.PI * 2;
      return {
        id: `${trigger}-${index}`,
        dx: Math.round(Math.cos(angle) * (44 + (index % 4) * 18)),
        dy: Math.round(Math.sin(angle) * (34 + (index % 3) * 16) - 10),
        rotate: (index * 37) % 180,
        color: COLORS[index % COLORS.length],
      };
    });
    setPieces(next);
    const timer = window.setTimeout(() => setPieces([]), 700);
    return () => window.clearTimeout(timer);
  }, [trigger]);

  if (!pieces.length) return null;

  return (
    <span className="paper-burst" aria-hidden="true">
      {pieces.map((piece) => (
        <i
          key={piece.id}
          style={{
            "--dx": `${piece.dx}px`,
            "--dy": `${piece.dy}px`,
            "--r": `${piece.rotate}deg`,
            "--bit": piece.color,
          }}
        />
      ))}
    </span>
  );
}
