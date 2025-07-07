
"use client";

import { useState, useCallback, useRef, useEffect } from 'react';

const SWIPE_THRESHOLD = 60; // Min pixels to trigger action
const MAX_OPPOSING_SCROLL = 25; // How much vertical scroll is allowed during a horizontal swipe

interface UseSwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeStart?: () => void;
}

export function useSwipe({ onSwipeLeft, onSwipeRight, onSwipeStart }: UseSwipeOptions) {
  const [isDragging, setIsDragging] = useState(false);
  const [translateX, setTranslateX] = useState(0);
  const startPos = useRef({ x: 0, y: 0 });

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Only trigger for primary button or touch
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    startPos.current = { x: e.clientX, y: e.clientY };
    setIsDragging(true);
    onSwipeStart?.();
  }, [onSwipeStart]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    const currentX = e.clientX;
    const currentY = e.clientY;
    const diffX = currentX - startPos.current.x;
    const diffY = Math.abs(currentY - startPos.current.y);

    // If scrolling vertically more than horizontally, cancel the swipe.
    if (diffY > Math.abs(diffX) && diffY > MAX_OPPOSING_SCROLL) {
      setIsDragging(false); // Let the browser handle vertical scroll
      setTranslateX(0);
      return;
    }
    
    // Once a horizontal swipe is initiated, prevent default browser actions.
    if (Math.abs(diffX) > 10) {
      e.preventDefault();
    }

    setTranslateX(diffX);
  }, [isDragging]);

  const handlePointerUp = useCallback(() => {
    if (!isDragging) return;
    
    if (translateX > SWIPE_THRESHOLD && onSwipeRight) {
      onSwipeRight();
    } else if (translateX < -SWIPE_THRESHOLD && onSwipeLeft) {
      onSwipeLeft();
    }
    
    // Reset position after action or if threshold not met
    setIsDragging(false);
    setTranslateX(0);
  }, [isDragging, translateX, onSwipeLeft, onSwipeRight]);

  const handlePointerCancel = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    setTranslateX(0);
  }, [isDragging]);

  return {
    translateX,
    isDragging,
    events: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerCancel,
    },
  };
}
