import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Check, CheckCheck } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

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
