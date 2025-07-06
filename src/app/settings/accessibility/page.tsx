
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ChevronRight } from 'lucide-react';
import SettingsHeader from '@/components/settings/SettingsHeader';
import FullPageLoader from '@/components/common/FullPageLoader';
import Spinner from '@/components/common/Spinner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { capacitorService } from '@/services/capacitorService';
import Link from 'next/link';
import { Slider } from '@/components/ui/slider';

const SettingsRow = ({ children, onClick, disabled = false, href }: { children: React.ReactNode, onClick?: () => void, disabled?: boolean, href?: string }) => {
    const interactionClass = disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted/50';
    const content = (
        <div
            onClick={!disabled ? onClick : undefined}
            className={`flex items-center justify-between p-4 -mx-4 rounded-lg transition-colors ${interactionClass} ${!disabled && (onClick || href) ? 'cursor-pointer' : ''}`}
        >
            {children}
        </div>
    );

    if (href && !disabled) {
        return <Link href={href}>{content}</Link>
    }
    return content;
};

export default function AccessibilitySettingsPage() {
    const { currentUser, isLoading: isAuthLoading, token } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [assistiveTouchEnabled, setAssistiveTouchEnabled] = useState(false);
    const [isLoadingStatus, setIsLoadingStatus] = useState(true);
    const [idleOpacity, setIdleOpacity] = useState([80]);
    
    const [isExplanationDialogOpen, setIsExplanationDialogOpen] = useState(false);
    const [isPermissionDeniedDialogOpen, setIsPermissionDeniedDialogOpen] = useState(false);
    const [permissionDialogCallbacks, setPermissionDialogCallbacks] = useState<{ onConfirm: () => void, onCancel: () => void } | null>(null);

    useEffect(() => {
      async function checkInitialStatus() {
        setIsLoadingStatus(true);
        try {
          const status = await capacitorService.getAssistiveTouchStatus();
          setAssistiveTouchEnabled(status.isEnabled);
          // TODO: Load idle opacity from storage
        } catch (e) {
          console.error("Failed to get initial AssistiveTouch status", e);
          setAssistiveTouchEnabled(false);
        } finally {
          setIsLoadingStatus(false);
        }
      }
      checkInitialStatus();
    }, []);

    const showPermissionDialog = (callbacks: { onConfirm: () => void, onCancel: () => void }) => {
        setPermissionDialogCallbacks(callbacks);
        setIsExplanationDialogOpen(true);
    };

    const handleToggleChange = async (checked: boolean) => {
        if (checked) {
            const granted = await capacitorService.requestOverlayPermission(showPermissionDialog);
            if (granted) {
                await capacitorService.showFloatingButton({ opacity: idleOpacity[0] / 100, authToken: token || undefined });
                setAssistiveTouchEnabled(true);
                toast({ title: "AssistiveTouch Enabled", description: "The floating button is now active." });
            } else {
                setAssistiveTouchEnabled(false);
                if (!permissionDialogCallbacks) { 
                    setIsPermissionDeniedDialogOpen(true);
                }
            }
        } else {
            await capacitorService.hideFloatingButton();
            setAssistiveTouchEnabled(false);
        }
    };
    
    const handleOpacityChange = (value: number[]) => {
      setIdleOpacity(value);
    }
    
    const handleOpacityCommit = async (value: number[]) => {
      if(assistiveTouchEnabled) {
          await capacitorService.setOpacity(value[0] / 100);
      }
      // TODO: Save idle opacity to storage
    }

    const onDialogConfirm = () => {
        setIsExplanationDialogOpen(false);
        permissionDialogCallbacks?.onConfirm();
        setPermissionDialogCallbacks(null);
    };
    
    const onDialogCancel = () => {
        setIsExplanationDialogOpen(false);
        permissionDialogCallbacks?.onCancel();
        setPermissionDialogCallbacks(null);
    };

    if (isAuthLoading || !currentUser) {
        return <FullPageLoader />;
    }

    return (
        <div className="min-h-screen bg-muted/40 pb-16">
            <SettingsHeader title="Accessibility" />
            <main className="max-w-3xl mx-auto space-y-6 p-4">
                 <Card>
                    <CardHeader>
                        <CardTitle>Touch</CardTitle>
                        <CardDescription>Customize how you interact with the screen.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 divide-y">
                       <div className="px-4">
                            <SettingsRow>
                                <Label htmlFor="assistive-touch-toggle" className="font-medium pr-4 cursor-pointer">
                                    AssistiveTouch
                                    <p className="text-sm text-muted-foreground font-normal">Use a floating button to quickly access app features from anywhere on your device.</p>
                                </Label>
                                <div className="flex items-center gap-2">
                                     {isLoadingStatus ? <Spinner /> : <Switch id="assistive-touch-toggle" checked={assistiveTouchEnabled} onCheckedChange={handleToggleChange} />}
                                </div>
                            </SettingsRow>
                       </div>
                       <div className="px-4">
                           <SettingsRow href="/settings/appearance/moods" disabled={!assistiveTouchEnabled}>
                                <div className="flex flex-col">
                                    <Label className="font-medium">Customize Menu</Label>
                                    <p className="text-sm text-muted-foreground font-normal">Choose the moods and actions that appear in the AssistiveTouch menu.</p>
                                </div>
                                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                           </SettingsRow>
                       </div>
                       <div className="px-4 pt-4 pb-2">
                          <Label htmlFor="idle-opacity-slider" className="font-medium">Idle Opacity</Label>
                          <p className="text-sm text-muted-foreground font-normal pb-4">Adjust the visibility of the AssistiveTouch button when not in use.</p>
                          <Slider id="idle-opacity-slider" value={idleOpacity} onValueChange={handleOpacityChange} onValueCommit={handleOpacityCommit} max={100} min={20} step={5} disabled={!assistiveTouchEnabled} />
                          <div className="text-center text-xs text-muted-foreground pt-2">{idleOpacity[0]}%</div>
                       </div>
                    </CardContent>
                </Card>
            </main>
            
            <AlertDialog open={isExplanationDialogOpen} onOpenChange={setIsExplanationDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Enable AssistiveTouch</AlertDialogTitle>
                        <AlertDialogDescription>
                            This allows a floating button to appear over other apps so you can quickly share moods with your partner. To do this, ChirpChat needs permission to draw over other apps.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={onDialogCancel}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={onDialogConfirm}>Continue</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={isPermissionDeniedDialogOpen} onOpenChange={setIsPermissionDeniedDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Permission Denied</AlertDialogTitle>
                        <AlertDialogDescription>
                            To enable AssistiveTouch, you need to grant the "Draw over other apps" permission manually. Go to your device's Settings &gt; Apps &gt; ChirpChat &gt; Advanced to enable it.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction onClick={() => setIsPermissionDeniedDialogOpen(false)}>OK</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
