
"use client";

import { memo } from 'react';
import type { User } from '@/types';
import MoodIndicator from './MoodIndicator';
import { Button } from '@/components/ui/button';
import { UserCircle2, Heart, Phone, MoreHorizontal, Trash2, History } from 'lucide-react';
import Image from 'next/image';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';
import { differenceInDays, formatDistanceToNowStrict, parseISO } from 'date-fns';
import SelectionActionBar from './SelectionActionBar';
import { useRouter } from 'next/navigation';

interface ChatHeaderProps {
  currentUser: User;
  otherUser: User;
  onProfileClick: () => void;
  onSendThinkingOfYou: () => void;
  isTargetUserBeingThoughtOf: boolean;
  onOtherUserAvatarClick: () => void;
  isOtherUserTyping?: boolean;
  isSelectionMode: boolean;
  selectedMessageCount: number;
  onExitSelectionMode: () => void;
  onCopySelected: () => void;
  onDeleteSelected: () => void;
  onShareSelected: () => void;
  onClearChat: () => void;
  onReplySelected: () => void;
  onToggleStarSelected: () => void;
}

const HeaderContent = memo(({
  otherUser,
  isOtherUserTyping,
  isTargetUserBeingThoughtOf,
  currentUser,
  onOtherUserAvatarClick,
  onProfileClick,
  onSendThinkingOfYou,
  onClearChat
}: Pick<ChatHeaderProps, 'otherUser' | 'isOtherUserTyping' | 'isTargetUserBeingThoughtOf' | 'currentUser' | 'onOtherUserAvatarClick' | 'onProfileClick' | 'onSendThinkingOfYou' | 'onClearChat'>) => {
  const router = useRouter();
  let presenceStatusText = `${otherUser.display_name} is offline.`;
  let formattedLastSeen = "Last seen: N/A";

  if (otherUser.is_online) {
    formattedLastSeen = "Currently online";
  } else if (otherUser.last_seen) {
    try {
      const lastSeenDate = parseISO(otherUser.last_seen);
      formattedLastSeen = differenceInDays(new Date(), lastSeenDate) > 7
        ? "Last seen a while ago"
        : `Last seen: ${formatDistanceToNowStrict(lastSeenDate, { addSuffix: true })}`;
    } catch (e) {
      formattedLastSeen = "Last seen: Unknown";
    }
  }

  const displayNameOrTyping = isOtherUserTyping ? <span className="italic text-primary">typing...</span> : otherUser.display_name;

  return (
    <>
      <div className="flex-shrink-0">
        <button onClick={onOtherUserAvatarClick} className="relative rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card transition-all hover:scale-105 active:scale-95">
          <Image src={otherUser.avatar_url || "https://placehold.co/100x100.png"} alt={otherUser.display_name} width={44} height={44} className="rounded-full object-cover" />
          <TooltipProvider>
            <Tooltip><TooltipTrigger asChild><span className={cn("absolute bottom-0 right-0 block h-3 w-3 rounded-full border-2 border-card ring-1", otherUser.is_online ? "bg-green-500 ring-green-500" : "bg-gray-400 ring-gray-400")} /></TooltipTrigger><TooltipContent><p>{otherUser.is_online ? `${otherUser.display_name} is online` : `${otherUser.display_name} is offline. ${formattedLastSeen}`}</p></TooltipContent></Tooltip>
          </TooltipProvider>
        </button>
      </div>
      <div className="flex-grow min-w-0 text-center px-2">
        <div className="flex flex-col items-center justify-center">
          <div className="flex items-center space-x-2">
            <h2 className="font-semibold text-lg text-foreground font-headline truncate">{displayNameOrTyping}</h2>
            {isTargetUserBeingThoughtOf && <TooltipProvider><Tooltip><TooltipTrigger><Heart size={16} className="text-red-500 animate-pulse-subtle fill-red-400" /></TooltipTrigger><TooltipContent><p>{currentUser.display_name} is thinking of you!</p></TooltipContent></Tooltip></TooltipProvider>}
          </div>
          <MoodIndicator mood={otherUser.mood} />
        </div>
      </div>
      <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0 justify-end">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onSendThinkingOfYou} className="text-muted-foreground hover:text-red-500 hover:bg-red-500/10 active:bg-red-500/20 rounded-full" aria-label="Send 'Thinking of You'">
                <Heart size={22} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Send "Thinking of You"</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={() => router.push('/history')} className="text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 active:bg-blue-500/20 rounded-full" aria-label="View History">
                        <History size={22} />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>View Activity History</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary hover:bg-primary/10 active:bg-primary/20 rounded-full">
              <MoreHorizontal size={22} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onProfileClick}><UserCircle2 className="mr-2 h-4 w-4" /><span>Your Account</span></DropdownMenuItem>
            {otherUser?.phone && <DropdownMenuItem onSelect={() => window.location.href = `tel:${otherUser.phone?.replace(/\s|-/g, "")}`}><Phone className="mr-2 h-4 w-4" /><span>Call {otherUser.display_name}</span></DropdownMenuItem>}
            <DropdownMenuItem onSelect={onClearChat} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" /><span>Clear Chat History</span></DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
});
HeaderContent.displayName = 'HeaderContent';


function ChatHeader({ isSelectionMode, selectedMessageCount, onExitSelectionMode, onCopySelected, onDeleteSelected, onShareSelected, onReplySelected, onToggleStarSelected, ...rest }: ChatHeaderProps) {
  return (
    <header className="flex items-center justify-between p-3 sm:p-4 border-b bg-card rounded-t-lg h-[72px] transition-all duration-200">
      {isSelectionMode ? (
        <SelectionActionBar
          count={selectedMessageCount}
          onClose={onExitSelectionMode}
          onCopy={onCopySelected}
          onDelete={onDeleteSelected}
          onShare={onShareSelected}
          onReply={onReplySelected}
          onStar={onToggleStarSelected}
        />
      ) : (
        <HeaderContent {...rest} />
      )}
    </header>
  );
}

export default memo(ChatHeader);
