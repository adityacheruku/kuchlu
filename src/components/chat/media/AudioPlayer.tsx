
"use client";

import { useState, useRef, memo, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useCachedMediaUrl } from '@/hooks/useCachedMediaUrl';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import Spinner from '@/components/common/Spinner';
import { Play, Pause, AlertTriangle } from 'lucide-react';
import type { Message } from '@/types';

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
            if (audioRef.current) audioRef.current.playbackRate = newRate;
            return newRate;
        });
    }, []);

    const handlePlayPause = useCallback(() => {
        const audio = audioRef.current;
        if (!audio || hasError || isLoadingSignedUrl || !signedAudioUrl || !isAudioLoaded) {
            if (hasError) toast({ variant: 'destructive', title: 'Audio Error' });
            return;
        }

        if (isPlaying) {
            audio.pause();
        } else {
            const playEvent = new CustomEvent('audio-play', { detail: { player: audio } });
            document.dispatchEvent(playEvent);
            audio.play().catch(e => {
                setHasError(true);
                toast({ variant: 'destructive', title: 'Playback Error', description: 'Could not play audio.' });
            });
        }
    }, [isPlaying, signedAudioUrl, isLoadingSignedUrl, isAudioLoaded, hasError, toast]);

    const handleSeek = useCallback((value: number[]) => {
        const audio = audioRef.current;
        if (audio && !isNaN(value[0])) audio.currentTime = value[0];
    }, []);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        
        const handleGlobalPlay = (event: Event) => { if ((event as CustomEvent).detail.player !== audio) audio.pause(); };
        const onPlaying = () => { setIsPlaying(true); onPlay?.(message.id); };
        const onPauseEvent = () => { setIsPlaying(false); onPause?.(message.id); };
        const updateTime = () => setCurrentTime(audio.currentTime);
        const updateDuration = () => { if (!isNaN(audio.duration) && isFinite(audio.duration)) setDuration(audio.duration); };
        const onCanPlay = () => setIsAudioLoaded(true);
        const handleEnd = () => { setIsPlaying(false); setCurrentTime(0); onEnded?.(message.id); };
        const handleError = () => { setHasError(true); toast({ variant: "destructive", title: "Playback Error" }); };

        audio.addEventListener('playing', onPlaying);
        audio.addEventListener('pause', onPauseEvent);
        audio.addEventListener('timeupdate', updateTime);
        audio.addEventListener('loadedmetadata', updateDuration);
        audio.addEventListener('durationchange', updateDuration);
        audio.addEventListener('canplay', onCanPlay);
        audio.addEventListener('ended', handleEnd);
        audio.addEventListener('error', handleError);
        document.addEventListener('audio-play', handleGlobalPlay);
        
        if (signedAudioUrl && audio.src !== signedAudioUrl) { audio.src = signedAudioUrl; audio.load(); }
        audio.playbackRate = playbackRate;

        return () => {
            audio.removeEventListener('playing', onPlaying);
            audio.removeEventListener('pause', onPauseEvent);
            audio.removeEventListener('timeupdate', updateTime);
            audio.removeEventListener('loadedmetadata', updateDuration);
            audio.removeEventListener('durationchange', updateDuration);
            audio.removeEventListener('canplay', onCanPlay);
            audio.removeEventListener('ended', handleEnd);
            audio.removeEventListener('error', handleError);
            document.removeEventListener('audio-play', handleGlobalPlay);
        };
    }, [signedAudioUrl, playbackRate, message.id, toast, onPlay, onPause, onEnded]);
    
    const isDisabled = !signedAudioUrl || isLoadingSignedUrl || !isAudioLoaded;

    if (hasError) {
        return ( <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive text-destructive-foreground"><AlertTriangle size={18} /> <span className="text-sm font-medium">Audio error.</span></div> );
    }

    return (
        <div className={cn("flex items-center gap-2 w-full max-w-[280px] sm:max-w-xs p-1.5 rounded-xl", isCurrentUser ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground")}>
            <audio ref={audioRef} preload="metadata" />
            <Button variant="ghost" size="icon" onClick={handlePlayPause} className={cn("w-9 h-9 rounded-full flex-shrink-0", isCurrentUser ? "hover:bg-primary-foreground/20" : "hover:bg-secondary-foreground/10")} aria-label={isPlaying ? "Pause audio" : "Play audio"} disabled={isDisabled}>
                {isLoadingSignedUrl || (!isAudioLoaded && !hasError) ? <Spinner size={18} /> : isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
            </Button>
            <div className="flex-grow flex flex-col justify-center w-full min-w-0">
                <Slider value={[currentTime]} max={duration > 0 ? duration : 1} step={0.1} onValueChange={handleSeek} className="w-full h-1" classNames={{ track: 'h-1', range: 'bg-current', thumb: 'h-3 w-3' }} aria-label="Audio playback progress" disabled={isDisabled} />
                <div className="flex justify-between items-center mt-1">
                    <span className="text-xs font-mono opacity-80 select-none">{formatTime(currentTime)}</span>
                    <span className="text-xs font-mono opacity-80 select-none">{formatTime(duration)}</span>
                </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleTogglePlaybackRate} className={cn("w-12 h-8 rounded-full text-xs font-mono", isCurrentUser ? "hover:bg-primary-foreground/20" : "hover:bg-secondary-foreground/10")} aria-label={`Change playback speed. Current: ${playbackRate}x`} disabled={isDisabled}>
                {playbackRate.toFixed(1)}x
            </Button>
        </div>
    );
};

export default memo(AudioPlayer);
