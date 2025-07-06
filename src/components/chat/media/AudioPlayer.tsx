
"use client";

import { useState, useRef, memo, useCallback, useEffect } from 'react';
import type { Message } from '@/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useCachedMediaUrl } from '@/hooks/useCachedMediaUrl';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import Spinner from '@/components/common/Spinner';
import { Play, Pause, AlertTriangle } from 'lucide-react';

const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
};

interface AudioPlayerProps {
    message: Message;
    isCurrentUser: boolean;
    onPlay?: (messageId: string) => void;
    onPause?: (messageId: string) => void;
    onEnded?: (messageId: string) => void;
}

const AudioPlayer = ({ message, isCurrentUser, onPlay, onPause, onEnded }: AudioPlayerProps) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [hasError, setHasError] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [isAudioLoaded, setIsAudioLoaded] = useState(false);

    const { toast } = useToast();

    const version = message.file_metadata?.urls?.mp3_audio ? 'mp3_audio' : 'original';
    const { displayUrl: signedAudioUrl, isLoading: isLoadingSignedUrl } = useCachedMediaUrl(message, version);

    const PLAYBACK_RATES = [1, 1.5, 2];

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
    }, [PLAYBACK_RATES]);

    const handlePlayPause = useCallback(() => {
        const audio = audioRef.current;
        if (hasError || isLoadingSignedUrl || !signedAudioUrl || !isAudioLoaded) {
            if (hasError) toast({ variant: 'destructive', title: 'Audio Error', description: 'Cannot play due to previous error.' });
            return;
        }
        if (!audio) return;

        if (isPlaying) {
            audio.pause();
            setIsPlaying(false);
            onPause?.(message.id);
        } else {
            const playEvent = new CustomEvent('audio-play', { detail: { player: audio } });
            document.dispatchEvent(playEvent);

            audio.play().then(() => {
                setIsPlaying(true);
                onPlay?.(message.id);
            }).catch(e => {
                console.error(`Audio play failed for message ${message.id}:`, e);
                setHasError(true);
                toast({ variant: 'destructive', title: 'Playback Error', description: 'Could not play audio. Please try again.' });
            });
        }
    }, [isPlaying, signedAudioUrl, isLoadingSignedUrl, isAudioLoaded, hasError, message.id, toast, onPlay, onPause]);

    const handleSeek = useCallback((value: number[]) => {
        const audio = audioRef.current;
        if (audio && !isNaN(value[0])) {
            audio.currentTime = value[0];
            setCurrentTime(value[0]);
        }
    }, []);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleGlobalPlay = (event: Event) => {
            if ((event as CustomEvent).detail.player !== audio && isPlaying) {
                audio.pause();
                setIsPlaying(false);
            }
        };

        const updateTime = () => setCurrentTime(audio.currentTime);

        const updateDuration = () => {
            if (!isNaN(audio.duration) && isFinite(audio.duration)) {
                setDuration(audio.duration);
                setIsAudioLoaded(true);
            } else {
                setDuration(0);
                setIsAudioLoaded(false);
            }
        };

        const handleEnd = () => {
            setIsPlaying(false);
            setCurrentTime(0);
            onEnded?.(message.id);
        };

        const handleError = (e: Event) => {
            console.error(`Audio error for message ${message.id}:`, audio.error, e);
            setHasError(true);
            setIsPlaying(false);
            setIsAudioLoaded(false);
            toast({ variant: "destructive", title: "Playback Error", description: `Failed to play audio.` });
        };
        
        audio.addEventListener('timeupdate', updateTime);
        audio.addEventListener('loadedmetadata', updateDuration);
        audio.addEventListener('durationchange', updateDuration);
        audio.addEventListener('ended', handleEnd);
        audio.addEventListener('error', handleError);
        document.addEventListener('audio-play', handleGlobalPlay);
        
        if (signedAudioUrl) {
            if (audio.src !== signedAudioUrl) {
                audio.src = signedAudioUrl;
                audio.load();
            }
        } else {
            if (audio.src) {
                audio.removeAttribute('src');
                audio.load();
            }
            if (!audio.paused) audio.pause();
            setCurrentTime(0);
            setDuration(0);
            setIsPlaying(false);
            setIsAudioLoaded(false);
        }
        
        audio.playbackRate = playbackRate;

        return () => {
            audio.removeEventListener('timeupdate', updateTime);
            audio.removeEventListener('loadedmetadata', updateDuration);
            audio.removeEventListener('durationchange', updateDuration);
            audio.removeEventListener('ended', handleEnd);
            audio.removeEventListener('error', handleError);
            document.removeEventListener('audio-play', handleGlobalPlay);
        };
    }, [signedAudioUrl, playbackRate, message.id, toast, isPlaying, onEnded]);

    const playerColorClass = isCurrentUser ? 'text-primary-foreground' : 'text-secondary-foreground';
    const sliderThumbClass = isCurrentUser ? '[&>span]:bg-black' : '[&>span]:bg-black';
    const sliderTrackClass = isCurrentUser ? 'bg-black/20' : 'bg-black/20';
    const sliderRangeClass = isCurrentUser ? 'bg-black/70' : 'bg-black/70';

    if (hasError) {
        return (
            <div className={cn("flex items-center gap-2 p-2 rounded-lg", isCurrentUser ? "bg-primary/80 text-red-100" : "bg-secondary/80 text-red-500")}>
                <AlertTriangle size={18} aria-hidden="true" />
                <span className="text-sm font-medium">Audio error.</span>
                <Button variant="ghost" size="sm" onClick={() => { setHasError(false); /* Force re-init */ }} className={cn("ml-auto text-xs", isCurrentUser ? 'text-red-100 hover:bg-white/20' : 'text-red-500 hover:bg-black/10')}>Retry</Button>
            </div>
        );
    }

    const isDisabled = !signedAudioUrl || isLoadingSignedUrl || !isAudioLoaded;

    return (
        <div className={cn(
            "flex items-center gap-2 w-full max-w-[280px] sm:max-w-xs p-2 rounded-lg",
            isCurrentUser ? "bg-primary" : "bg-secondary",
            playerColorClass
        )}>
            <audio ref={audioRef} preload="metadata" />

            <Button
                variant="ghost"
                size="icon"
                onClick={handlePlayPause}
                className={cn(
                    "w-10 h-10 rounded-full flex-shrink-0 transition-all duration-200 bg-black hover:bg-zinc-800 text-white focus-visible:ring-offset-primary",
                    isDisabled && "opacity-50 cursor-not-allowed"
                )}
                aria-label={isPlaying ? "Pause audio" : "Play audio"}
                disabled={isDisabled}
            >
                {isLoadingSignedUrl || (!isAudioLoaded && !hasError) ? (
                    <Spinner size={20} className="text-white" />
                ) : isPlaying ? (
                    <Pause size={20} className="text-white" aria-hidden="true" />
                ) : (
                    <Play size={20} className="ml-0.5 text-white" aria-hidden="true" />
                )}
            </Button>
            
            <div className="flex-grow flex items-center gap-2 w-full min-w-[100px]">
                <span className="text-[0.6rem] font-mono opacity-80 select-none flex-shrink-0">{formatTime(currentTime)}</span>
                <Slider
                    value={[currentTime]}
                    max={duration > 0 ? duration : 1}
                    step={0.1}
                    onValueChange={handleSeek}
                    className="w-full h-1 flex-grow"
                    classNames={{
                        track: cn('h-1.5 rounded-full', sliderTrackClass),
                        range: cn('h-1.5 rounded-full', sliderRangeClass),
                        thumb: cn('h-3.5 w-3.5 border-2', sliderThumbClass)
                    }}
                    aria-label="Audio playback progress"
                    disabled={isDisabled}
                />
                 <span className="text-[0.6rem] font-mono opacity-80 select-none flex-shrink-0">{formatTime(duration)}</span>
            </div>


            <Button
                variant="ghost"
                size="sm"
                onClick={handleTogglePlaybackRate}
                className={cn(
                    "w-12 h-8 rounded-full text-xs font-mono transition-colors duration-200",
                    isCurrentUser ? 'hover:bg-black/20 focus-visible:ring-offset-primary text-white' : 'hover:bg-black/10 focus-visible:ring-offset-secondary',
                    isDisabled && "opacity-50 cursor-not-allowed"
                )}
                aria-label={`Current playback speed ${playbackRate.toFixed(1)}x. Click to change.`}
                disabled={isDisabled}
            >
                {playbackRate.toFixed(1)}x
            </Button>
        </div>
    );
};

AudioPlayer.displayName = 'AudioPlayer';
export default memo(AudioPlayer);
