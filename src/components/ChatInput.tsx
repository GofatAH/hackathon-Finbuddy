import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSend(message);
      setMessage('');
    }
  };

  return (
    <form 
      onSubmit={handleSubmit}
      className={cn(
        "border-t glass p-4 transition-all duration-300",
        isFocused && "shadow-premium"
      )}
    >
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          disabled={disabled}
        >
          <Camera className="w-5 h-5" />
        </Button>
        <div className="flex-1 relative">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Type a message..."
            className={cn(
              'w-full bg-background/80 border border-border/50 rounded-xl px-4 py-2.5 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/50 transition-all duration-200',
              disabled && 'opacity-50'
            )}
            disabled={disabled}
          />
        </div>
        <Button
          type="submit"
          size="icon"
          className={cn(
            "shrink-0 rounded-xl shadow-premium transition-all duration-200",
            message.trim() ? "bg-primary hover:bg-primary/90 scale-100" : "bg-muted text-muted-foreground scale-95"
          )}
          disabled={disabled || !message.trim()}
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </form>
  );
}
