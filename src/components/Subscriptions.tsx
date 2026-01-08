import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Plus, AlertTriangle, Calendar, Trash2, CheckCircle2, Clock, Zap, Wrench, Tv, Music, Gamepad2, Newspaper, Dumbbell, Sparkles, Lightbulb, MoreHorizontal, Wifi, Timer, Bell, Search, ArrowUpDown, Edit2, X, PieChart, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { SubscriptionCalendar } from './SubscriptionCalendar';

type SubscriptionCategory = 'tools' | 'entertainment' | 'productivity' | 'lifestyle' | 'utilities' | 'gaming' | 'music' | 'news' | 'fitness' | 'other';

interface Subscription {
  id: string;
  name: string;
  amount: number;
  frequency: 'weekly' | 'monthly' | 'yearly';
  next_charge_date: string;
  last_used_date: string | null;
  is_trial: boolean;
  trial_end_date: string | null;
  category: SubscriptionCategory;
}

const CATEGORY_CONFIG: Record<SubscriptionCategory, { label: string; icon: typeof Tv; color: string; bgColor: string }> = {
  tools: { label: 'Tools & AI', icon: Wrench, color: 'text-violet-500', bgColor: 'bg-violet-500/10' },
  entertainment: { label: 'Entertainment', icon: Tv, color: 'text-pink-500', bgColor: 'bg-pink-500/10' },
  productivity: { label: 'Productivity', icon: Lightbulb, color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
  lifestyle: { label: 'Lifestyle', icon: Sparkles, color: 'text-rose-500', bgColor: 'bg-rose-500/10' },
  utilities: { label: 'Utilities', icon: Wifi, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  gaming: { label: 'Gaming', icon: Gamepad2, color: 'text-green-500', bgColor: 'bg-green-500/10' },
  music: { label: 'Music', icon: Music, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
  news: { label: 'News & Media', icon: Newspaper, color: 'text-slate-500', bgColor: 'bg-slate-500/10' },
  fitness: { label: 'Fitness', icon: Dumbbell, color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
  other: { label: 'Other', icon: MoreHorizontal, color: 'text-gray-500', bgColor: 'bg-gray-500/10' },
};

// Popular subscription suggestions with default prices
const POPULAR_SUBSCRIPTIONS: { name: string; amount: number; frequency: 'monthly' | 'yearly' | 'weekly'; category: SubscriptionCategory }[] = [
  { name: 'Netflix', amount: 15.49, frequency: 'monthly', category: 'entertainment' },
  { name: 'Spotify', amount: 10.99, frequency: 'monthly', category: 'music' },
  { name: 'ChatGPT Plus', amount: 20.00, frequency: 'monthly', category: 'tools' },
  { name: 'Disney+', amount: 7.99, frequency: 'monthly', category: 'entertainment' },
  { name: 'YouTube Premium', amount: 13.99, frequency: 'monthly', category: 'entertainment' },
  { name: 'Apple Music', amount: 10.99, frequency: 'monthly', category: 'music' },
  { name: 'Amazon Prime', amount: 14.99, frequency: 'monthly', category: 'lifestyle' },
  { name: 'HBO Max', amount: 15.99, frequency: 'monthly', category: 'entertainment' },
  { name: 'Hulu', amount: 7.99, frequency: 'monthly', category: 'entertainment' },
  { name: 'Xbox Game Pass', amount: 14.99, frequency: 'monthly', category: 'gaming' },
  { name: 'Adobe Creative Cloud', amount: 54.99, frequency: 'monthly', category: 'tools' },
  { name: 'Microsoft 365', amount: 9.99, frequency: 'monthly', category: 'productivity' },
  { name: 'Notion', amount: 10.00, frequency: 'monthly', category: 'productivity' },
  { name: 'GitHub Pro', amount: 4.00, frequency: 'monthly', category: 'tools' },
  { name: 'Figma', amount: 12.00, frequency: 'monthly', category: 'tools' },
  { name: 'Gym Membership', amount: 49.99, frequency: 'monthly', category: 'fitness' },
  { name: 'iCloud+', amount: 2.99, frequency: 'monthly', category: 'utilities' },
  { name: 'Google One', amount: 2.99, frequency: 'monthly', category: 'utilities' },
  { name: 'NordVPN', amount: 12.99, frequency: 'monthly', category: 'utilities' },
  { name: 'Audible', amount: 14.95, frequency: 'monthly', category: 'music' },
];

type SortOption = 'next_charge' | 'amount_high' | 'amount_low' | 'name' | 'last_used';

// Auto-detect category from service name
const detectCategory = (name: string): SubscriptionCategory => {
  const lowerName = name.toLowerCase();
  
  // Tools & AI
  if (['lovable', 'chatgpt', 'openai', 'claude', 'github', 'copilot', 'notion', 'figma', 'canva', 'zapier', 'vercel', 'netlify', 'aws', 'heroku', 'digitalocean'].some(s => lowerName.includes(s))) {
    return 'tools';
  }
  
  // Entertainment
  if (['netflix', 'hulu', 'disney', 'hbo', 'paramount', 'peacock', 'amazon prime', 'apple tv', 'youtube premium', 'crunchyroll', 'twitch'].some(s => lowerName.includes(s))) {
    return 'entertainment';
  }
  
  // Music
  if (['spotify', 'apple music', 'tidal', 'deezer', 'soundcloud', 'pandora', 'audible'].some(s => lowerName.includes(s))) {
    return 'music';
  }
  
  // Gaming
  if (['xbox', 'playstation', 'nintendo', 'steam', 'ea play', 'ubisoft', 'game pass'].some(s => lowerName.includes(s))) {
    return 'gaming';
  }
  
  // Productivity
  if (['microsoft 365', 'office', 'google workspace', 'slack', 'zoom', 'asana', 'trello', 'monday', 'dropbox', 'evernote', '1password', 'lastpass'].some(s => lowerName.includes(s))) {
    return 'productivity';
  }
  
  // Fitness
  if (['gym', 'fitness', 'peloton', 'strava', 'myfitnesspal', 'fitbit', 'headspace', 'calm'].some(s => lowerName.includes(s))) {
    return 'fitness';
  }
  
  // News
  if (['nytimes', 'wsj', 'washington post', 'medium', 'substack', 'economist', 'atlantic'].some(s => lowerName.includes(s))) {
    return 'news';
  }
  
  // Utilities
  if (['phone', 'mobile', 'internet', 'electricity', 'water', 'gas', 'insurance', 'vpn', 'icloud', 'google one'].some(s => lowerName.includes(s))) {
    return 'utilities';
  }
  
  // Lifestyle
  if (['amazon', 'instacart', 'doordash', 'uber', 'birchbox', 'stitch fix', 'hello fresh'].some(s => lowerName.includes(s))) {
    return 'lifestyle';
  }
  
  return 'other';
};

export function Subscriptions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [trialToConvert, setTrialToConvert] = useState<Subscription | null>(null);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('next_charge');
  const [filterCategory, setFilterCategory] = useState<SubscriptionCategory | 'all'>('all');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<'monthly' | 'weekly' | 'yearly'>('monthly');
  const [category, setCategory] = useState<SubscriptionCategory>('other');
  const [nextCharge, setNextCharge] = useState('');
  const [isTrial, setIsTrial] = useState(false);
  const [trialEndDate, setTrialEndDate] = useState('');
  
  // Edit form state
  const [editName, setEditName] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editFrequency, setEditFrequency] = useState<'monthly' | 'weekly' | 'yearly'>('monthly');
  const [editCategory, setEditCategory] = useState<SubscriptionCategory>('other');
  const [editNextCharge, setEditNextCharge] = useState('');

  // Auto-detect category when name changes
  useEffect(() => {
    if (name) {
      const detected = detectCategory(name);
      setCategory(detected);
    }
  }, [name]);

  useEffect(() => {
    if (user) {
      fetchSubscriptions();
      
      // Subscribe to realtime changes
      const channel = supabase
        .channel('subscriptions-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'subscriptions',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              const newSub = {
                ...payload.new,
                amount: Number(payload.new.amount),
                frequency: payload.new.frequency as 'weekly' | 'monthly' | 'yearly',
                category: payload.new.category as SubscriptionCategory
              } as Subscription;
              setSubscriptions(prev => [...prev, newSub].sort((a, b) => 
                new Date(a.next_charge_date).getTime() - new Date(b.next_charge_date).getTime()
              ));
            } else if (payload.eventType === 'DELETE') {
              setSubscriptions(prev => prev.filter(s => s.id !== payload.old.id));
            } else if (payload.eventType === 'UPDATE') {
              setSubscriptions(prev => prev.map(s => 
                s.id === payload.new.id 
                  ? { 
                      ...payload.new, 
                      amount: Number(payload.new.amount),
                      frequency: payload.new.frequency as 'weekly' | 'monthly' | 'yearly',
                      category: payload.new.category as SubscriptionCategory
                    } as Subscription
                  : s
              ));
            }
          }
        )
        .subscribe();
      
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchSubscriptions = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('next_charge_date', { ascending: true });
      
      if (error) throw error;
      
      setSubscriptions(data.map(s => ({
        ...s,
        amount: Number(s.amount),
        frequency: s.frequency as 'weekly' | 'monthly' | 'yearly',
        category: s.category as SubscriptionCategory
      })));
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const addSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name || !amount || !nextCharge) return;

    try {
      const { error } = await supabase
        .from('subscriptions')
        .insert({
          user_id: user.id,
          name,
          amount: parseFloat(amount),
          frequency,
          category,
          next_charge_date: nextCharge,
          is_trial: isTrial,
          trial_end_date: isTrial && trialEndDate ? trialEndDate : null
        });
      
      if (error) throw error;
      
      toast({ title: 'Subscription added! 📝' });
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error adding subscription:', error);
      toast({ title: 'Failed to add subscription', variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setName('');
    setAmount('');
    setNextCharge('');
    setCategory('other');
    setFrequency('monthly');
    setIsTrial(false);
    setTrialEndDate('');
  };

  const deleteSubscription = async (id: string) => {
    try {
      const { error } = await supabase
        .from('subscriptions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast({ title: 'Subscription removed' });
    } catch (error) {
      toast({ title: 'Failed to delete', variant: 'destructive' });
    }
  };

  const markAsUsed = async (id: string) => {
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ last_used_date: new Date().toISOString().split('T')[0] })
        .eq('id', id);
      
      if (error) throw error;
      
      setSubscriptions(prev => prev.map(s => 
        s.id === id ? { ...s, last_used_date: new Date().toISOString().split('T')[0] } : s
      ));
      toast({ title: 'Marked as used! ✓' });
    } catch (error) {
      toast({ title: 'Failed to update', variant: 'destructive' });
    }
  };

  const openConvertDialog = (sub: Subscription) => {
    setTrialToConvert(sub);
    setConvertDialogOpen(true);
  };

  const openEditDialog = (sub: Subscription) => {
    setEditingSubscription(sub);
    setEditName(sub.name);
    setEditAmount(sub.amount.toString());
    setEditFrequency(sub.frequency);
    setEditCategory(sub.category);
    setEditNextCharge(sub.next_charge_date);
    setEditDialogOpen(true);
  };

  const updateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubscription || !editName || !editAmount) return;

    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({
          name: editName,
          amount: parseFloat(editAmount),
          frequency: editFrequency,
          category: editCategory,
          next_charge_date: editNextCharge
        })
        .eq('id', editingSubscription.id);
      
      if (error) throw error;
      
      setSubscriptions(prev => prev.map(s => 
        s.id === editingSubscription.id 
          ? { ...s, name: editName, amount: parseFloat(editAmount), frequency: editFrequency, category: editCategory, next_charge_date: editNextCharge }
          : s
      ));
      
      toast({ title: 'Subscription updated! ✓' });
      setEditDialogOpen(false);
      setEditingSubscription(null);
    } catch (error) {
      toast({ title: 'Failed to update', variant: 'destructive' });
    }
  };

  const selectSuggestion = (suggestion: typeof POPULAR_SUBSCRIPTIONS[0]) => {
    setName(suggestion.name);
    setAmount(suggestion.amount.toString());
    setFrequency(suggestion.frequency);
    setCategory(suggestion.category);
    setShowSuggestions(false);
    
    // Set next charge to 1 month from now for monthly subscriptions
    const nextDate = new Date();
    if (suggestion.frequency === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
    else if (suggestion.frequency === 'yearly') nextDate.setFullYear(nextDate.getFullYear() + 1);
    else nextDate.setDate(nextDate.getDate() + 7);
    setNextCharge(nextDate.toISOString().split('T')[0]);
  };

  // Filter suggestions based on input
  const filteredSuggestions = useMemo(() => {
    if (!name) return POPULAR_SUBSCRIPTIONS.slice(0, 6);
    return POPULAR_SUBSCRIPTIONS.filter(s => 
      s.name.toLowerCase().includes(name.toLowerCase())
    ).slice(0, 6);
  }, [name]);

  const confirmConvertToPaid = async () => {
    if (!trialToConvert) return;
    
    try {
      // Calculate next charge date based on frequency
      const nextChargeDate = new Date();
      if (trialToConvert.frequency === 'monthly') {
        nextChargeDate.setMonth(nextChargeDate.getMonth() + 1);
      } else if (trialToConvert.frequency === 'weekly') {
        nextChargeDate.setDate(nextChargeDate.getDate() + 7);
      } else if (trialToConvert.frequency === 'yearly') {
        nextChargeDate.setFullYear(nextChargeDate.getFullYear() + 1);
      }

      const { error } = await supabase
        .from('subscriptions')
        .update({ 
          is_trial: false, 
          trial_end_date: null,
          next_charge_date: nextChargeDate.toISOString().split('T')[0]
        })
        .eq('id', trialToConvert.id);
      
      if (error) throw error;
      
      setSubscriptions(prev => prev.map(s => 
        s.id === trialToConvert.id ? { 
          ...s, 
          is_trial: false, 
          trial_end_date: null,
          next_charge_date: nextChargeDate.toISOString().split('T')[0]
        } : s
      ));
      toast({ title: '✅ Converted to paid subscription!' });
      setConvertDialogOpen(false);
      setTrialToConvert(null);
    } catch (error) {
      toast({ title: 'Failed to convert', variant: 'destructive' });
    }
  };

  const getDaysUntilCharge = (date: string) => {
    const chargeDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    chargeDate.setHours(0, 0, 0, 0);
    return Math.ceil((chargeDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getDaysSinceUsed = (date: string | null) => {
    if (!date) return null;
    const usedDate = new Date(date);
    const today = new Date();
    return Math.floor((today.getTime() - usedDate.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getTrialDaysLeft = (sub: Subscription) => {
    if (!sub.is_trial || !sub.trial_end_date) return null;
    const endDate = new Date(sub.trial_end_date);
    const today = new Date();
    return Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getMonthlyTotal = () => {
    return subscriptions.reduce((sum, s) => {
      if (s.is_trial) return sum;
      const amount = s.amount;
      if (s.frequency === 'weekly') return sum + (amount * 4.33);
      if (s.frequency === 'yearly') return sum + (amount / 12);
      return sum + amount;
    }, 0);
  };

  const getYearlyTotal = () => getMonthlyTotal() * 12;

  const getUnusedSubscriptions = () => {
    return subscriptions.filter(s => {
      const daysSince = getDaysSinceUsed(s.last_used_date);
      return daysSince !== null && daysSince > 30;
    });
  };

  const getUpcomingSubscriptions = () => {
    return subscriptions.filter(s => {
      const days = getDaysUntilCharge(s.next_charge_date);
      return days >= 0 && days <= 7;
    });
  };

  const getActiveTrials = () => {
    return subscriptions.filter(s => {
      if (!s.is_trial || !s.trial_end_date) return false;
      const daysLeft = getTrialDaysLeft(s);
      return daysLeft !== null && daysLeft >= 0;
    }).sort((a, b) => {
      const daysA = getTrialDaysLeft(a) || 0;
      const daysB = getTrialDaysLeft(b) || 0;
      return daysA - daysB;
    });
  };

  const unusedSavings = getUnusedSubscriptions().reduce((sum, s) => sum + s.amount, 0);
  const upcomingCharges = getUpcomingSubscriptions().reduce((sum, s) => sum + s.amount, 0);
  const activeTrials = getActiveTrials();

  // Filtered and sorted subscriptions
  const processedSubscriptions = useMemo(() => {
    let result = [...subscriptions];
    
    // Apply search filter
    if (searchQuery) {
      result = result.filter(s => 
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply category filter
    if (filterCategory !== 'all') {
      result = result.filter(s => s.category === filterCategory);
    }
    
    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'next_charge':
          return new Date(a.next_charge_date).getTime() - new Date(b.next_charge_date).getTime();
        case 'amount_high':
          return b.amount - a.amount;
        case 'amount_low':
          return a.amount - b.amount;
        case 'name':
          return a.name.localeCompare(b.name);
        case 'last_used':
          if (!a.last_used_date && !b.last_used_date) return 0;
          if (!a.last_used_date) return 1;
          if (!b.last_used_date) return -1;
          return new Date(b.last_used_date).getTime() - new Date(a.last_used_date).getTime();
        default:
          return 0;
      }
    });
    
    return result;
  }, [subscriptions, searchQuery, filterCategory, sortBy]);

  // Group subscriptions by category
  const groupedSubscriptions = processedSubscriptions.reduce((acc, sub) => {
    if (!acc[sub.category]) acc[sub.category] = [];
    acc[sub.category].push(sub);
    return acc;
  }, {} as Record<SubscriptionCategory, Subscription[]>);

  const sortedCategories = Object.keys(groupedSubscriptions).sort((a, b) => {
    const order: SubscriptionCategory[] = ['tools', 'entertainment', 'music', 'gaming', 'productivity', 'fitness', 'lifestyle', 'utilities', 'news', 'other'];
    return order.indexOf(a as SubscriptionCategory) - order.indexOf(b as SubscriptionCategory);
  }) as SubscriptionCategory[];

  // Category breakdown for analytics
  const categoryBreakdown = useMemo(() => {
    return Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
      const subs = subscriptions.filter(s => s.category === key && !s.is_trial);
      const total = subs.reduce((sum, s) => {
        if (s.frequency === 'weekly') return sum + s.amount * 4.33;
        if (s.frequency === 'yearly') return sum + s.amount / 12;
        return sum + s.amount;
      }, 0);
      return { category: key as SubscriptionCategory, ...config, total, count: subs.length };
    }).filter(c => c.count > 0).sort((a, b) => b.total - a.total);
  }, [subscriptions]);

  return (
    <div className="px-3 py-2 space-y-3 overflow-y-auto h-full pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Subscriptions</h2>
          <p className="text-xs text-muted-foreground">{subscriptions.length} active · ${getMonthlyTotal().toFixed(0)}/mo</p>
        </div>
        <div className="flex gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className={cn("h-8 w-8 p-0", showCalendar && "bg-primary text-primary-foreground")}
            onClick={() => setShowCalendar(!showCalendar)}
            title="Calendar view"
          >
            <CalendarDays className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={cn("h-8 w-8 p-0", showAnalytics && "bg-primary text-primary-foreground")}
            onClick={() => setShowAnalytics(!showAnalytics)}
            title="Analytics"
          >
            <PieChart className="w-3.5 h-3.5" />
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="rounded-full shadow-md h-8 text-xs">
              <Plus className="w-3.5 h-3.5 mr-1" /> Add
            </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto mx-4">
              <DialogHeader>
                <DialogTitle className="text-base">Add Subscription</DialogTitle>
              </DialogHeader>
              <form onSubmit={addSubscription} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs">Service Name</Label>
                  <div className="relative">
                    <Input
                      id="name"
                      placeholder="Netflix, ChatGPT, Spotify..."
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      className="h-9 text-sm"
                    />
                    <AnimatePresence>
                      {showSuggestions && filteredSuggestions.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden"
                        >
                          {filteredSuggestions.map((suggestion) => {
                            const Icon = CATEGORY_CONFIG[suggestion.category].icon;
                            return (
                              <button
                                key={suggestion.name}
                                type="button"
                                onClick={() => selectSuggestion(suggestion)}
                                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted transition-colors text-left"
                              >
                                <Icon className={cn("w-4 h-4", CATEGORY_CONFIG[suggestion.category].color)} />
                                <span className="flex-1 text-sm">{suggestion.name}</span>
                                <span className="text-xs text-muted-foreground">${suggestion.amount}/mo</span>
                              </button>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="amount" className="text-xs">Amount ($)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="15.99"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="frequency" className="text-xs">Billing Cycle</Label>
                  <Select value={frequency} onValueChange={(v) => setFrequency(v as 'monthly' | 'weekly' | 'yearly')}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="category" className="text-xs">Category</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as SubscriptionCategory)}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
                      const Icon = config.icon;
                      return (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <Icon className={cn("w-3.5 h-3.5", config.color)} />
                            <span className="text-sm">{config.label}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="next-charge" className="text-xs">Next Charge Date</Label>
                <Input
                  id="next-charge"
                  type="date"
                  value={nextCharge}
                  onChange={(e) => setNextCharge(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="flex items-center justify-between p-2.5 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-yellow-500" />
                  <span className="text-xs font-medium">Free Trial?</span>
                </div>
                <Switch checked={isTrial} onCheckedChange={setIsTrial} />
              </div>
              {isTrial && (
                <div className="space-y-1.5">
                  <Label htmlFor="trial-end" className="text-xs">Trial Ends On</Label>
                  <Input
                    id="trial-end"
                    type="date"
                    value={trialEndDate}
                    onChange={(e) => setTrialEndDate(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
              )}
                <Button type="submit" className="w-full h-9 text-sm">Add Subscription</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search subscriptions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
              onClick={() => setSearchQuery('')}
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className="h-8 w-[110px] text-xs">
            <ArrowUpDown className="w-3 h-3 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="next_charge" className="text-xs">Next charge</SelectItem>
            <SelectItem value="amount_high" className="text-xs">Highest cost</SelectItem>
            <SelectItem value="amount_low" className="text-xs">Lowest cost</SelectItem>
            <SelectItem value="name" className="text-xs">Name A-Z</SelectItem>
            <SelectItem value="last_used" className="text-xs">Last used</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Category Filter Chips */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-3 px-3 scrollbar-thin">
        <button
          onClick={() => setFilterCategory('all')}
          className={cn(
            "px-2.5 py-1 rounded-full text-xs font-medium shrink-0 transition-colors",
            filterCategory === 'all' 
              ? "bg-primary text-primary-foreground" 
              : "bg-muted hover:bg-muted/80"
          )}
        >
          All ({subscriptions.length})
        </button>
        {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
          const count = subscriptions.filter(s => s.category === key).length;
          if (count === 0) return null;
          const Icon = config.icon;
          return (
            <button
              key={key}
              onClick={() => setFilterCategory(key as SubscriptionCategory)}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium shrink-0 transition-colors",
                filterCategory === key 
                  ? "bg-primary text-primary-foreground" 
                  : config.bgColor
              )}
            >
              <Icon className={cn("w-3 h-3", filterCategory === key ? "" : config.color)} />
              {count}
            </button>
          );
        })}
      </div>

      {/* Calendar View */}
      <AnimatePresence>
        {showCalendar && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <SubscriptionCalendar 
              subscriptions={subscriptions}
              categoryConfig={CATEGORY_CONFIG}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Analytics Panel */}
      <AnimatePresence>
        {showAnalytics && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="overflow-hidden">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm">Spending Breakdown</h3>
                  <span className="text-xs text-muted-foreground">${getMonthlyTotal().toFixed(0)}/mo total</span>
                </div>
                <div className="space-y-2">
                  {categoryBreakdown.map((cat) => {
                    const Icon = cat.icon;
                    const percentage = getMonthlyTotal() > 0 ? (cat.total / getMonthlyTotal()) * 100 : 0;
                    return (
                      <div key={cat.category} className="flex items-center gap-2">
                        <div className={cn("w-6 h-6 rounded flex items-center justify-center shrink-0", cat.bgColor)}>
                          <Icon className={cn("w-3.5 h-3.5", cat.color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between text-xs mb-0.5">
                            <span className="font-medium truncate">{cat.label}</span>
                            <span className="text-muted-foreground">${cat.total.toFixed(0)}/mo</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              className={cn("h-full rounded-full", cat.bgColor.replace('/10', ''))}
                            />
                          </div>
                        </div>
                        <span className="text-[10px] text-muted-foreground w-8 text-right">{percentage.toFixed(0)}%</span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 pt-3 border-t border-border flex justify-between text-xs">
                  <span className="text-muted-foreground">Yearly projection</span>
                  <span className="font-bold">${getYearlyTotal().toFixed(0)}</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Subscription Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto mx-4">
          <DialogHeader>
            <DialogTitle className="text-base">Edit Subscription</DialogTitle>
          </DialogHeader>
          <form onSubmit={updateSubscription} className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Service Name</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Amount ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Billing Cycle</Label>
                <Select value={editFrequency} onValueChange={(v) => setEditFrequency(v as 'monthly' | 'weekly' | 'yearly')}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Category</Label>
              <Select value={editCategory} onValueChange={(v) => setEditCategory(v as SubscriptionCategory)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
                    const Icon = config.icon;
                    return (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <Icon className={cn("w-3.5 h-3.5", config.color)} />
                          <span className="text-sm">{config.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Next Charge Date</Label>
              <Input
                type="date"
                value={editNextCharge}
                onChange={(e) => setEditNextCharge(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1 h-9 text-sm" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1 h-9 text-sm">Save Changes</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Convert Trial Confirmation Dialog */}
      <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              Keep {trialToConvert?.name}?
            </DialogTitle>
            <DialogDescription className="pt-2">
              You're about to convert this trial to a paid subscription.
            </DialogDescription>
          </DialogHeader>
          
          {trialToConvert && (
            <div className="py-4 space-y-4">
              <div className="p-4 rounded-xl bg-muted/50 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Service</span>
                  <span className="font-semibold">{trialToConvert.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Price</span>
                  <span className="font-bold text-lg">
                    ${trialToConvert.amount.toFixed(2)}/{trialToConvert.frequency === 'monthly' ? 'mo' : trialToConvert.frequency === 'weekly' ? 'wk' : 'yr'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">First charge</span>
                  <span className="text-sm">
                    {(() => {
                      const date = new Date();
                      if (trialToConvert.frequency === 'monthly') date.setMonth(date.getMonth() + 1);
                      else if (trialToConvert.frequency === 'weekly') date.setDate(date.getDate() + 7);
                      else date.setFullYear(date.getFullYear() + 1);
                      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                    })()}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-border">
                  <span className="text-sm text-muted-foreground">Yearly cost</span>
                  <span className="font-semibold text-primary">
                    ${(trialToConvert.frequency === 'monthly' 
                      ? trialToConvert.amount * 12 
                      : trialToConvert.frequency === 'weekly' 
                        ? trialToConvert.amount * 52 
                        : trialToConvert.amount
                    ).toFixed(2)}/yr
                  </span>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => setConvertDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={confirmConvertToPaid}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Yes, Keep Subscription
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-2">
        <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
          <CardContent className="p-3">
            <p className="text-[10px] opacity-80">Monthly Cost</p>
            <p className="text-xl font-bold">${getMonthlyTotal().toFixed(0)}</p>
            <p className="text-[10px] opacity-60">${getYearlyTotal().toFixed(0)}/year</p>
          </CardContent>
        </Card>
        <Card className={cn(
          "bg-gradient-to-br",
          upcomingCharges > 0 ? "from-amber-500 to-orange-500 text-white" : "from-muted to-muted"
        )}>
          <CardContent className="p-3">
            <p className="text-[10px] opacity-80">Next 7 Days</p>
            <p className="text-xl font-bold">${upcomingCharges.toFixed(0)}</p>
            <p className="text-[10px] opacity-60">{getUpcomingSubscriptions().length} charges</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Trials Section */}
      {activeTrials.length > 0 && (
        <Card className="border-yellow-500/50 bg-gradient-to-br from-yellow-500/10 to-orange-500/5">
          <CardContent className="py-3 px-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-full bg-yellow-500/20">
                <Timer className="w-4 h-4 text-yellow-600" />
              </div>
              <div>
                <p className="font-semibold text-sm text-yellow-700 dark:text-yellow-400">Active Trials</p>
                <p className="text-[10px] text-muted-foreground">{activeTrials.length} trial{activeTrials.length > 1 ? 's' : ''}</p>
              </div>
            </div>
            <div className="space-y-2">
              {activeTrials.map(trial => {
                const daysLeft = getTrialDaysLeft(trial) || 0;
                const trialConfig = CATEGORY_CONFIG[trial.category];
                const TrialIcon = trialConfig.icon;
                const isUrgent = daysLeft <= 3;
                const progressPercent = trial.trial_end_date 
                  ? Math.max(0, Math.min(100, (1 - daysLeft / 30) * 100))
                  : 0;
                
                return (
                  <div 
                    key={trial.id} 
                    className={cn(
                      "p-2.5 rounded-lg transition-all",
                      isUrgent 
                        ? "bg-red-500/10 border border-red-500/30" 
                        : "bg-background/50 border border-border/50"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                        trialConfig.bgColor
                      )}>
                        <TrialIcon className={cn("w-4 h-4", trialConfig.color)} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-semibold text-sm truncate">{trial.name}</h4>
                          {isUrgent && (
                            <Bell className="w-3 h-3 text-red-500 animate-pulse" />
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1.5 mt-1">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={cn(
                                "h-full rounded-full transition-all",
                                isUrgent ? "bg-red-500" : "bg-yellow-500"
                              )}
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                          <span className={cn(
                            "text-xs font-bold shrink-0",
                            isUrgent ? "text-red-500" : "text-yellow-600"
                          )}>
                            {daysLeft === 0 ? 'Today!' : `${daysLeft}d`}
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-right shrink-0">
                        <p className="text-[10px] text-muted-foreground">Then</p>
                        <p className="font-bold text-xs">
                          ${trial.amount.toFixed(0)}/{trial.frequency === 'monthly' ? 'mo' : trial.frequency === 'weekly' ? 'wk' : 'yr'}
                        </p>
                      </div>
                      
                      <div className="flex gap-1 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-[10px] bg-green-500/10 border-green-500/30 text-green-600 hover:bg-green-500/20"
                          onClick={() => openConvertDialog(trial)}
                        >
                          <CheckCircle2 className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteSubscription(trial.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    
                    {isUrgent && (
                      <p className="text-[10px] text-red-500 mt-1.5 flex items-center gap-1">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        Decide now to avoid ${trial.amount.toFixed(2)} charge
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Zombie Warning */}
      {unusedSavings > 0 && (
        <Card className="border-warning/50 bg-warning/10">
          <CardContent className="py-2.5 px-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-full bg-warning/20">
                <AlertTriangle className="w-4 h-4 text-warning" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm text-warning">Zombie Subscriptions</p>
                <p className="text-xs text-muted-foreground">
                  {getUnusedSubscriptions().length} unused · Save <span className="font-bold text-warning">${unusedSavings.toFixed(0)}/mo</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading/Empty State */}
      {loading ? (
        <div className="text-center py-8">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-muted-foreground mt-2">Loading...</p>
        </div>
      ) : processedSubscriptions.length === 0 && subscriptions.length > 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <Search className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold text-sm mb-1">No matches found</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Try adjusting your search or filters
            </p>
            <Button size="sm" variant="outline" onClick={() => { setSearchQuery(''); setFilterCategory('all'); }}>
              Clear filters
            </Button>
          </CardContent>
        </Card>
      ) : subscriptions.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <Tv className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-sm mb-1">No subscriptions yet</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Track recurring payments
            </p>
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Add First
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedCategories.map(cat => {
            const config = CATEGORY_CONFIG[cat];
            const Icon = config.icon;
            const subs = groupedSubscriptions[cat];
            
            return (
              <div key={cat} className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Icon className={cn("w-3.5 h-3.5", config.color)} />
                  <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wide">
                    {config.label} ({subs.length})
                  </h3>
                </div>
                <AnimatePresence>
                  {subs.map(sub => (
                    <motion.div
                      key={sub.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      layout
                    >
                      <SubscriptionCard 
                        sub={sub} 
                        config={config}
                        onDelete={deleteSubscription}
                        onMarkUsed={markAsUsed}
                        onEdit={openEditDialog}
                        getDaysUntilCharge={getDaysUntilCharge}
                        getDaysSinceUsed={getDaysSinceUsed}
                        getTrialDaysLeft={getTrialDaysLeft}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface SubscriptionCardProps {
  sub: Subscription;
  config: { label: string; icon: typeof Tv; color: string; bgColor: string };
  onDelete: (id: string) => void;
  onMarkUsed: (id: string) => void;
  onEdit: (sub: Subscription) => void;
  getDaysUntilCharge: (date: string) => number;
  getDaysSinceUsed: (date: string | null) => number | null;
  getTrialDaysLeft: (sub: Subscription) => number | null;
}

function SubscriptionCard({ sub, config, onDelete, onMarkUsed, onEdit, getDaysUntilCharge, getDaysSinceUsed, getTrialDaysLeft }: SubscriptionCardProps) {
  const Icon = config.icon;
  const daysUntil = getDaysUntilCharge(sub.next_charge_date);
  const daysSinceUsed = getDaysSinceUsed(sub.last_used_date);
  const trialDaysLeft = getTrialDaysLeft(sub);
  const isZombie = daysSinceUsed !== null && daysSinceUsed > 30;
  const isUpcoming = daysUntil <= 3 && daysUntil >= 0;

  return (
    <Card className={cn(
      'relative overflow-hidden transition-all',
      isZombie && 'border-warning/50 bg-warning/5',
      sub.is_trial && 'border-yellow-500/50 bg-yellow-500/5'
    )}>
      <CardContent className="py-2.5 px-3">
        <div className="flex items-center gap-2">
          {/* Icon */}
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
            config.bgColor
          )}>
            <Icon className={cn("w-4 h-4", config.color)} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-semibold text-sm truncate">{sub.name}</h3>
              {sub.is_trial && trialDaysLeft !== null && trialDaysLeft > 0 && (
                <span className="text-[10px] bg-yellow-500/20 text-yellow-600 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shrink-0">
                  <Zap className="w-2.5 h-2.5" />
                  {trialDaysLeft}d
                </span>
              )}
              {isZombie && (
                <span className="text-[10px] bg-warning/20 text-warning px-1.5 py-0.5 rounded-full shrink-0">
                  💤
                </span>
              )}
              {isUpcoming && !sub.is_trial && (
                <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full shrink-0">
                  Soon
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-0.5">
                <Calendar className="w-2.5 h-2.5" />
                {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : daysUntil < 0 ? 'Past due' : `${daysUntil}d`}
              </span>
              {daysSinceUsed !== null && (
                <span className="flex items-center gap-0.5">
                  <Clock className="w-2.5 h-2.5" />
                  {daysSinceUsed === 0 ? 'Used today' : `${daysSinceUsed}d ago`}
                </span>
              )}
            </div>
          </div>

          {/* Price & Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="text-right">
              <p className={cn("font-bold text-sm", sub.is_trial && "line-through text-muted-foreground")}>
                ${sub.amount.toFixed(0)}
              </p>
              <p className="text-[10px] text-muted-foreground">
                /{sub.frequency === 'monthly' ? 'mo' : sub.frequency === 'weekly' ? 'wk' : 'yr'}
              </p>
            </div>
            <div className="flex gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-primary"
                onClick={() => onMarkUsed(sub.id)}
                title="Mark as used"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-blue-500"
                onClick={() => onEdit(sub)}
                title="Edit subscription"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(sub.id)}
                title="Delete subscription"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}