import { useState } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCheck, ThumbsUp, Heart, Laugh, Sparkles } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ChatMessageProps {
  message: Message;
}

const reactions = [
  { emoji: '👍', icon: ThumbsUp, label: 'Like' },
  { emoji: '❤️', icon: Heart, label: 'Love' },
  { emoji: '😂', icon: Laugh, label: 'Haha' },
  { emoji: '✨', icon: Sparkles, label: 'Amazing' },
];

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const [selectedReaction, setSelectedReaction] = useState<string | null>(null);
  const [showReactions, setShowReactions] = useState(false);

  return (
    <div
      className={cn(
        'flex gap-2',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      {/* Avatar for assistant */}
      {!isUser && (
        <motion.div 
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 300 }}
          className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0 shadow-premium"
        >
          <span className="text-sm">💚</span>
        </motion.div>
      )}
      
      <div className="flex flex-col gap-1 max-w-[80%]">
        <div 
          className="relative"
          onMouseEnter={() => setShowReactions(true)}
          onMouseLeave={() => setShowReactions(false)}
        >
          <motion.div
            whileHover={{ scale: 1.01 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className={cn(
              'rounded-2xl px-4 py-3 transition-all duration-200 relative group',
              isUser
                ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-br-md shadow-premium'
                : 'bg-card text-card-foreground rounded-bl-md shadow-premium border border-border/40'
            )}
          >
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
            
            {/* Subtle shine effect on user messages */}
            {isUser && (
              <div className="absolute inset-0 rounded-2xl rounded-br-md overflow-hidden pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              </div>
            )}
          </motion.div>

          {/* Reaction picker */}
          <AnimatePresence>
            {showReactions && !isUser && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="absolute -bottom-2 left-2 translate-y-full flex items-center gap-1 bg-card/95 backdrop-blur-sm rounded-full px-2 py-1.5 shadow-premium-lg border border-border/40 z-10"
              >
                {reactions.map((reaction, index) => (
                  <motion.button
                    key={reaction.label}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: index * 0.05, type: "spring", stiffness: 400 }}
                    whileHover={{ scale: 1.3 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setSelectedReaction(selectedReaction === reaction.emoji ? null : reaction.emoji)}
                    className={cn(
                      "w-8 h-8 flex items-center justify-center rounded-full transition-colors",
                      selectedReaction === reaction.emoji 
                        ? "bg-primary/20" 
                        : "hover:bg-muted/50"
                    )}
                  >
                    <span className="text-base">{reaction.emoji}</span>
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Selected reaction badge */}
          <AnimatePresence>
            {selectedReaction && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                className={cn(
                  "absolute -bottom-2 bg-card rounded-full px-1.5 py-0.5 shadow-md border border-border/40 cursor-pointer",
                  isUser ? "right-2" : "left-2"
                )}
                onClick={() => setSelectedReaction(null)}
              >
                <span className="text-sm">{selectedReaction}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* Message status for user messages */}
        {isUser && (
          <motion.div 
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center justify-end gap-1 px-1"
          >
            <CheckCheck className="w-3.5 h-3.5 text-primary/70" />
            <span className="text-[10px] text-muted-foreground">Sent</span>
          </motion.div>
        )}
      </div>
      
      {/* Avatar for user */}
      {isUser && (
        <motion.div 
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 300 }}
          className="w-8 h-8 rounded-full bg-gradient-to-br from-secondary to-muted flex items-center justify-center shrink-0 shadow-sm border border-border/30"
        >
          <span className="text-sm">👤</span>
        </motion.div>
      )}
    </div>
  );
}
