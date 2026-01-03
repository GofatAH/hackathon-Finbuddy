import { cn } from '@/lib/utils';

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
        'flex animate-fade-in',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-3 shadow-sm',
          isUser
            ? 'bg-chat-user text-chat-user-foreground rounded-br-md'
            : 'bg-chat-buddy text-chat-buddy-foreground rounded-bl-md'
        )}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}
