/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';

export interface TouchButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onAction?: () => void | Promise<void>;
  debugId?: string;
  children: React.ReactNode;
}

/**
 * TouchButton provides rock-solid, zero-delay touch and click responsiveness
 * on Android tablets, iPads, mobile devices, and desktop browsers.
 *
 * It prevents Android gesture scroll cancellation by detecting small tap slop (< 14px),
 * triggers immediately on pointer/touchend with zero 300ms delay, and debounces
 * synthetic click events within 450ms to prevent accidental double-execution.
 */
export const TouchButton: React.FC<TouchButtonProps> = ({
  onAction,
  onClick,
  onTouchStart,
  onTouchEnd,
  onPointerUp,
  disabled,
  className = '',
  debugId,
  children,
  type = 'button',
  ...rest
}) => {
  const lastTriggerRef = useRef<number>(0);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);

  const executeAction = (source: string, e: React.SyntheticEvent) => {
    if (disabled) return;
    const now = Date.now();
    if (now - lastTriggerRef.current < 450) {
      // Ignora evento sintético duplicado (ex: click gerado após touchend)
      return;
    }
    lastTriggerRef.current = now;

    if (debugId) {
      console.log(`[TFIVE PROPOSAL DEBUG] touch_trigger source=${source} debugId=${debugId}`);
    }

    if (onAction) {
      onAction();
    } else if (onClick) {
      onClick(e as React.MouseEvent<HTMLButtonElement>);
    }
  };

  return (
    <button
      {...rest}
      type={type}
      disabled={disabled}
      className={`${className} touch-manipulation select-none active:scale-[0.98] transition-transform`}
      onClick={(e) => {
        executeAction('click', e);
      }}
      onTouchStart={(e) => {
        if (onTouchStart) onTouchStart(e);
        if (e.touches && e.touches[0]) {
          touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
      }}
      onTouchEnd={(e) => {
        if (onTouchEnd) onTouchEnd(e);
        if (touchStartPos.current && e.changedTouches && e.changedTouches[0]) {
          const dx = Math.abs(e.changedTouches[0].clientX - touchStartPos.current.x);
          const dy = Math.abs(e.changedTouches[0].clientY - touchStartPos.current.y);
          // Tap slop threshold: tolerância para toque real no vidro de tablet (até 14px de rolagem de dedo)
          if (dx < 14 && dy < 14) {
            executeAction('touchend', e);
          }
        } else {
          executeAction('touchend_fallback', e);
        }
        touchStartPos.current = null;
      }}
      onPointerUp={(e) => {
        if (onPointerUp) onPointerUp(e);
        // Suporte a caneta stylus e ponteiros touch diretos
        if (e.pointerType === 'pen') {
          executeAction('pointerup_pen', e);
        }
      }}
    >
      {children}
    </button>
  );
};
