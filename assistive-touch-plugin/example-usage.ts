import { AssistiveTouchPlugin } from 'assistivetouch';

/**
 * Example implementation of the AssistiveTouch plugin with production-ready
 * security, error handling, and user feedback.
 */

class AssistiveTouchManager {
    private isInitialized = false;
    private authToken: string | null = null;

    /**
     * Initialize the assistive touch functionality
     */
    async initialize(token: string): Promise<boolean> {
        try {
            // Store the auth token securely
            await AssistiveTouchPlugin.setAuthToken({ token });
            this.authToken = token;

            // Request overlay permission (Android)
            const { granted } = await AssistiveTouchPlugin.requestOverlayPermission();
            if (!granted) {
                this.showToast('Please enable overlay permission in Settings to use this feature.', 'warning');
                return false;
            }

            // Show the floating button
            await AssistiveTouchPlugin.show({
                label: 'Mood Share',
                authToken: token,
                opacity: 0.9
            });

            this.isInitialized = true;
            this.showToast('Assistive touch enabled!', 'success');
            return true;

        } catch (error) {
            console.error('Failed to initialize assistive touch:', error);
            this.showToast('Failed to initialize assistive touch. Please try again.', 'error');
            return false;
        }
    }

    /**
     * Send a mood with comprehensive error handling and user feedback
     */
    async sendMood(moodName: string, moodEmoji: string): Promise<boolean> {
        if (!this.isInitialized) {
            this.showToast('Assistive touch not initialized. Please try again.', 'error');
            return false;
        }

        try {
            // Show loading state
            this.showToast('Sending mood...', 'info');

            await AssistiveTouchPlugin.sendMood({
                mood_name: moodName,
                mood_emoji: moodEmoji
            });

            // Success feedback
            this.showToast(`${moodEmoji} Mood sent!`, 'success');
            return true;

        } catch (error) {
            // Handle specific error types with user-friendly messages
            const errorMessage = this.getErrorMessage(error);
            this.showToast(errorMessage, 'error');

            // Log error for debugging
            console.error('Failed to send mood:', error);
            return false;
        }
    }

    /**
     * Send a "Thought of you" message with error handling
     */
    async sendThoughtOfYou(): Promise<boolean> {
        if (!this.isInitialized) {
            this.showToast('Assistive touch not initialized. Please try again.', 'error');
            return false;
        }

        try {
            // Show loading state
            this.showToast('Sending thought...', 'info');

            await AssistiveTouchPlugin.sendThoughtOfYou();

            // Success feedback
            this.showToast('💭 Thought sent!', 'success');
            return true;

        } catch (error) {
            // Handle specific error types
            const errorMessage = this.getErrorMessage(error);
            this.showToast(errorMessage, 'error');

            console.error('Failed to send thought:', error);
            return false;
        }
    }

    /**
     * Update mood options dynamically
     */
    async updateMoodOptions(moodOptions: Array<{ name: string; emoji: string; custom?: boolean }>): Promise<boolean> {
        try {
            await AssistiveTouchPlugin.updateMenu({ moodOptions });
            this.showToast('Mood menu updated!', 'success');
            return true;
        } catch (error) {
            console.error('Failed to update mood options:', error);
            this.showToast('Failed to update mood menu. Please try again.', 'error');
            return false;
        }
    }

    /**
     * Set button opacity
     */
    async setOpacity(opacity: number): Promise<boolean> {
        try {
            await AssistiveTouchPlugin.setOpacity({ opacity });
            return true;
        } catch (error) {
            console.error('Failed to set opacity:', error);
            return false;
        }
    }

    /**
     * Hide the floating button
     */
    async hide(): Promise<void> {
        try {
            await AssistiveTouchPlugin.hide();
            this.isInitialized = false;
            this.showToast('Assistive touch disabled', 'info');
        } catch (error) {
            console.error('Failed to hide assistive touch:', error);
        }
    }

    /**
     * Get current status
     */
    async getStatus(): Promise<{ isEnabled: boolean }> {
        try {
            return await AssistiveTouchPlugin.getStatus();
        } catch (error) {
            console.error('Failed to get status:', error);
            return { isEnabled: false };
        }
    }

    /**
     * Parse error messages and return user-friendly versions
     */
    private getErrorMessage(error: any): string {
        const message = error.message || 'Unknown error occurred';

        // Network-related errors
        if (message.includes('timeout') || message.includes('timed out')) {
            return 'Request timed out. Please check your connection and try again.';
        }

        if (message.includes('unreachable') || message.includes('network')) {
            return 'No internet connection. Please check your network and try again.';
        }

        if (message.includes('cannot reach') || message.includes('cannot connect')) {
            return 'Cannot reach server. Please check your connection and try again.';
        }

        // Authentication errors
        if (message.includes('Authentication failed') || message.includes('log in again')) {
            return 'Your session has expired. Please log in again.';
        }

        if (message.includes('Auth token not found')) {
            return 'Please log in to use this feature.';
        }

        // Permission errors
        if (message.includes('Do Not Disturb')) {
            return 'Your partner is in Do Not Disturb mode. Try again later.';
        }

        if (message.includes('Too many requests') || message.includes('rate limited')) {
            return 'Too many requests. Please wait a moment before trying again.';
        }

        // Server errors
        if (message.includes('Server is temporarily unavailable') || message.includes('Server error')) {
            return 'Server is temporarily unavailable. Please try again later.';
        }

        if (message.includes('Unexpected error')) {
            return 'An unexpected error occurred. Please try again.';
        }

        // Fallback
        return 'Something went wrong. Please try again.';
    }

