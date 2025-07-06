import { WebPlugin } from '@capacitor/core';

import type { AssistiveTouchPluginPlugin } from './definitions';

export class AssistiveTouchPluginWeb extends WebPlugin implements AssistiveTouchPluginPlugin {
  private button: HTMLElement | null = null;
  private isEnabled = false;

  async requestOverlayPermission(): Promise<{ granted: boolean }> {
    // Web doesn't support overlay permissions, return true
    return { granted: true };
  }

  async show(options: { label: string; authToken?: string }): Promise<void> {
    if (this.button) {
      return; // Already shown
    }

    this.button = document.createElement('div');
    this.button.style.cssText = `
      position: fixed;
      top: 300px;
      left: 100px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background-color: #8B5CF6;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      cursor: pointer;
      z-index: 9999;
      user-select: none;
      touch-action: none;
    `;
    this.button.textContent = '⚡️';
    this.button.setAttribute('aria-label', options.label || 'Assistive Touch');

    // Add event listeners for gestures
    this.setupGestureHandlers();

    document.body.appendChild(this.button);
    this.isEnabled = true;
  }

  async hide(): Promise<void> {
    if (this.button) {
      this.button.remove();
      this.button = null;
      this.isEnabled = false;
    }
  }

  async getStatus(): Promise<{ isEnabled: boolean }> {
    return { isEnabled: this.isEnabled };
  }

  private setupGestureHandlers() {
    if (!this.button) return;

    let tapCount = 0;
    let lastTapTime = 0;
    let isLongPress = false;
    let longPressTimer: number | null = null;
    const LONG_PRESS_DELAY = 500;
    const DOUBLE_TAP_DELAY = 300;

    const triggerHaptic = (type: 'light' | 'medium' | 'heavy') => {
      if ('vibrate' in navigator) {
        switch (type) {
          case 'light':
            navigator.vibrate(50);
            break;
          case 'medium':
            navigator.vibrate([0, 40, 50, 40]);
            break;
          case 'heavy':
            navigator.vibrate(100);
            break;
        }
      }
    };

    const handleSingleTap = () => {
      triggerHaptic('light');
      this.notifyListeners('singleTap', {});
    };

    const handleDoubleTap = () => {
      triggerHaptic('medium');
      this.notifyListeners('doubleTap', {});
    };

    const handleLongPress = () => {
      triggerHaptic('heavy');
      this.notifyListeners('longPress', {});
    };

    // Mouse events for desktop
    this.button.addEventListener('mousedown', (e) => {
      e.preventDefault();
      isLongPress = false;

      longPressTimer = window.setTimeout(() => {
        isLongPress = true;
        handleLongPress();
      }, LONG_PRESS_DELAY);
    });

    this.button.addEventListener('mouseup', (e) => {
      e.preventDefault();
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }

      if (!isLongPress) {
        const currentTime = Date.now();
        if (currentTime - lastTapTime < DOUBLE_TAP_DELAY) {
          handleDoubleTap();
          tapCount = 0;
          lastTapTime = 0;
        } else {
          tapCount = 1;
          lastTapTime = currentTime;
          handleSingleTap();
        }
      }
    });

    // Touch events for mobile
    this.button.addEventListener('touchstart', (e) => {
      e.preventDefault();
      isLongPress = false;

      longPressTimer = window.setTimeout(() => {
        isLongPress = true;
        handleLongPress();
      }, LONG_PRESS_DELAY);
    });

    this.button.addEventListener('touchend', (e) => {
      e.preventDefault();
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }

      if (!isLongPress) {
        const currentTime = Date.now();
        if (currentTime - lastTapTime < DOUBLE_TAP_DELAY) {
          handleDoubleTap();
          tapCount = 0;
          lastTapTime = 0;
        } else {
          tapCount = 1;
          lastTapTime = currentTime;
          handleSingleTap();
        }
      }
    });

    // Dragging functionality
    let isDragging = false;
    let startX = 0;
    let startY = 0;

    const startDrag = (clientX: number, clientY: number) => {
      isDragging = true;
      startX = clientX - this.button!.offsetLeft;
      startY = clientY - this.button!.offsetTop;
    };

    const doDrag = (clientX: number, clientY: number) => {
      if (!isDragging || !this.button) return;

      const newX = clientX - startX;
      const newY = clientY - startY;

      // Keep button within viewport bounds
      const maxX = window.innerWidth - this.button.offsetWidth;
      const maxY = window.innerHeight - this.button.offsetHeight;

      this.button.style.left = Math.max(0, Math.min(newX, maxX)) + 'px';
      this.button.style.top = Math.max(0, Math.min(newY, maxY)) + 'px';
    };

    const stopDrag = () => {
      isDragging = false;
    };

    // Mouse drag
    this.button.addEventListener('mousedown', (e) => {
      if (e.button === 0) { // Left mouse button only
        startDrag(e.clientX, e.clientY);
      }
    });

    document.addEventListener('mousemove', (e) => {
      doDrag(e.clientX, e.clientY);
    });

    document.addEventListener('mouseup', () => {
      stopDrag();
    });

    // Touch drag
    this.button.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      startDrag(touch.clientX, touch.clientY);
    });

    document.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      doDrag(touch.clientX, touch.clientY);
    });

    document.addEventListener('touchend', () => {
      stopDrag();
    });
  }
}
