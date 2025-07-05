
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
        console.log('CapacitorService constructor: Is this a native platform?', isNativePlatform());
        if (isNativePlatform()) {
            this.registerNativeEventListeners();
        }
    }
    
    // Checks if the specific AssistiveTouch plugin is available
    private isPluginAvailable = (): boolean => {
        const available = isNativePlatform() && !!(window as any).Capacitor?.Plugins?.AssistiveTouch;
        console.log('isPluginAvailable check:', available);
        return available;
    }
    
    private registerNativeEventListeners() {
        if (!this.isPluginAvailable()) {
            console.log('AssistiveTouch plugin not found. Skipping native event listener registration.');
            return;
        }
        
        console.log('Registering native AssistiveTouch event listeners...');
        const { AssistiveTouch } = (window as any).Capacitor.Plugins;

        AssistiveTouch.addListener('singleTap', () => {
            console.log('Native event received: singleTap');
            this.emit('singleTap');
        });
        AssistiveTouch.addListener('doubleTap', () => {
            console.log('Native event received: doubleTap');
            this.emit('doubleTap');
        });
        AssistiveTouch.addListener('longPress', () => {
            console.log('Native event received: longPress');
            this.emit('longPress');
        });
        console.log('Native event listeners registered.');
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
        console.log('capacitorService.requestOverlayPermission called.');
        if (!this.isPluginAvailable()) {
            console.log('Platform is not native, showing web dialog simulation.');
            // On web, we show the dialog and simulate a "grant" to test the UI flow
            return new Promise(resolve => {
                showDialog({ 
                    onConfirm: () => {
                        console.log('Web simulation: User confirmed dialog.');
                        resolve(true);
                    },
                    onCancel: () => {
                        console.log('Web simulation: User cancelled dialog.');
                        resolve(false);
                    }
                });
            });
        }
        
        console.log('Platform is native, showing pre-permission dialog.');
        // On native, show the explanatory dialog before sending user to system settings.
        return new Promise((resolve) => {
            const handleConfirm = async () => {
                console.log('User confirmed dialog, calling native requestOverlayPermission...');
                try {
                    const { AssistiveTouch } = (window as any).Capacitor.Plugins;
                    // This native method is expected to open the system settings page.
                    // It doesn't return a value, so we resolve true to let the UI update.
                    // The user grants/denies permission in the OS settings.
                    await AssistiveTouch.requestOverlayPermission();
                    console.log('Native requestOverlayPermission method called successfully.');
                    resolve(true); 
                } catch (error) {
                    console.error("Error calling native requestOverlayPermission plugin:", error);
                    resolve(false);
                }
            };

            const handleCancel = () => {
                console.log('User cancelled pre-permission dialog.');
                resolve(false);
            };
            
            showDialog({ onConfirm: handleConfirm, onCancel: handleCancel });
        });
    };

    public showFloatingButton = async (): Promise<void> => {
        console.log('capacitorService.showFloatingButton called.');
        if (!this.isPluginAvailable()) {
            console.log("SIMULATING: Show floating button.");
            return;
        }
        console.log('Plugin available, calling native AssistiveTouch.show()');
        try {
            const { AssistiveTouch } = (window as any).Capacitor.Plugins;
            await AssistiveTouch.show({ size: 56, opacity: 0.8 });
            console.log('Native AssistiveTouch.show() executed.');
        } catch (error) {
            console.error('Error executing native AssistiveTouch.show():', error);
        }
    };
    
    public hideFloatingButton = async (): Promise<void> => {
        console.log('capacitorService.hideFloatingButton called.');
        if (!this.isPluginAvailable()) {
            console.log("SIMULATING: Hide floating button.");
            return;
        }
        console.log('Plugin available, calling native AssistiveTouch.hide()');
        try {
            const { AssistiveTouch } = (window as any).Capacitor.Plugins;
            await AssistiveTouch.hide();
            console.log('Native AssistiveTouch.hide() executed.');
        } catch (error) {
            console.error('Error executing native AssistiveTouch.hide():', error);
        }
    };
}

export const capacitorService = new CapacitorService();
