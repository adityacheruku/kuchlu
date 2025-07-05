
"use client";

// This service acts as a bridge to native Capacitor plugins.
// It calls the real native plugins when running on a device,
// and provides simulated functionality for web development.

// Helper to check if the app is running in a native Capacitor container
const isNativePlatform = () => {
    return typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform();
};

type CapacitorEvent = 'singleTap' | 'doubleTap' | 'longPress';
type CapacitorEventListener = (data?: any) => void;

class CapacitorService {
    private listeners: Map<CapacitorEvent, Set<CapacitorEventListener>> = new Map();

    constructor() {
        if (isNativePlatform()) {
            this.registerNativeEventListeners();
        }
    }
    
    // Checks if the specific AssistiveTouch plugin is available
    private isPluginAvailable = (): boolean => {
        return isNativePlatform() && !!(window as any).Capacitor?.Plugins?.AssistiveTouch;
    }
    
    private registerNativeEventListeners() {
        if (!this.isPluginAvailable()) return;
        
        const { AssistiveTouch } = (window as any).Capacitor.Plugins;

        AssistiveTouch.addListener('singleTap', () => this.emit('singleTap'));
        AssistiveTouch.addListener('doubleTap', () => this.emit('doubleTap'));
        AssistiveTouch.addListener('longPress', () => this.emit('longPress'));
    }

    public on(event: CapacitorEvent, callback: CapacitorEventListener): () => void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(callback);
        
        return () => {
            this.listeners.get(event)?.delete(callback);
        };
    }

    private emit(event: CapacitorEvent, data?: any) {
        this.listeners.get(event)?.forEach(callback => callback(data));
    }

    public requestOverlayPermission = async (
        showDialog: (callbacks: { onConfirm: () => void, onCancel: () => void }) => void
    ): Promise<boolean> => {
        if (!this.isPluginAvailable()) {
            console.warn("AssistiveTouch plugin not available. Simulating success for web UI flow.");
            // On web, we show the dialog and simulate a "grant" to test the UI flow
            return new Promise(resolve => {
                showDialog({ 
                    onConfirm: () => resolve(true),
                    onCancel: () => resolve(false)
                });
            });
        }
        
        // On native, show the explanatory dialog before sending user to system settings.
        return new Promise((resolve) => {
            const handleConfirm = async () => {
                try {
                    const { AssistiveTouch } = (window as any).Capacitor.Plugins;
                    // This native method is expected to open the system settings page.
                    // It doesn't return a value, so we resolve true to let the UI update.
                    // The user grants/denies permission in the OS settings.
                    await AssistiveTouch.requestOverlayPermission();
                    resolve(true); 
                } catch (error) {
                    console.error("Error requesting overlay permission via plugin:", error);
                    resolve(false);
                }
            };

            const handleCancel = () => {
                resolve(false);
            };
            
            showDialog({ onConfirm: handleConfirm, onCancel: handleCancel });
        });
    };

    public showFloatingButton = async (): Promise<void> => {
        if (!this.isPluginAvailable()) {
            console.log("SIMULATING: Show floating button.");
            return;
        }
        const { AssistiveTouch } = (window as any).Capacitor.Plugins;
        await AssistiveTouch.show({ size: 56, opacity: 0.8 });
    };
    
    public hideFloatingButton = async (): Promise<void> => {
        if (!this.isPluginAvailable()) {
            console.log("SIMULATING: Hide floating button.");
            return;
        }
        const { AssistiveTouch } = (window as any).Capacitor.Plugins;
        await AssistiveTouch.hide();
    };
}

export const capacitorService = new CapacitorService();
