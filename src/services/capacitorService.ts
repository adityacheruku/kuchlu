
"use client";

// This service acts as a bridge to native Capacitor plugins.
// It calls the real native plugins when running on a device,
// and provides simulated functionality for web development.

import { Capacitor, type PluginListenerHandle } from '@capacitor/core';

type CapacitorEvent = 'singleTap' | 'doubleTap' | 'longPress';
type CapacitorEventListener = (data?: any) => void;

interface AssistiveTouchPlugin {
  // Methods
  requestOverlayPermission(): Promise<void>;
  show(options: { size: number, opacity: number }): Promise<void>;
  hide(): Promise<void>;
  getStatus(): Promise<{ isEnabled: boolean }>;

  // Event Listeners
  addListener(eventName: 'singleTap', listenerFunc: () => void): Promise<PluginListenerHandle> & PluginListenerHandle;
  addListener(eventName: 'doubleTap', listenerFunc: () => void): Promise<PluginListenerHandle> & PluginListenerHandle;
  addListener(eventName: 'longPress', listenerFunc: () => void): Promise<PluginListenerHandle> & PluginListenerHandle;
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
    
    // Checks if the specific AssistiveTouch plugin is available
    private isPluginAvailable = (): boolean => {
        return this.isNative && !!this.assistiveTouch;
    }
    
    public on(event: CapacitorEvent, callback: CapacitorEventListener): (() => void) {
        if (!this.isPluginAvailable()) {
            console.log(`[Web Simulator] Skipping listener for '${event}' event.`);
            return () => {}; // Return a no-op unsubscribe function for web
        }

        const handle = this.assistiveTouch!.addListener(event, callback);
        
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

    public showFloatingButton = async (): Promise<void> => {
        if (!this.isPluginAvailable()) {
            console.log("[Web Simulator] Show floating button.");
            return;
        }
        try {
            await this.assistiveTouch!.show({ size: 56, opacity: 0.8 });
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
            // This is a new method the plugin developer needs to implement.
            return await this.assistiveTouch!.getStatus();
        } catch (error) {
             console.error('CapacitorService: Error executing native getStatus():', error);
             return { isEnabled: false };
        }
    }
}

export const capacitorService = new CapacitorService();
