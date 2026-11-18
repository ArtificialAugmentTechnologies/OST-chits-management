import { useRef, type ReactNode, type PointerEvent } from "react";

/** Pointer-driven depth is decorative only; content and focus order stay unchanged. */
export function DepthSurface({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const move = (event: PointerEvent<HTMLDivElement>) => {
    const node = ref.current;
    if (!node || event.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = node.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    node.style.setProperty("--tilt-x", `${-y * 5}deg`);
    node.style.setProperty("--tilt-y", `${x * 5}deg`);
  };
  const reset = () => {
    ref.current?.style.setProperty("--tilt-x", "0deg");
    ref.current?.style.setProperty("--tilt-y", "0deg");
  };
  return <div ref={ref} className={`depth-surface ${className}`} onPointerMove={move} onPointerLeave={reset}>{children}</div>;
}