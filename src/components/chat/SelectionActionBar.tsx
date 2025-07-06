
"use client";

import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { X, Copy, Share2, Trash2, Star, Reply } from 'lucide-react';

interface SelectionActionBarProps {
    count: number;
    onClose: () => void;
    onCopy: () => void;
    onDelete: () => void;
    onShare: () => void;
    onReply: () => void;
    onStar: () => void;
}

const SelectionActionBar = ({
  count,
  onClose,
  onCopy,
  onDelete,
  onShare,
  onReply,
  onStar
}: SelectionActionBarProps) => (
    <div className="w-full flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full" aria-label="Cancel selection">
          <X className="h-5 w-5" />
        </Button>
        <span className="font-semibold text-lg">{count}</span>
      </div>
      <div className="flex items-center gap-1 sm:gap-2">
        {count === 1 &&
          <Button variant="ghost" size="icon" onClick={onReply} className="rounded-full" aria-label="Reply to message">
            <Reply className="h-5 w-5" />
          </Button>
        }
        <Button variant="ghost" size="icon" onClick={onCopy} className="rounded-full" aria-label="Copy selected messages">
          <Copy className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onStar} className="rounded-full" aria-label="Star selected messages">
          <Star className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onShare} className="rounded-full" aria-label="Share selected messages">
          <Share2 className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onDelete} className="rounded-full hover:bg-destructive/10 hover:text-destructive" aria-label="Delete selected messages">
          <Trash2 className="h-5 w-5" />
        </Button>
      </div>
    </div>
);

export default memo(SelectionActionBar);
