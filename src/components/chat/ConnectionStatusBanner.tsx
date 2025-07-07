
"use client";

import { memo } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import Spinner from '../common/Spinner';
import { RealtimeProtocol } from '@/services/realtimeService';

interface ConnectionStatusBannerProps {
  protocol: RealtimeProtocol;
  isBrowserOnline: boolean;
}

const ConnectionStatusBanner = ({ protocol, isBrowserOnline }: ConnectionStatusBannerProps) => {
    if (protocol === 'disconnected' && !isBrowserOnline) {
      return (
        <div className="fixed top-0 left-0 right-0 bg-destructive text-destructive-foreground p-2 text-center text-sm z-50 flex items-center justify-center gap-2">
          <WifiOff size={16} />
          You are offline. Features may be limited.
        </div>
      );
    }
    if (protocol === 'sse' || protocol === 'fallback') {
      return (
        <div className="fixed top-0 left-0 right-0 bg-amber-500 text-black p-2 text-center text-sm z-50 flex items-center justify-center gap-2">
          <Wifi size={16} />
          Connected via fallback. Some features may be slower.
        </div>
      );
    }
    if (protocol === 'connecting' || protocol === 'syncing') {
      return (
        <div className="fixed top-0 left-0 right-0 bg-blue-500 text-white p-2 text-center text-sm z-50 flex items-center justify-center gap-2">
          <Spinner />
          {protocol === 'syncing' ? 'Syncing...' : 'Connecting...'}
        </div>
      );
    }
    return null;
  };

export default memo(ConnectionStatusBanner);
