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

interface AudioPlayerProps {
    message: Message;
    isCurrentUser: boolean;
}

const AudioPlayer = ({ message, isCurrentUser }: AudioPlayerProps) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(message.duration_seconds || 0);
    const [currentTime, setCurrentTime] = useState(0);
    const [hasError, setHasError] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const { toast } = useToast();

    const version = message.file_metadata?.urls?.mp3_audio ? 'mp3_audio' : 'original';
    const { displayUrl: signedAudioUrl, isLoading } = useCachedMediaUrl(message, version);
    
    const handleTogglePlaybackRate = () => {
        const rates = [1, 1.5, 2];
        const currentIndex = rates.indexOf(playbackRate);
        const nextIndex = (currentIndex + 1) % rates.length;
        setPlaybackRate(rates[nextIndex]);
    };

    const handlePlayPause = () => {
        if (!audioRef.current || !signedAudioUrl) return;
        
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            const playEvent = new CustomEvent('audio-play', { detail: { player: audioRef.current } });
            document.dispatchEvent(playEvent);
            audioRef.current.play().catch(e => {
                console.error("Audio play failed:", e);
                setHasError(true);
                toast({ variant: 'destructive', title: 'Playback Error' });
            });
        }
        setIsPlaying(!isPlaying);
    };
    
    const handleSeek = (value: number[]) => {
      if (audioRef.current) {
        audioRef.current.currentTime = value[0];
        setCurrentTime(value[0]);
      }
    };

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !signedAudioUrl) return;
        
        audio.src = signedAudioUrl;
        audio.playbackRate = playbackRate;

        const handleGlobalPlay = (event: Event) => {
            if ((event as CustomEvent).detail.player !== audio) {
                audio.pause();
                setIsPlaying(false);
            }
        };

        const updateTime = () => setCurrentTime(audio.currentTime);
        const updateDuration = () => { if (!isNaN(audio.duration) && isFinite(audio.duration)) setDuration(audio.duration); }
        const handleEnd = () => setIsPlaying(false);
        const handleError = () => { setHasError(true); toast({ variant: "destructive", title: "Playback Error" }); };

        audio.addEventListener('timeupdate', updateTime);
        audio.addEventListener('loadedmetadata', updateDuration);
        audio.addEventListener('ended', handleEnd);
        audio.addEventListener('error', handleError);
        document.addEventListener('audio-play', handleGlobalPlay);

        return () => {
            audio.removeEventListener('timeupdate', updateTime);
            audio.removeEventListener('loadedmetadata', updateDuration);
            audio.removeEventListener('ended', handleEnd);
            audio.removeEventListener('error', handleError);
            document.removeEventListener('audio-play', handleGlobalPlay);
        };
    }, [toast, signedAudioUrl, playbackRate]);
    
    const playerColorClass = isCurrentUser ? 'text-primary-foreground' : 'text-secondary-foreground';
    const sliderThumbClass = isCurrentUser ? '[&>span]:bg-primary-foreground' : '[&>span]:bg-primary';
    const sliderTrackClass = isCurrentUser ? 'bg-primary-foreground/30' : 'bg-secondary-foreground/30';
    const sliderRangeClass = isCurrentUser ? 'bg-primary-foreground' : 'bg-secondary-foreground';
    
    if (hasError) return <div className={cn("flex items-center gap-2 p-2", isCurrentUser ? "text-red-300" : "text-red-500")}><AlertTriangle size={18} /><span className="text-sm">Audio error</span></div>;

    return (
        <div className={cn("flex items-center gap-2 w-full max-w-[250px] sm:max-w-xs", playerColorClass)}>
            <audio ref={audioRef} preload="metadata" />
            <Button variant="ghost" size="icon" onClick={handlePlayPause} className={cn("w-10 h-10 rounded-full flex-shrink-0", isCurrentUser ? 'hover:bg-white/20' : 'hover:bg-black/10')} aria-label={isPlaying ? "Pause audio" : "Play audio"} disabled={!signedAudioUrl || isLoading}>
                {(!signedAudioUrl || isLoading) ? <Spinner/> : isPlaying ? <Pause size={20} className={playerColorClass} /> : <Play size={20} className={cn("ml-0.5", playerColorClass)} />}
            </Button>
            
            <div className="flex-grow flex flex-col justify-center gap-1.5 w-full">
                 <Slider
                    value={[currentTime]}
                    max={duration || 1}
                    step={0.1}
                    onValueChange={handleSeek}
                    className="w-full h-1"
                    classNames={{
                      track: cn('h-1', sliderTrackClass),
                      range: cn('h-1', sliderRangeClass),
                      thumb: cn('h-3 w-3', sliderThumbClass)
                    }}
                    aria-label="Seek audio"
                 />
            </div>
            
            <Button variant="ghost" size="sm" onClick={handleTogglePlaybackRate} className={cn("w-12 h-8 rounded-full text-xs font-mono", isCurrentUser ? 'hover:bg-white/20' : 'hover:bg-black/10')}>
                {playbackRate.toFixed(1)}x
            </Button>
        </div>
    );
};
AudioPlayer.displayName = 'AudioPlayer';
export default memo(AudioPlayer);
