
export interface MoodOption {
  id: string;
  label: string;
  emoji: string;
}

export interface AssistiveTouchPlugin {
  requestOverlayPermission(): Promise<{ granted: boolean }>;
  show(options: { label: string; authToken?: string; opacity?: number; apiUrl?: string; }): Promise<void>;
  hide(): Promise<void>;
  getStatus(): Promise<{ isEnabled: boolean }>;
  setAuthToken(options: { token: string }): Promise<void>;
  setOpacity(options: { opacity: number }): Promise<void>;
  updateMenu(options: { moods: MoodOption[] }): Promise<void>;
}
