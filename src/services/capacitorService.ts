
"use client";

import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import type { MoodOption } from '@/config/moods';

type CapacitorEvent = 'singleTap' | 'doubleTap' | 'longPress' | 'moodSelected';
type CapacitorEventListener = (data?: any) => void;

interface AssistiveTouchPlugin {
    requestOverlayPermission(): Promise<void>;
    show(options: { opacity: number; authToken?: string; apiUrl?: string; }): Promise<void>;
    hide(): Promise<void>;
    getStatus(): Promise<{ isEnabled: boolean }>;
    updateMenu(options: { moods: MoodOption[] }): Promise<void>;
    setAuthToken(options: { token: string }): Promise<void>;
    setOpacity(options: { opacity: number }): Promise<void>;
    setUserPreferences(options: { hide_bubble_in_app: boolean }): Promise<void>;
    onAppForeground(): Promise<void>;
    onAppBackground(): Promise<void>;

    addListener(eventName: 'singleTap', listenerFunc: () => void): Promise<PluginListenerHandle> & PluginListenerHandle;
    addListener(eventName: 'doubleTap', listenerFunc: () => void): Promise<PluginListenerHandle> & PluginListenerHandle;
    addListener(eventName: 'longPress', listenerFunc: () => void): Promise<PluginListenerHandle> & PluginListenerHandle;
    addListener(eventName: 'moodSelected', listenerFunc: (event: { moodId: string }) => void): Promise<PluginListenerHandle> & PluginListenerHandle;
}

interface SharePlugin {
    share(options: { title?: string; text?: string; url?: string; dialogTitle?: string; }): Promise<any>;
}


class CapacitorService {
    private isNative: boolean;
    private assistiveTouch: AssistiveTouchPlugin | undefined;
    private sharePlugin: SharePlugin | undefined;

    constructor() {
        this.isNative = Capacitor.isNativePlatform();
        if (this.isNative) {
            this.assistiveTouch = (Capacitor.Plugins as any).AssistiveTouch as AssistiveTouchPlugin;
            this.sharePlugin = (Capacitor.Plugins as any).Share as SharePlugin;
        } else {
            console.log("CapacitorService: Running in a web environment. Native features will be simulated.");
        }
    }

    private isPluginAvailable = (): boolean => {
        console.log("CapacitorService: isPluginAvailable", this.isNative, !!this.assistiveTouch, typeof this.assistiveTouch?.addListener === 'function');
        return this.isNative && !!this.assistiveTouch && typeof this.assistiveTouch.addListener === 'function';
    }

    private isSharePluginAvailable = (): boolean => {
        return this.isNative && !!this.sharePlugin && typeof this.sharePlugin.share === 'function';
    }

    public async share(options: { title?: string; text?: string; url?: string; }): Promise<void> {
        if (this.isSharePluginAvailable()) {
            await this.sharePlugin!.share(options);
        } else if (navigator.share) {
            await navigator.share(options);
        } else {
            if (options.url) {
                navigator.clipboard.writeText(options.url);
                alert("Link copied to clipboard. Sharing not available on this device.");
            } else if (options.text) {
                navigator.clipboard.writeText(options.text);
                alert("Text copied to clipboard. Sharing not available on this device.");
            } else {
                throw new Error("Sharing not supported on this device.");
            }
        }
    }

    public on(event: CapacitorEvent, callback: CapacitorEventListener): (() => void) {
        if (!this.isPluginAvailable()) {
            console.log(`[Web Simulator] Skipping listener for '${event}' event because plugin is not available.`);
            return () => { };
        }

        const handlePromise = this.assistiveTouch!.addListener(event as any, callback) as PluginListenerHandle | Promise<PluginListenerHandle>;

        if (handlePromise instanceof Promise) {
            let handle: PluginListenerHandle | undefined;
            handlePromise.then(h => handle = h);
            return () => { if (handle && typeof handle.remove === 'function') handle.remove(); };
        }

        const handle = handlePromise as PluginListenerHandle;
        return () => { if (handle && typeof handle.remove === 'function') handle.remove(); };
    }

    public requestOverlayPermission = async (showDialog: (callbacks: { onConfirm: () => void, onCancel: () => void }) => void): Promise<boolean> => {
        if (!this.isPluginAvailable()) {
            console.log('[Web Simulator] Simulating permission request dialog.');
            return new Promise(resolve => {
                showDialog({ onConfirm: () => resolve(true), onCancel: () => resolve(false) });
            });
        }

        return new Promise((resolve) => {
            const handleConfirm = async () => {
                try {
                    await this.assistiveTouch!.requestOverlayPermission();
                    resolve(true);
                } catch (error) {
                    console.error("CapacitorService: Error calling native requestOverlayPermission plugin:", error);
                    resolve(false);
                }
            };

            showDialog({ onConfirm: handleConfirm, onCancel: () => resolve(false) });
        });
    };

