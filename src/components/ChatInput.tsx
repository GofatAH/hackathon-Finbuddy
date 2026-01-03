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
      className="border-t bg-card p-4"
    >
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 text-muted-foreground"
          disabled={disabled}
        >
          <Camera className="w-5 h-5" />
        </Button>
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="coffee $5..."
          className={cn(
            'flex-1 bg-background border-0 focus-visible:ring-1',
            disabled && 'opacity-50'
          )}
          disabled={disabled}
        />
        <Button
          type="submit"
          size="icon"
          className="shrink-0"
          disabled={disabled || !message.trim()}
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </form>
  );
}
