import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';

type Position = { x: number; y: number };
type Drag = Position & { pointerId: number; startX: number; startY: number; width: number; height: number; moved: boolean };
const positionKey = 'goalquest-notification-position';
const isMobile = () => window.innerWidth <= 920;

function clamp(position: Position, width = 44, height = 44): Position {
  return {
    x: Math.max(8, Math.min(window.innerWidth - width - 8, position.x)),
    // Keep the bottom navigation accessible, including Settings.
    y: Math.max(8, Math.min(window.innerHeight - height - 96, position.y)),
  };
}

function readPosition(): Position | null {
  try {
    const saved = JSON.parse(localStorage.getItem(positionKey) ?? 'null') as Partial<Position> | null;
    return saved && typeof saved.x === 'number' && Number.isFinite(saved.x)
      && typeof saved.y === 'number' && Number.isFinite(saved.y) ? clamp({ x: saved.x, y: saved.y }) : null;
  } catch { return null; }
}

export function useDraggableNotification() {
  const [mobile, setMobile] = useState(isMobile);
  const [position, setPosition] = useState(readPosition);
  const drag = useRef<Drag | null>(null);
  const latest = useRef<Position | null>(position);
  const suppressClick = useRef(false);

  useEffect(() => {
    const resize = () => {
      setMobile(isMobile());
      setPosition((current) => {
        latest.current = current ? clamp(current) : null;
        return latest.current;
      });
    };
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  function onPointerDown(event: PointerEvent<HTMLButtonElement>) {
    suppressClick.current = false;
    if (!isMobile() || !event.isPrimary || event.button !== 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    drag.current = { x: rect.left, y: rect.top, startX: event.clientX, startY: event.clientY,
      width: rect.width, height: rect.height, pointerId: event.pointerId, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const dx = event.clientX - current.startX;
    const dy = event.clientY - current.startY;
    if (Math.abs(dx) + Math.abs(dy) > 6) current.moved = true;
    if (!current.moved) return;
    latest.current = clamp({ x: current.x + dx, y: current.y + dy }, current.width, current.height);
    setPosition(latest.current);
  }

  function finish(event: PointerEvent<HTMLButtonElement>) {
    if (drag.current?.pointerId !== event.pointerId) return;
    suppressClick.current = drag.current.moved;
    if (drag.current.moved && latest.current) {
      try { localStorage.setItem(positionKey, JSON.stringify(latest.current)); } catch { /* Drag works without storage. */ }
    }
    drag.current = null;
  }

  const style: CSSProperties | undefined = mobile && position ? {
    position: 'fixed', left: position.x, top: position.y, right: 'auto', bottom: 'auto',
  } : undefined;
  return { style, onPointerDown, onPointerMove, onPointerUp: finish, onPointerCancel: finish,
    shouldOpen: () => {
      if (!suppressClick.current) return true;
      suppressClick.current = false;
      return false;
    } };
}
