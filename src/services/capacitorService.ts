
"use client";

import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import type { MoodOption } from '@/config/moods';

type CapacitorEvent = 'singleTap' | 'doubleTap' | 'longPress' | 'moodSelected';
type CapacitorEventListener = (data?: any) => void;

interface AssistiveTouchPlugin {
  // Methods
  requestOverlayPermission(): Promise<void>;
  show(options: { opacity: number }): Promise<void>;
  hide(): Promise<void>;
  getStatus(): Promise<{ isEnabled: boolean }>;
  updateMenu(options: { moods: MoodOption[] }): Promise<void>;


  // Event Listeners
  addListener(eventName: 'singleTap', listenerFunc: () => void): Promise<PluginListenerHandle> & PluginListenerHandle;
  addListener(eventName: 'doubleTap', listenerFunc: () => void): Promise<PluginListenerHandle> & PluginListenerHandle;
  addListener(eventName: 'longPress', listenerFunc: () => void): Promise<PluginListenerHandle> & PluginListenerHandle;
  addListener(eventName: 'moodSelected', listenerFunc: (event: { moodId: string }) => void): Promise<PluginListenerHandle> & PluginListenerHandle;
}

class CapacitorService {
    private isNative: boolean;
    private assistiveTouch: AssistiveTouchPlugin | undefined;

    constructor() {
        this.isNative = Capacitor.isNativePlatform();
        if (this.isNative) {
            this.assistiveTouch = Capacitor.Plugins.AssistiveTouch as AssistiveTouchPlugin;
        } else {
            console.log("CapacitorService: Running in a web environment. Native features will be simulated.");
        }
    }
    
    private isPluginAvailable = (): boolean => {
        // More robust check to ensure the plugin and its methods are available
        return this.isNative && !!this.assistiveTouch && typeof this.assistiveTouch.addListener === 'function';
    }
    
    public on(event: CapacitorEvent, callback: CapacitorEventListener): (() => void) {
        if (!this.isPluginAvailable()) {
            console.log(`[Web Simulator] Skipping listener for '${event}' event because plugin is not available.`);
            return () => {}; // Return a no-op unsubscribe function for web
        }

        const handle = this.assistiveTouch!.addListener(event as any, callback);
        
        // Return an unsubscribe function
        return () => {
            handle.remove();
        };
    }

    public requestOverlayPermission = async (
        showDialog: (callbacks: { onConfirm: () => void, onCancel: () => void }) => void
    ): Promise<boolean> => {
        if (!this.isPluginAvailable()) {
            console.log('[Web Simulator] Simulating permission request dialog.');
            return new Promise(resolve => {
                showDialog({ 
                    onConfirm: () => resolve(true),
                    onCancel: () => resolve(false)
                });
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

    public showFloatingButton = async (options: { opacity: number }): Promise<void> => {
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
}

export const capacitorService = new CapacitorService();