    public showFloatingButton = async (options: { opacity: number; authToken?: string; apiUrl?: string; }): Promise<void> => {
        if (!this.isPluginAvailable()) {
            console.log("[Web Simulator] Show floating button with options:", options);
            return;
        }
        try {
            await this.assistiveTouch!.show(options);
        } catch (error) {
            console.error('CapacitorService: Error executing native show():', error);
        }
    };

    public hideFloatingButton = async (): Promise<void> => {
        if (!this.isPluginAvailable()) {
            console.log("[Web Simulator] Hide floating button.");
            return;
        }
        try {
            await this.assistiveTouch!.hide();
        } catch (error) {
            console.error('CapacitorService: Error executing native hide():', error);
        }
    };

    public getAssistiveTouchStatus = async (): Promise<{ isEnabled: boolean }> => {
        if (!this.isPluginAvailable()) {
            console.log("[Web Simulator] Getting fake status (returning false).");
            return { isEnabled: false };
        }
        try {
            return await this.assistiveTouch!.getStatus();
        } catch (error) {
            console.error('CapacitorService: Error executing native getStatus():', error);
            return { isEnabled: false };
        }
    }

    public updateAssistiveTouchMenu = async (moods: MoodOption[]): Promise<void> => {
        if (!this.isPluginAvailable()) {
            console.log("[Web Simulator] Updating menu with moods:", moods);
            return;
        }
        try {
            await this.assistiveTouch!.updateMenu({ moods });
        } catch (error) {
            console.error('CapacitorService: Error executing native updateMenu():', error);
        }
    }

    public setAuthToken = async (token: string): Promise<void> => {
        if (!this.isPluginAvailable()) {
            console.log("[Web Simulator] Setting auth token.");
            return;
        }
        try {
            await this.assistiveTouch!.setAuthToken({ token });
        } catch (error) {
            console.error('CapacitorService: Error executing native setAuthToken():', error);
        }
    };

    public setOpacity = async (opacity: number): Promise<void> => {
        if (!this.isPluginAvailable()) {
            console.log(`[Web Simulator] Setting opacity to ${opacity}.`);
            return;
        }
        try {
            await this.assistiveTouch!.setOpacity({ opacity });
        } catch (error) {
            console.error('CapacitorService: Error executing native setOpacity():', error);
        }
    };

    public setUserPreferences = async (prefs: { hide_bubble_in_app: boolean }): Promise<void> => {
        if (!this.isPluginAvailable()) {
            console.log('[Web Simulator] Setting user preferences:', prefs);
            return;
        }
        try {
            await this.assistiveTouch!.setUserPreferences(prefs);
        } catch (error) {
            console.error('CapacitorService: Error executing native setUserPreferences():', error);
        }
    };

    public notifyAppForeground = async (): Promise<void> => {
        if (!this.isPluginAvailable()) {
            console.log('[Web Simulator] App foregrounded.');
            return;
        }
        try {
            await this.assistiveTouch!.onAppForeground();
        } catch (error) {
            console.error('CapacitorService: Error executing native onAppForeground():', error);
        }
    };

    public notifyAppBackground = async (): Promise<void> => {
        if (!this.isPluginAvailable()) {
            console.log('[Web Simulator] App backgrounded.');
            return;
        }
        try {
            await this.assistiveTouch!.onAppBackground();
        } catch (error) {
            console.error('CapacitorService: Error executing native onAppBackground():', error);
        }
    };

    // Debug methods for service state and bubble refresh
    public debugService = {
        checkServiceStatus: async () => {
            if (!this.isPluginAvailable()) {
                console.log('[Web Simulator] Debug: Service status (simulated)');
                return { simulated: true };
            }
            if (typeof (this.assistiveTouch as any).getServiceDebugInfo !== 'function') {
                console.warn('getServiceDebugInfo is not implemented on the native plugin.');
                return { error: 'Not implemented' };
            }
            try {
                const status = await (this.assistiveTouch as any).getServiceDebugInfo();
                console.log('Service Debug:', status);
                return status;
            } catch (err) {
                console.error('Error calling getServiceDebugInfo:', err);
                return { error: err };
            }
        },
        forceRefreshBubble: async () => {
            if (!this.isPluginAvailable()) {
                console.log('[Web Simulator] Debug: forceRefreshBubble (simulated)');
                return;
            }
            await (this.hideFloatingButton as any)();
            await new Promise(res => setTimeout(res, 1000));
            await (this.showFloatingButton as any)({ opacity: 1.0, apiUrl: process.env.NEXT_PUBLIC_API_BASE_URL });
        }
    };
}

export const capacitorService = new CapacitorService();
