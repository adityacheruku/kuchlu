
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

const SettingsRow = ({ children, onClick, disabled = false }: { children: React.ReactNode, onClick?: () => void, disabled?: boolean }) => {
    const interactionClass = disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted/50';
    return (
        <div
            onClick={!disabled ? onClick : undefined}
            className={`flex items-center justify-between p-4 -mx-4 rounded-lg transition-colors ${interactionClass} ${!disabled && onClick ? 'cursor-pointer' : ''}`}
        >
            {children}
        </div>
    );
};

export default function AccessibilitySettingsPage() {
    const { currentUser, isLoading: isAuthLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    // State for the feature itself
    const [assistiveTouchEnabled, setAssistiveTouchEnabled] = useState(false);
    const [isLoadingStatus, setIsLoadingStatus] = useState(true);
    
    // State for the dialogs
    const [isExplanationDialogOpen, setIsExplanationDialogOpen] = useState(false);
    const [isPermissionDeniedDialogOpen, setIsPermissionDeniedDialogOpen] = useState(false);
    const [permissionDialogCallbacks, setPermissionDialogCallbacks] = useState<{ onConfirm: () => void, onCancel: () => void } | null>(null);

    // Fetch initial status from the native plugin when the component mounts
    useEffect(() => {
      async function checkInitialStatus() {
        setIsLoadingStatus(true);
        try {
          const status = await capacitorService.getAssistiveTouchStatus();
          setAssistiveTouchEnabled(status.isEnabled);
        } catch (e) {
          console.error("Failed to get initial AssistiveTouch status", e);
          setAssistiveTouchEnabled(false);
        } finally {
          setIsLoadingStatus(false);
        }
      }
      checkInitialStatus();
    }, []);

    if (isAuthLoading || !currentUser) {
        return <FullPageLoader />;
    }

    const showPermissionDialog = (callbacks: { onConfirm: () => void, onCancel: () => void }) => {
        setPermissionDialogCallbacks(callbacks);
        setIsExplanationDialogOpen(true);
    };

    const handleToggleChange = async (checked: boolean) => {
        if (checked) {
            const granted = await capacitorService.requestOverlayPermission(showPermissionDialog);
            if (granted) {
                await capacitorService.showFloatingButton();
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
                                    <p className="text-sm text-muted-foreground font-normal">Use a floating button to quickly access app features from anywhere on your device. Requires special permissions.</p>
                                </Label>
                                <div className="flex items-center gap-2">
                                     {isLoadingStatus ? (
                                        <Spinner />
                                     ) : (
                                        <Switch
                                            id="assistive-touch-toggle"
                                            checked={assistiveTouchEnabled}
                                            onCheckedChange={handleToggleChange}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                     )}
                                </div>
                            </SettingsRow>
                       </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Visual</CardTitle>
                        <CardDescription>Features coming soon.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">Adjustments for text size, contrast, and motion will be available here.</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Audio</CardTitle>
                        <CardDescription>Features coming soon.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <p className="text-sm text-muted-foreground">Settings for mono audio and sound recognition will be available here.</p>
                    </CardContent>
                </Card>
            </main>
            
            {/* Permission Explanation Dialog */}
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

            {/* Permission Denied Help Dialog */}
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