    /**
     * Show toast notification (implement based on your UI framework)
     */
    private showToast(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info'): void {
        // This is a placeholder - implement based on your toast/notification system
        console.log(`[${type.toUpperCase()}] ${message}`);

        // Example implementation with a simple toast library:
        // toast.show(message, { type });

        // Or with a custom notification system:
        // this.notificationService.show({
        //   message,
        //   type,
        //   duration: type === 'error' ? 5000 : 3000
        // });
    }
}

/**
 * Example usage in a React/Vue component or service
 */
export class AssistiveTouchService {
    private manager = new AssistiveTouchManager();

    /**
     * Initialize the service when user logs in
     */
    async initialize(authToken: string): Promise<boolean> {
        return await this.manager.initialize(authToken);
    }

    /**
     * Handle mood selection from the floating button
     */
    async handleMoodSelection(moodName: string, moodEmoji: string): Promise<void> {
        const success = await this.manager.sendMood(moodName, moodEmoji);

        if (success) {
            // Additional success handling (e.g., update UI, analytics)
            this.trackMoodSent(moodName);
        }
    }

    /**
     * Handle double-tap for "Thought of you"
     */
    async handleThoughtOfYou(): Promise<void> {
        const success = await this.manager.sendThoughtOfYou();

        if (success) {
            // Additional success handling
            this.trackThoughtSent();
        }
    }

    /**
     * Update mood options (e.g., from user preferences)
     */
    async updateMoodOptions(): Promise<void> {
        const customMoods = [
            { name: 'workout', emoji: '💪', custom: true },
            { name: 'coffee', emoji: '☕', custom: true },
            { name: 'music', emoji: '🎵', custom: true },
            { name: 'study', emoji: '📚', custom: true },
            { name: 'sleep', emoji: '😴', custom: true }
        ];

        const defaultMoods = [
            { name: 'happy', emoji: '😊', custom: false },
            { name: 'sad', emoji: '😢', custom: false },
            { name: 'excited', emoji: '🤩', custom: false },
            { name: 'love', emoji: '🥰', custom: false },
            { name: 'think', emoji: '🤔', custom: false },
            { name: 'laugh', emoji: '😂', custom: false }
        ];

        await this.manager.updateMoodOptions([...defaultMoods, ...customMoods]);
    }

    /**
     * Cleanup when user logs out
     */
    async cleanup(): Promise<void> {
        await this.manager.hide();
    }

    /**
     * Analytics tracking (example)
     */
    private trackMoodSent(moodName: string): void {
        // Implement your analytics tracking
        console.log(`Mood sent: ${moodName}`);
    }

    private trackThoughtSent(): void {
        // Implement your analytics tracking
        console.log('Thought of you sent');
    }
}

/**
 * Example React hook for using the service
 */
export function useAssistiveTouch() {
    const [isEnabled, setIsEnabled] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const service = useMemo(() => new AssistiveTouchService(), []);

    const initialize = useCallback(async (authToken: string) => {
        setIsLoading(true);
        try {
            const success = await service.initialize(authToken);
            setIsEnabled(success);
            return success;
        } finally {
            setIsLoading(false);
        }
    }, [service]);

    const sendMood = useCallback(async (moodName: string, moodEmoji: string) => {
        await service.handleMoodSelection(moodName, moodEmoji);
    }, [service]);

    const sendThought = useCallback(async () => {
        await service.handleThoughtOfYou();
    }, [service]);

    const cleanup = useCallback(async () => {
        await service.cleanup();
        setIsEnabled(false);
    }, [service]);

    return {
        isEnabled,
        isLoading,
        initialize,
        sendMood,
        sendThought,
        cleanup
    };
}

/**
 * Example usage in a React component
 */
export function AssistiveTouchProvider({ children, authToken }: { children: React.ReactNode; authToken: string }) {
    const { isEnabled, isLoading, initialize, cleanup } = useAssistiveTouch();

    useEffect(() => {
        if (authToken) {
            initialize(authToken);
        }

        return () => {
            cleanup();
        };
    }, [authToken, initialize, cleanup]);

    if (isLoading) {
        return <div>Initializing assistive touch...</div>;
    }

    return (
        <div>
        { children }
            {
        isEnabled && (
            <div className="assistive-touch-status" >
                Assistive touch is active
                    </div>
            )
    }
    </div>
    );
}

/**
 * Example of handling the floating button interactions
 */
export function handleFloatingButtonInteraction() {
    // This would be called by the plugin when the floating button is tapped
    const handleSingleTap = () => {
        // Show mood selector
        showMoodSelector();
    };

    const handleDoubleTap = async () => {
        // Send "Thought of you"
        const service = new AssistiveTouchService();
        await service.handleThoughtOfYou();
    };

    return { handleSingleTap, handleDoubleTap };
}

/**
 * Example mood selector component
 */
export function MoodSelector({ onMoodSelect }: { onMoodSelect: (mood: string, emoji: string) => void }) {
    const moods = [
        { name: 'happy', emoji: '😊' },
        { name: 'sad', emoji: '😢' },
        { name: 'excited', emoji: '🤩' },
        { name: 'love', emoji: '🥰' },
        { name: 'think', emoji: '🤔' },
        { name: 'laugh', emoji: '😂' }
    ];

    return (
        <div className= "mood-selector" >
        {
            moods.map(mood => (
                <button
                    key= { mood.name }
                    onClick = {() => onMoodSelect(mood.name, mood.emoji)}
    className = "mood-button"
        >
        { mood.emoji } { mood.name }
    </button>
            ))
}
</div>
    );
}

// TypeScript types for better development experience
export interface MoodOption {
    name: string;
    emoji: string;
    custom?: boolean;
}

export interface AssistiveTouchConfig {
    label: string;
    authToken: string;
    opacity?: number;
}

export interface AssistiveTouchStatus {
    isEnabled: boolean;
}

// Export the main manager for direct usage
export { AssistiveTouchManager }; 