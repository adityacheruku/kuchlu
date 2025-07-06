export interface AssistiveTouchPlugin {
  /**
   * Request SYSTEM_ALERT_WINDOW (“draw over other apps”) permission on Android.
   * Always resolves to { granted: boolean }.
   */
  requestOverlayPermission(): Promise<{ granted: boolean }>;

  /**
   * Show the floating button. `options.label` can be used as contentDescription (Android)
   * or accessibilityLabel (iOS).
   */
  show(options: { label: string; authToken?: string }): Promise<void>;


  /**
   * Hide/remove the floating button.
   */
  hide(): Promise<void>;

  /**
   * Get the current status of the assistive touch button.
   * Returns { isEnabled: boolean } indicating if the button is currently active.
   */
  getStatus(): Promise<{ isEnabled: boolean }>;
}
