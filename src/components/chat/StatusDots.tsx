
"use client";

import { cn } from "@/lib/utils";
import type { MessageStatus } from "@/types";

interface StatusDotsProps {
  status?: MessageStatus;
}

const Dot = ({ active, colorClass, pulsing = false }: { active: boolean; colorClass?: string; pulsing?: boolean }) => (
  <div
    className={cn(
      "w-1.5 h-1.5 rounded-full transition-colors",
      active ? colorClass : "bg-muted-foreground/30",
      pulsing && "animate-dot-pulse"
    )}
  />
);

export default function StatusDots({ status }: StatusDotsProps) {
  if (!status || status === 'uploading') {
    return null;
  }
  
  const sentColor = "bg-yellow-500";
  const readColor = "bg-amber-500";

  switch(status) {
    case "sending":
        return (
            <div className="flex items-center gap-1" aria-label="Sending...">
                <Dot active={false} pulsing />
                <Dot active={false} pulsing />
                <Dot active={false} pulsing />
            </div>
        );
    case "sent":
        return (
             <div className="flex items-center gap-1" aria-label="Sent">
                <Dot active={true} colorClass={sentColor} />
                <Dot active={false} />
                <Dot active={false} />
            </div>
        );
    case "delivered":
        return (
             <div className="flex items-center gap-1" aria-label="Delivered">
                <Dot active={true} colorClass={sentColor} />
                <Dot active={true} colorClass={sentColor} />
                <Dot active={false} />
            </div>
        );
    case "read":
        return (
             <div className="flex items-center gap-1" aria-label="Read">
                <Dot active={true} colorClass={readColor} />
                <Dot active={true} colorClass={readColor} />
                <Dot active={true} colorClass={readColor} />
            </div>
        );
    default:
        return null;
  }
}
