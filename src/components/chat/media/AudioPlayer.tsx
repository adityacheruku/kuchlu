"use client";

import { useState, useRef, memo, useCallback, useEffect } from 'react';
import type { Message } from '@/types'; // Assuming Message type is defined here
import { cn } from '@/lib/utils'; // Utility for conditional class names
import { useToast } from '@/hooks/use-toast'; // Toast notifications
import { useCachedMediaUrl } from '@/hooks/useCachedMediaUrl'; // Custom hook for cached media URLs
import { Button } from '@/components/ui/button'; // Shadcn-ui Button
import { Slider } from '@/components/ui/slider'; // Shadcn-ui Slider
import Spinner from '@/components/common/Spinner'; // Your custom Spinner component
import { Play, Pause, AlertTriangle } from 'lucide-react'; // Icons

// Helper function to format time (e.g., 65 seconds -> 01:05)
const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
};

interface AudioPlayerProps {
    message: Message;
    isCurrentUser: boolean;
    // Optional: Callback when audio starts playing
    onPlay?: (messageId: string) => void;
    // Optional: Callback when audio pauses
    onPause?: (messageId: string) => void;
    // Optional: Callback when audio ends
    onEnded?: (messageId: string) => void;
}

const AudioPlayer = ({ message, isCurrentUser, onPlay, onPause, onEnded }: AudioPlayerProps) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0); // Initialize to 0, update from metadata
    const [currentTime, setCurrentTime] = useState(0);
    const [hasError, setHasError] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [isAudioLoaded, setIsAudioLoaded] = useState(false); // New state to track if audio metadata is loaded

    const { toast } = useToast();

    // Determine which audio version to use. Prioritize mp3_audio if available.
    const version = message.file_metadata?.urls?.mp3_audio ? 'mp3_audio' : 'original';
    // Fetch the signed URL for the audio file, handling caching and loading state.
    const { displayUrl: signedAudioUrl, isLoading: isLoadingSignedUrl } = useCachedMediaUrl(message, version);

    // Memoize the playback rates array to prevent unnecessary re-creations
    const PLAYBACK_RATES = [1, 1.5, 2];

    // Toggle playback rate through predefined steps
    const handleTogglePlaybackRate = useCallback(() => {
        setPlaybackRate(prevRate => {
            const currentIndex = PLAYBACK_RATES.indexOf(prevRate);
            const nextIndex = (currentIndex + 1) % PLAYBACK_RATES.length;
            const newRate = PLAYBACK_RATES[nextIndex];
            if (audioRef.current) {
                audioRef.current.playbackRate = newRate;
            }
            return newRate;
        });
    }, [PLAYBACK_RATES]); // Dependency array includes PLAYBACK_RATES

    // Handle play/pause logic
    const handlePlayPause = useCallback(() => {
        const audio = audioRef.current;
        if (!audio || hasError || isLoadingSignedUrl || !signedAudioUrl) {
            // Prevent interaction if audio not ready, in error, or URL is still loading
            if (hasError) toast({ variant: 'destructive', title: 'Audio Error', description: 'Cannot play due to previous error.' });
            return;
        }

        if (isPlaying) {
            audio.pause();
            setIsPlaying(false);
            onPause?.(message.id); // Call optional onPause callback
        } else {
            // Dispatch a custom event to pause all other audio players
            const playEvent = new CustomEvent('audio-play', { detail: { player: audio } });
            document.dispatchEvent(playEvent);

            audio.play().then(() => {
                setIsPlaying(true);
                onPlay?.(message.id); // Call optional onPlay callback
            }).catch(e => {
                console.error(`Audio play failed for message ${message.id}:`, e);
                setHasError(true);
                toast({ variant: 'destructive', title: 'Playback Error', description: 'Could not play audio. Please try again.' });
            });
        }
    }, [isPlaying, signedAudioUrl, isLoadingSignedUrl, hasError, message.id, toast, onPlay, onPause]);

    // Handle seeking within the audio
    const handleSeek = useCallback((value: number[]) => {
        const audio = audioRef.current;
        if (audio && !isNaN(value[0])) { // Ensure value is a valid number
            audio.currentTime = value[0];
            setCurrentTime(value[0]);
        }
    }, []);

    // Effect for handling audio element events and global play/pause
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return; // Exit if audio element is not yet available

        // Update audio source and playback rate when signedUrl or playbackRate changes
        if (signedAudioUrl && audio.src !== signedAudioUrl) {
            audio.src = signedAudioUrl;
            // Load metadata to ensure duration is available immediately after source change
            audio.load();
        }
        audio.playbackRate = playbackRate;

        // --- Event Handlers ---
        // Global play event listener: pauses other players
        const handleGlobalPlay = (event: Event) => {
            // Pause this audio if another player starts playing
            if ((event as CustomEvent).detail.player !== audio && isPlaying) {
                audio.pause();
                setIsPlaying(false);
            }
        };

        // Updates current time during playback
        const updateTime = () => setCurrentTime(audio.currentTime);

        // Updates duration once metadata is loaded
        const updateDuration = () => {
            if (!isNaN(audio.duration) && isFinite(audio.duration)) {
                setDuration(audio.duration);
                setIsAudioLoaded(true); // Mark as loaded once duration is known
            } else {
                setDuration(0); // Reset if duration is invalid
                setIsAudioLoaded(false); // Mark as not loaded if metadata is bad
            }
        };

        // Handles audio ending
        const handleEnd = () => {
            setIsPlaying(false);
            setCurrentTime(0); // Reset to start
            onEnded?.(message.id); // Call optional onEnded callback
        };

        // Handles audio errors during loading or playback
        const handleError = (e: Event) => {
            console.error(`Audio error for message ${message.id}:`, audio.error, e);
            setHasError(true);
            setIsPlaying(false); // Stop playback on error
            setIsAudioLoaded(false); // Audio failed to load
            toast({ variant: "destructive", title: "Playback Error", description: `Failed to play audio for message ${message.id}.` });
        };
        
        // --- Attach Event Listeners ---
        audio.addEventListener('timeupdate', updateTime);
        audio.addEventListener('loadedmetadata', updateDuration); // When initial metadata is loaded
        audio.addEventListener('ended', handleEnd);
        audio.addEventListener('error', handleError);
        document.addEventListener('audio-play', handleGlobalPlay);

        // --- Cleanup ---
        return () => {
            audio.removeEventListener('timeupdate', updateTime);
            audio.removeEventListener('loadedmetadata', updateDuration);
            audio.removeEventListener('ended', handleEnd);
            audio.removeEventListener('error', handleError);
            document.removeEventListener('audio-play', handleGlobalPlay);
            // Ensure audio is stopped and src is cleared to prevent memory leaks/re-fetching
            audio.pause();
            audio.src = '';
        };
    }, [signedAudioUrl, playbackRate, message.id, toast, isPlaying, onEnded]); // Dependencies for useEffect

    // Adjust UI classes based on current user for styling
    const playerColorClass = isCurrentUser ? 'text-primary-foreground' : 'text-secondary-foreground';
    // Slider styling classes for current user vs. other user
    const sliderThumbClass = isCurrentUser ? '[&>span]:bg-primary-foreground' : '[&>span]:bg-primary';
    const sliderTrackClass = isCurrentUser ? 'bg-primary-foreground/30' : 'bg-secondary-foreground/30';
    const sliderRangeClass = isCurrentUser ? 'bg-primary-foreground' : 'bg-secondary-foreground';

    // Render error state if hasError is true
    if (hasError) {
        return (
            <div className={cn("flex items-center gap-2 p-2 rounded-lg", isCurrentUser ? "bg-primary/20 text-red-300" : "bg-secondary/20 text-red-500")}>
                <AlertTriangle size={18} aria-hidden="true" />
                <span className="text-sm font-medium">Audio playback error.</span>
                <Button variant="ghost" size="sm" onClick={() => setHasError(false)} className={cn("ml-auto text-xs", isCurrentUser ? 'text-red-300 hover:bg-white/20' : 'text-red-500 hover:bg-black/10')}>Retry</Button>
            </div>
        );
    }

    // Determine if player controls should be disabled
    const isDisabled = !signedAudioUrl || isLoadingSignedUrl || !isAudioLoaded;

    return (
        <div className={cn(
            "flex items-center gap-2 w-full max-w-[250px] sm:max-w-xs p-2 rounded-lg",
            isCurrentUser ? "bg-primary" : "bg-secondary",
            playerColorClass
        )}>
            {/* Hidden audio element */}
            <audio ref={audioRef} preload="metadata" />

            {/* Play/Pause Button */}
            <Button
                variant="ghost"
                size="icon"
                onClick={handlePlayPause}
                className={cn(
                    "w-10 h-10 rounded-full flex-shrink-0 transition-colors duration-200",
                    isCurrentUser ? 'hover:bg-white/20 focus-visible:ring-offset-primary' : 'hover:bg-black/10 focus-visible:ring-offset-secondary',
                    isDisabled && "opacity-50 cursor-not-allowed" // Visually disable when not ready
                )}
                aria-label={isPlaying ? "Pause audio" : "Play audio"}
                disabled={isDisabled} // Disable button if audio is not ready
            >
                {isLoadingSignedUrl || !isAudioLoaded ? (
                    <Spinner size={20} className={playerColorClass} /> // Show spinner while loading URL or metadata
                ) : isPlaying ? (
                    <Pause size={20} className={playerColorClass} aria-hidden="true" />
                ) : (
                    <Play size={20} className={cn("ml-0.5", playerColorClass)} aria-hidden="true" />
                )}
            </Button>

            {/* Progress Slider */}
            <div className="flex-grow flex flex-col justify-center gap-1.5 w-full min-w-[100px]">
                <Slider
                    value={[currentTime]}
                    max={duration > 0 ? duration : 1} // Ensure max is > 0 to prevent issues
                    step={0.1}
                    onValueChange={handleSeek}
                    className="w-full h-1"
                    classNames={{
                        track: cn('h-1 rounded-full', sliderTrackClass),
                        range: cn('h-1 rounded-full', sliderRangeClass),
                        thumb: cn('h-3 w-3 border-2', sliderThumbClass) // Added border for better visibility
                    }}
                    aria-label="Audio playback progress"
                    disabled={isDisabled} // Disable slider if audio is not ready
                />
                <div className="flex justify-between text-[0.65rem] font-medium opacity-80 select-none">
                    <span className="sr-only">Current time: {formatTime(currentTime)}</span>
                    <span aria-hidden="true">{formatTime(currentTime)}</span>
                    <span className="sr-only">Total duration: {formatTime(duration)}</span>
                    <span aria-hidden="true">{formatTime(duration)}</span>
                </div>
            </div>

            {/* Playback Rate Button */}
            <Button
                variant="ghost"
                size="sm"
                onClick={handleTogglePlaybackRate}
                className={cn(
                    "w-12 h-8 rounded-full text-xs font-mono transition-colors duration-200",
                    isCurrentUser ? 'hover:bg-white/20 focus-visible:ring-offset-primary' : 'hover:bg-black/10 focus-visible:ring-offset-secondary',
                    isDisabled && "opacity-50 cursor-not-allowed" // Visually disable
                )}
                aria-label={`Current playback speed ${playbackRate.toFixed(1)}x. Click to change.`}
                disabled={isDisabled} // Disable button if audio is not ready
            >
                {playbackRate.toFixed(1)}x
            </Button>
        </div>
    );
};

AudioPlayer.displayName = 'AudioPlayer';
export default memo(AudioPlayer);