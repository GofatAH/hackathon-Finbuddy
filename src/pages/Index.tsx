import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useExpenses } from '@/hooks/useExpenses';
import { supabase } from '@/integrations/supabase/client';
import { ChatMessage } from '@/components/ChatMessage';
import { ChatInput } from '@/components/ChatInput';
import { Dashboard } from '@/components/Dashboard';
import { Subscriptions } from '@/components/Subscriptions';
import { Settings } from '@/components/Settings';
import { Button } from '@/components/ui/button';
import { MessageCircle, LayoutDashboard, CreditCard, Settings as SettingsIcon, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

type View = 'chat' | 'dashboard' | 'subscriptions' | 'settings';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function Index() {
  const [view, setView] = useState<View>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { signOut } = useAuth();
  const { profile, getBudgetAmounts } = useProfile();
  const { expenses, addExpense, getSpendingByCategory } = useExpenses();
  const { toast } = useToast();

  // Load initial greeting
  useEffect(() => {
    if (profile && messages.length === 0) {
      const greeting = getGreeting();
      setMessages([{ id: 'greeting', role: 'assistant', content: greeting }]);
    }
  }, [profile]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    const timeGreeting = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
    const name = profile?.name || 'friend';
    const personality = profile?.personality || 'chill';
    
    const greetings: Record<string, string> = {
      chill: `Yo ${name}! Good ${timeGreeting} ☀️ Ready to log some expenses? Just type like you're texting a friend.`,
      hype: `YOOO ${name}!! Good ${timeGreeting}! 🔥 LET'S GET THIS BUDGET RIGHT! Drop those expenses!`,
      straight: `Good ${timeGreeting}, ${name}. Ready to log expenses. Type naturally.`,
      supportive: `Good ${timeGreeting}, ${name}! 💚 I'm here whenever you're ready to track your spending. No pressure!`
    };
    
    return greetings[personality];
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isStreaming) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsStreaming(true);

    const spending = getSpendingByCategory();
    const budgets = getBudgetAmounts();
    
    const budgetInfo = {
      needs: { 
        spent: spending.needs, 
        budget: budgets.needs,
        percentage: budgets.needs > 0 ? Math.round((spending.needs / budgets.needs) * 100) : 0
      },
      wants: { 
        spent: spending.wants, 
        budget: budgets.wants,
        percentage: budgets.wants > 0 ? Math.round((spending.wants / budgets.wants) * 100) : 0
      },
      savings: { 
        spent: spending.savings, 
        budget: budgets.savings,
        percentage: budgets.savings > 0 ? Math.round((spending.savings / budgets.savings) * 100) : 0
      }
    };

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
        },
        body: JSON.stringify({
          message: content,
          personality: profile?.personality || 'chill',
          userName: profile?.name || 'friend',
          budgetInfo
        })
      });

      if (!response.ok) {
        if (response.status === 429) {
          toast({ title: 'Rate limited', description: 'Please try again in a moment', variant: 'destructive' });
          throw new Error('Rate limited');
        }
        if (response.status === 402) {
          toast({ title: 'Credits needed', description: 'Please add credits to continue', variant: 'destructive' });
          throw new Error('Payment required');
        }
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let assistantContent = '';
      let expenseData: { amount: number; category: 'needs' | 'wants' | 'savings'; merchant?: string } | null = null;

      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: '' }]);

      let textBuffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        textBuffer += decoder.decode(value, { stream: true });
        
        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;
          
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          
          try {
            const parsed = JSON.parse(jsonStr);
            
            // Check for expense data in the response
            if (parsed.expense) {
              expenseData = parsed.expense;
            }
            
            const deltaContent = parsed.choices?.[0]?.delta?.content;
            if (deltaContent) {
              assistantContent += deltaContent;
              setMessages(prev => {
                const newMessages = [...prev];
                const lastMessage = newMessages[newMessages.length - 1];
                if (lastMessage.role === 'assistant') {
                  lastMessage.content = assistantContent;
                }
                return newMessages;
              });
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // If expense was parsed, add it to the database
      if (expenseData) {
        await addExpense({
          amount: expenseData.amount,
          category: expenseData.category,
          merchant: expenseData.merchant
        });
      }

    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => {
        const newMessages = [...prev];
        if (newMessages[newMessages.length - 1]?.content === '') {
          newMessages.pop();
        }
        return newMessages;
      });
    } finally {
      setIsStreaming(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
  };

  const navItems = [
    { id: 'chat' as const, icon: MessageCircle, label: 'Chat' },
    { id: 'dashboard' as const, icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'subscriptions' as const, icon: CreditCard, label: 'Subscriptions' },
    { id: 'settings' as const, icon: SettingsIcon, label: 'Settings' },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-lg">💚</span>
          </div>
          <span className="font-bold text-lg">FinBuddy</span>
        </div>
        <Button variant="ghost" size="icon" onClick={handleLogout}>
          <LogOut className="w-5 h-5" />
        </Button>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {view === 'chat' && (
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
              {isStreaming && messages[messages.length - 1]?.content === '' && (
                <div className="flex items-center gap-1 p-4">
                  <div className="w-2 h-2 bg-primary rounded-full typing-dot" />
                  <div className="w-2 h-2 bg-primary rounded-full typing-dot" />
                  <div className="w-2 h-2 bg-primary rounded-full typing-dot" />
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <ChatInput onSend={sendMessage} disabled={isStreaming} />
          </div>
        )}

        {view === 'dashboard' && <Dashboard />}
        {view === 'subscriptions' && <Subscriptions />}
        {view === 'settings' && <Settings />}
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-card border-t px-2 py-2 safe-area-inset-bottom">
        <div className="flex justify-around">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={cn(
                'flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all',
                view === item.id 
                  ? 'text-primary bg-primary/10' 
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
