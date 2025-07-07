
import { WebPlugin } from '@capacitor/core';
import type { AssistiveTouchPlugin, MoodOption } from './definitions';

export class AssistiveTouchPluginWeb extends WebPlugin implements AssistiveTouchPlugin {
  private button: HTMLElement | null = null;
  private isEnabled = false;

  async requestOverlayPermission(): Promise<{ granted: boolean }> {
    return { granted: true };
  }

  async show(options: { label: string; authToken?: string; opacity?: number; apiUrl?: string }): Promise<void> {
    if (this.button) return;
    this.button = document.createElement('div');
    this.button.style.cssText = `
      position: fixed; top: 300px; left: 100px; width: 60px; height: 60px;
      border-radius: 50%; background-color: #8B5CF6; display: flex;
      align-items: center; justify-content: center; font-size: 24px;
      cursor: pointer; z-index: 9999; user-select: none; touch-action: none;
      opacity: ${options.opacity || 0.8};
    `;
    this.button.textContent = '⚡️';
    this.button.setAttribute('aria-label', options.label || 'Assistive Touch');
    document.body.appendChild(this.button);
    this.isEnabled = true;
    console.log('[AssistiveTouch Web] Show called. Token:', options.authToken, 'API URL:', options.apiUrl);
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

  async setAuthToken(options: { token: string }): Promise<void> {
    console.log('[AssistiveTouch Web] Auth token set.');
  }

  async setOpacity(options: { opacity: number }): Promise<void> {
    console.log(`[AssistiveTouch Web] Opacity set to ${options.opacity}.`);
    if (this.button) {
      this.button.style.opacity = String(options.opacity);
    }
  }

  async updateMenu(options: { moods: MoodOption[] }): Promise<void> {
    console.log('[AssistiveTouch Web] Menu updated with:', options.moods);
  }
}
