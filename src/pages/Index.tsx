import { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useExpenses } from '@/hooks/useExpenses';
import { useSubscriptionReminders } from '@/hooks/useSubscriptionReminders';
import { supabase } from '@/integrations/supabase/client';
import { ChatMessage } from '@/components/ChatMessage';
import { ChatInput } from '@/components/ChatInput';
import { Dashboard } from '@/components/Dashboard';
import { Subscriptions } from '@/components/Subscriptions';
import { Settings } from '@/components/Settings';
import { Button } from '@/components/ui/button';
import { MessageCircle, LayoutDashboard, CreditCard, Settings as SettingsIcon, LogOut, Plus, ArrowDown } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 }
};

const pageTransition = {
  type: 'tween' as const,
  ease: 'easeInOut' as const,
  duration: 0.2
};

type View = 'chat' | 'dashboard' | 'subscriptions' | 'settings';
const VIEWS: View[] = ['chat', 'dashboard', 'subscriptions', 'settings'];

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function Index() {
  const [view, setView] = useState<View>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [chatLoaded, setChatLoaded] = useState(false);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const lastSeenMessageCount = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  const { user, signOut } = useAuth();
  const { profile, getBudgetAmounts } = useProfile();
  const { addExpense, getSpendingByCategory, refetch: refetchExpenses } = useExpenses();
  const { toast } = useToast();
  
  // Check for upcoming subscription reminders
  useSubscriptionReminders();

  // Get greeting message
  const getGreeting = useCallback(() => {
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
  }, [profile?.name, profile?.personality]);

  // Load chat history from database
  useEffect(() => {
    if (user && !chatLoaded) {
      loadChatHistory();
    }
  }, [user, chatLoaded]);

  const loadChatHistory = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setMessages(data.map(m => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          content: m.content
        })));
      } else if (profile) {
        // No history, show greeting
        const greeting = getGreeting();
        setMessages([{ id: 'greeting', role: 'assistant', content: greeting }]);
      }
      setChatLoaded(true);
    } catch (error) {
      console.error('Error loading chat history:', error);
      setChatLoaded(true);
    }
  };

  // Show greeting when profile loads if no messages yet
  useEffect(() => {
    if (profile && chatLoaded && messages.length === 0) {
      const greeting = getGreeting();
      setMessages([{ id: 'greeting', role: 'assistant', content: greeting }]);
    }
  }, [profile, chatLoaded, messages.length, getGreeting]);

  // Save message to database
  const saveMessage = async (role: 'user' | 'assistant', content: string) => {
    if (!user) return;
    
    try {
      await supabase.from('chat_messages').insert({
        user_id: user.id,
        role,
        content
      });
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  // Start new chat
  const startNewChat = async () => {
    if (!user) return;
    
    try {
      // Delete all chat messages for this user
      await supabase
        .from('chat_messages')
        .delete()
        .eq('user_id', user.id);
      
      // Reset messages with new greeting
      const greeting = getGreeting();
      setMessages([{ id: 'greeting', role: 'assistant', content: greeting }]);
      
      toast({ title: 'New conversation started! 💬' });
    } catch (error) {
      console.error('Error clearing chat:', error);
      toast({ title: 'Failed to start new chat', variant: 'destructive' });
    }
  };

  // Keep chat pinned to the latest message (no visible scrolling) - only when already at bottom
  useLayoutEffect(() => {
    if (view !== 'chat') return;
    const el = chatContainerRef.current;
    if (!el) return;
    // Only auto-scroll if user is near the bottom (within 100px)
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    if (isNearBottom || !showJumpToLatest) {
      el.scrollTop = el.scrollHeight;
      setShowJumpToLatest(false);
    }
  }, [view, messages.length, isStreaming]);

  // Handle scroll to detect when user scrolls up
  const handleChatScroll = useCallback(() => {
    const el = chatContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const isScrolledUp = distanceFromBottom > 150;
    
    if (isScrolledUp && !showJumpToLatest) {
      // User just scrolled up - record current message count
      lastSeenMessageCount.current = messages.length;
    }
    
    setShowJumpToLatest(isScrolledUp);
    
    if (!isScrolledUp) {
      // User is at bottom - reset unread count
      setUnreadCount(0);
      lastSeenMessageCount.current = messages.length;
    }
  }, [showJumpToLatest, messages.length]);

  // Track new messages while scrolled up
  useEffect(() => {
    if (showJumpToLatest && messages.length > lastSeenMessageCount.current) {
      setUnreadCount(messages.length - lastSeenMessageCount.current);
    }
  }, [messages.length, showJumpToLatest]);

  // Jump to latest message
  const jumpToLatest = useCallback(() => {
    const el = chatContainerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    setShowJumpToLatest(false);
    setUnreadCount(0);
    lastSeenMessageCount.current = messages.length;
  }, [messages.length]);

  // Swipe gesture handling - only from top or bottom edges
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const isEdgeSwipe = useRef<boolean>(false);
  const minSwipeDistance = 50;
  const edgeThreshold = 80; // px from top or bottom to trigger swipe

  const handleTouchStart = (e: React.TouchEvent) => {
    const touchY = e.touches[0].clientY;
    const windowHeight = window.innerHeight;
    
    // Only enable swipe if touch starts in top or bottom edge zone
    isEdgeSwipe.current = touchY < edgeThreshold || touchY > windowHeight - edgeThreshold;
    
    if (isEdgeSwipe.current) {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = touchY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isEdgeSwipe.current) {
      touchEndX.current = e.touches[0].clientX;
    }
  };

  const handleTouchEnd = () => {
    if (!isEdgeSwipe.current) {
      return;
    }
    
    const swipeDistance = touchStartX.current - touchEndX.current;
    const currentIndex = VIEWS.indexOf(view);

    if (Math.abs(swipeDistance) > minSwipeDistance) {
      if (swipeDistance > 0 && currentIndex < VIEWS.length - 1) {
        // Swipe left - go to next page
        setView(VIEWS[currentIndex + 1]);
      } else if (swipeDistance < 0 && currentIndex > 0) {
        // Swipe right - go to previous page
        setView(VIEWS[currentIndex - 1]);
      }
    }
    
    // Reset
    touchStartX.current = 0;
    touchStartY.current = 0;
    touchEndX.current = 0;
    isEdgeSwipe.current = false;
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isStreaming) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim()
    };
    
    setMessages(prev => [...prev, userMessage]);
    saveMessage('user', content.trim());
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
          budgetInfo,
          conversationHistory: messages.filter(m => m.id !== 'greeting').map(m => ({
            role: m.role,
            content: m.content
          }))
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
      let subscriptionData: { name: string; amount: number; frequency: 'monthly' | 'weekly' | 'yearly'; category: 'tools' | 'entertainment' | 'music' | 'gaming' | 'productivity' | 'fitness' | 'lifestyle' | 'utilities' | 'news' | 'other'; is_trial?: boolean; trial_days?: number } | null = null;

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

      // Parse expense from text if not found in structured data
      if (!expenseData) {
        const expenseMatch = assistantContent.match(/\[EXPENSE_DATA:(.*?)\]/);
        if (expenseMatch) {
          try {
            expenseData = JSON.parse(expenseMatch[1]);
            assistantContent = assistantContent.replace(/\[EXPENSE_DATA:.*?\]/, '').trim();
          } catch (e) {
            console.error('Failed to parse expense data:', e);
          }
        }
      }

      // Parse subscription from text
      if (!subscriptionData) {
        const subMatch = assistantContent.match(/\[SUBSCRIPTION_DATA:(.*?)\]/);
        if (subMatch) {
          try {
            subscriptionData = JSON.parse(subMatch[1]);
            assistantContent = assistantContent.replace(/\[SUBSCRIPTION_DATA:.*?\]/, '').trim();
          } catch (e) {
            console.error('Failed to parse subscription data:', e);
          }
        }
      }

      // Update displayed message without markers
      if (assistantContent) {
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage.role === 'assistant') {
            lastMessage.content = assistantContent;
          }
          return newMessages;
        });
      }

      // If expense was parsed, add it to the database
      if (expenseData) {
        const result = await addExpense({
          amount: expenseData.amount,
          category: expenseData.category,
          merchant: expenseData.merchant
        });
        if (!result.error) {
          refetchExpenses();
        }
      }

      // If subscription was parsed, add it to the database
      if (subscriptionData) {
        const nextChargeDate = new Date();
        let trialEndDate: Date | null = null;
        
        // Handle free trials
        if (subscriptionData.is_trial && subscriptionData.trial_days) {
          trialEndDate = new Date();
          trialEndDate.setDate(trialEndDate.getDate() + subscriptionData.trial_days);
          // For trials, next charge is after trial ends
          nextChargeDate.setDate(nextChargeDate.getDate() + subscriptionData.trial_days);
        } else {
          // Regular subscription - next charge based on frequency
          if (subscriptionData.frequency === 'monthly') {
            nextChargeDate.setMonth(nextChargeDate.getMonth() + 1);
          } else if (subscriptionData.frequency === 'weekly') {
            nextChargeDate.setDate(nextChargeDate.getDate() + 7);
          } else if (subscriptionData.frequency === 'yearly') {
            nextChargeDate.setFullYear(nextChargeDate.getFullYear() + 1);
          }
        }
        
        await supabase.from('subscriptions').insert({
          user_id: user?.id,
          name: subscriptionData.name,
          amount: subscriptionData.amount,
          frequency: subscriptionData.frequency,
          category: subscriptionData.category,
          next_charge_date: nextChargeDate.toISOString().split('T')[0],
          is_trial: subscriptionData.is_trial || false,
          trial_end_date: trialEndDate ? trialEndDate.toISOString().split('T')[0] : null
        });
      }

      // Save assistant message to database
      if (assistantContent) {
        saveMessage('assistant', assistantContent);
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
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="glass border-b border-border/30 px-4 py-3 flex items-center justify-between sticky top-0 z-50"
      >
        <div className="flex items-center gap-3">
          <motion.img 
            src="/logo.png" 
            alt="FinBuddy" 
            className="w-10 h-10 rounded-xl shadow-premium"
            whileHover={{ scale: 1.05, rotate: 3 }}
            whileTap={{ scale: 0.95 }}
          />
          <div>
            <span className="font-bold text-lg tracking-tight">FinBuddy</span>
            <p className="text-[10px] text-muted-foreground -mt-0.5 tracking-wide uppercase font-medium">Smart Finance</p>
          </div>
        </div>
        
        {/* Page indicator dots */}
        <div className="flex items-center gap-1.5">
          {VIEWS.map((v) => (
            <motion.div
              key={v}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-300",
                view === v ? "bg-primary w-6" : "bg-muted-foreground/30"
              )}
              layoutId={view === v ? "page-dot" : undefined}
            />
          ))}
        </div>
      </motion.header>

      {/* Main Content */}
      <main 
        className="flex-1 overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial="initial"
            animate="animate"
            exit="exit"
            variants={pageVariants}
            transition={pageTransition}
            className="h-full"
          >
            {view === 'chat' && (
              <div className="h-full flex flex-col bg-gradient-to-b from-background to-background/95">
                {/* Chat Header with New Chat button */}
                <div className="px-4 py-3 border-b border-border/30 flex items-center justify-between glass-subtle">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-sm font-medium text-muted-foreground">
                      {messages.length > 1 ? `${messages.length - 1} messages` : 'Start chatting'}
                    </span>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="gap-1.5 text-xs rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        New Chat
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="glass shadow-premium-lg border-border/30">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl">Start a new conversation?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will clear your current chat history. Your logged expenses and subscriptions will remain saved.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={startNewChat} className="rounded-xl">Start Fresh</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
                
                <div 
                  ref={(node) => {
                    chatContainerRef.current = node;
                    if (node && view === 'chat') {
                      node.scrollTop = node.scrollHeight;
                    }
                  }}
                  onScroll={handleChatScroll}
                  className="flex-1 overflow-y-auto px-4 py-5 space-y-4 scrollbar-thin bg-gradient-to-b from-background/50 to-background relative"
                >
                  {messages.length === 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col items-center justify-center h-full text-center px-6"
                    >
                      <img 
                        src="/logo.png" 
                        alt="FinBuddy" 
                        className="w-16 h-16 rounded-2xl mb-4 shadow-premium-lg"
                      />
                      <h3 className="text-lg font-semibold mb-2">Welcome to FinBuddy</h3>
                      <p className="text-sm text-muted-foreground max-w-xs">
                        Tell me about your expenses naturally, like "coffee $5 at Starbucks" and I'll help you track them!
                      </p>
                    </motion.div>
                  )}
                  
                  {messages.map((msg, index) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 16, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ 
                        delay: Math.min(index * 0.05, 0.5), 
                        duration: 0.35,
                        ease: [0.22, 1, 0.36, 1]
                      }}
                    >
                      <ChatMessage message={msg} />
                    </motion.div>
                  ))}
                  
                  {isStreaming && messages[messages.length - 1]?.content === '' && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2"
                    >
                      <img 
                        src="/logo.png" 
                        alt="FinBuddy" 
                        className="w-8 h-8 rounded-full shadow-premium"
                      />
                      <div className="flex items-center gap-1.5 px-4 py-3 bg-card rounded-2xl rounded-bl-md shadow-premium border border-border/40">
                        <motion.div 
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ repeat: Infinity, duration: 0.6, delay: 0 }}
                          className="w-2 h-2 bg-primary rounded-full"
                        />
                        <motion.div 
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ repeat: Infinity, duration: 0.6, delay: 0.15 }}
                          className="w-2 h-2 bg-primary rounded-full"
                        />
                        <motion.div 
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ repeat: Infinity, duration: 0.6, delay: 0.3 }}
                          className="w-2 h-2 bg-primary rounded-full"
                        />
                      </div>
                    </motion.div>
                  )}
                  <div ref={messagesEndRef} className="h-2" />
                </div>
                
                {/* Jump to Latest Button */}
                <AnimatePresence>
                  {showJumpToLatest && (
                    <motion.button
                      initial={{ opacity: 0, y: 20, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 20, scale: 0.9 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      onClick={jumpToLatest}
                      className="absolute bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-full shadow-premium-lg hover:bg-primary/90 transition-colors z-10"
                    >
                      <ArrowDown className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        {unreadCount > 0 ? `${unreadCount} new message${unreadCount > 1 ? 's' : ''}` : 'Jump to latest'}
                      </span>
                      {unreadCount > 0 && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center"
                        >
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </motion.span>
                      )}
                    </motion.button>
                  )}
                </AnimatePresence>
                
                <ChatInput onSend={sendMessage} disabled={isStreaming} />
              </div>
            )}

            {view === 'dashboard' && <Dashboard />}
            {view === 'subscriptions' && <Subscriptions />}
            {view === 'settings' && <Settings />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <motion.nav 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
        className="glass border-t border-border/30 px-2 py-2 safe-area-inset-bottom"
      >
        <div className="flex justify-around max-w-md mx-auto">
          {navItems.map((item, index) => (
            <motion.button
              key={item.id}
              onClick={() => setView(item.id)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.05 }}
              whileTap={{ scale: 0.92 }}
              className={cn(
                'relative flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-all duration-300',
                view === item.id
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {view === item.id && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute inset-0 bg-primary/10 rounded-xl"
                  transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                />
              )}
              <motion.div
                animate={view === item.id ? { scale: [1, 1.15, 1] } : {}}
                transition={{ duration: 0.3 }}
              >
                <item.icon className="w-5 h-5 relative z-10" />
              </motion.div>
              <span className="text-[11px] font-medium relative z-10">{item.label}</span>
              {view === item.id && (
                <motion.div
                  layoutId="nav-dot"
                  className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-primary"
                  transition={{ type: "spring", bounce: 0.3 }}
                />
              )}
            </motion.button>
          ))}
        </div>
      </motion.nav>
    </div>
  );
}
