import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Send, Sparkles, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

const placeholders = [
  "Coffee $5 at Starbucks...",
  "Groceries $45 at Trader Joe's...",
  "Netflix subscription $15...",
  "Gas $40...",
  "Lunch $12...",
];

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Cycle through placeholders
  useEffect(() => {
    if (isFocused) return;
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [isFocused]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSend(message);
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <motion.form 
      onSubmit={handleSubmit}
      initial={false}
      animate={{ 
        boxShadow: isFocused 
          ? '0 -4px 20px -4px hsl(var(--primary) / 0.1)' 
          : '0 -2px 10px -2px hsl(var(--primary) / 0.05)'
      }}
      className={cn(
        "border-t border-border/30 glass p-3 transition-all duration-300"
      )}
    >
      <div className="flex items-end gap-2">
        {/* Mic button */}
        <motion.div whileTap={{ scale: 0.9 }}>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl h-10 w-10 transition-all duration-200"
            disabled={disabled}
          >
            <Mic className="w-5 h-5" />
          </Button>
        </motion.div>
        
        {/* Input container */}
        <div className="flex-1 relative">
          <div className={cn(
            "relative rounded-2xl border transition-all duration-300 overflow-hidden",
            isFocused 
              ? "border-primary/40 bg-background shadow-[0_0_0_3px_hsl(var(--primary)/0.1)]" 
              : "border-border/50 bg-background/80"
          )}>
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={handleKeyDown}
              placeholder={placeholders[placeholderIndex]}
              rows={1}
              className={cn(
                'w-full bg-transparent px-4 py-3 text-sm resize-none focus:outline-none placeholder:text-muted-foreground/60 transition-all duration-200',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
              disabled={disabled}
            />
            
            {/* Sparkle hint */}
            <AnimatePresence>
              {!message && !isFocused && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                >
                  <Sparkles className="w-4 h-4 text-primary/40" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        
        {/* Send button */}
        <motion.div 
          whileTap={{ scale: 0.9 }}
          animate={{ 
            scale: message.trim() ? 1 : 0.9,
            opacity: message.trim() ? 1 : 0.6
          }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
        >
          <Button
            type="submit"
            size="icon"
            className={cn(
              "shrink-0 rounded-xl h-10 w-10 transition-all duration-300",
              message.trim() 
                ? "bg-primary hover:bg-primary/90 shadow-premium text-primary-foreground" 
                : "bg-muted text-muted-foreground shadow-none"
            )}
            disabled={disabled || !message.trim()}
          >
            <Send className={cn(
              "w-4 h-4 transition-transform duration-200",
              message.trim() && "translate-x-0.5 -translate-y-0.5"
            )} />
          </Button>
        </motion.div>
      </div>
      
      {/* Character hint */}
      <AnimatePresence>
        {message.length > 100 && (
          <motion.p 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="text-[10px] text-muted-foreground text-right mt-1 pr-2"
          >
            {message.length} characters
          </motion.p>
        )}
      </AnimatePresence>
    </motion.form>
  );
}
