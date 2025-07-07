
"use client";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { DeleteType, Message } from '@/types';
import { differenceInHours } from 'date-fns';

interface DeleteMessageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (deleteType: DeleteType) => void;
  messages: Message[];
  currentUserId: string;
}

export default function DeleteMessageDialog({
  isOpen,
  onClose,
  onConfirm,
  messages,
  currentUserId,
}: DeleteMessageDialogProps) {
  if (!isOpen || messages.length === 0) return null;
  
  const title = `Delete ${messages.length > 1 ? `${messages.length} messages` : 'message'}?`;

  const canDeleteForEveryone = messages.every(msg => {
      const isSender = msg.user_id === currentUserId;
      const isWithinTimeLimit = differenceInHours(new Date(), new Date(msg.created_at)) < 48;
      return isSender && isWithinTimeLimit;
  });

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-col sm:space-x-0 gap-2">
            {canDeleteForEveryone && (
                 <Button
                    variant="destructive"
                    onClick={() => onConfirm('everyone')}
                    className="w-full"
                >
                    Delete for Everyone
                </Button>
            )}
            <Button
                variant="outline"
                onClick={() => onConfirm('me')}
                className="w-full"
            >
                Delete for Me
            </Button>
             <Button
                variant="ghost"
                onClick={onClose}
                className="w-full mt-2"
            >
                Cancel
            </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
