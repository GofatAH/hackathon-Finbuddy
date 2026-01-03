import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Plus, AlertTriangle, Calendar, Trash2, CheckCircle2, Clock, Zap, Wrench, Tv, Music, Gamepad2, Newspaper, Dumbbell, Sparkles, Lightbulb, MoreHorizontal, Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  
  // Form state
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<'monthly' | 'weekly' | 'yearly'>('monthly');
  const [category, setCategory] = useState<SubscriptionCategory>('other');
  const [nextCharge, setNextCharge] = useState('');
  const [isTrial, setIsTrial] = useState(false);
  const [trialEndDate, setTrialEndDate] = useState('');

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

  const unusedSavings = getUnusedSubscriptions().reduce((sum, s) => sum + s.amount, 0);
  const upcomingCharges = getUpcomingSubscriptions().reduce((sum, s) => sum + s.amount, 0);

  // Group subscriptions by category
  const groupedSubscriptions = subscriptions.reduce((acc, sub) => {
    if (!acc[sub.category]) acc[sub.category] = [];
    acc[sub.category].push(sub);
    return acc;
  }, {} as Record<SubscriptionCategory, Subscription[]>);

  const sortedCategories = Object.keys(groupedSubscriptions).sort((a, b) => {
    const order: SubscriptionCategory[] = ['tools', 'entertainment', 'music', 'gaming', 'productivity', 'fitness', 'lifestyle', 'utilities', 'news', 'other'];
    return order.indexOf(a as SubscriptionCategory) - order.indexOf(b as SubscriptionCategory);
  }) as SubscriptionCategory[];

  return (
    <div className="p-4 space-y-6 overflow-y-auto h-full pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Subscriptions</h2>
          <p className="text-sm text-muted-foreground">{subscriptions.length} active</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full shadow-lg">
              <Plus className="w-4 h-4 mr-1" /> Add New
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Subscription</DialogTitle>
            </DialogHeader>
            <form onSubmit={addSubscription} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Service Name</Label>
                <Input
                  id="name"
                  placeholder="Netflix, ChatGPT, Spotify..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount ($)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="15.99"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="frequency">Billing Cycle</Label>
                  <Select value={frequency} onValueChange={(v) => setFrequency(v as 'monthly' | 'weekly' | 'yearly')}>
                    <SelectTrigger>
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
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as SubscriptionCategory)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
                      const Icon = config.icon;
                      return (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <Icon className={cn("w-4 h-4", config.color)} />
                            {config.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="next-charge">Next Charge Date</Label>
                <Input
                  id="next-charge"
                  type="date"
                  value={nextCharge}
                  onChange={(e) => setNextCharge(e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm font-medium">Free Trial?</span>
                </div>
                <Switch checked={isTrial} onCheckedChange={setIsTrial} />
              </div>
              {isTrial && (
                <div className="space-y-2">
                  <Label htmlFor="trial-end">Trial Ends On</Label>
                  <Input
                    id="trial-end"
                    type="date"
                    value={trialEndDate}
                    onChange={(e) => setTrialEndDate(e.target.value)}
                  />
                </div>
              )}
              <Button type="submit" className="w-full">Add Subscription</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs opacity-80 mb-1">Monthly Cost</p>
            <p className="text-2xl font-bold">${getMonthlyTotal().toFixed(0)}</p>
            <p className="text-xs opacity-60 mt-1">${getYearlyTotal().toFixed(0)}/year</p>
          </CardContent>
        </Card>
        <Card className={cn(
          "bg-gradient-to-br",
          upcomingCharges > 0 ? "from-amber-500 to-orange-500 text-white" : "from-muted to-muted"
        )}>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs opacity-80 mb-1">Next 7 Days</p>
            <p className="text-2xl font-bold">${upcomingCharges.toFixed(0)}</p>
            <p className="text-xs opacity-60 mt-1">{getUpcomingSubscriptions().length} charges</p>
          </CardContent>
        </Card>
      </div>

      {/* Category Overview */}
      {sortedCategories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
          {sortedCategories.map(cat => {
            const config = CATEGORY_CONFIG[cat];
            const Icon = config.icon;
            const count = groupedSubscriptions[cat].length;
            const total = groupedSubscriptions[cat].reduce((sum, s) => {
              if (s.is_trial) return sum;
              if (s.frequency === 'weekly') return sum + s.amount * 4.33;
              if (s.frequency === 'yearly') return sum + s.amount / 12;
              return sum + s.amount;
            }, 0);
            
            return (
              <div
                key={cat}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-full shrink-0",
                  config.bgColor
                )}
              >
                <Icon className={cn("w-4 h-4", config.color)} />
                <span className="text-sm font-medium">{count}</span>
                <span className="text-xs text-muted-foreground">${total.toFixed(0)}/mo</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Zombie Warning */}
      {unusedSavings > 0 && (
        <Card className="border-warning/50 bg-warning/10">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-warning/20">
                <AlertTriangle className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="font-semibold text-warning">Zombie Subscriptions</p>
                <p className="text-sm text-muted-foreground mt-1">
                  You have {getUnusedSubscriptions().length} unused subscriptions. 
                  Cancel to save <span className="font-bold text-warning">${unusedSavings.toFixed(0)}/mo</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading/Empty State */}
      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground mt-3">Loading subscriptions...</p>
        </div>
      ) : subscriptions.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Tv className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-1">No subscriptions yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Track your recurring payments to avoid surprises
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-1" /> Add First Subscription
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {sortedCategories.map(cat => {
            const config = CATEGORY_CONFIG[cat];
            const Icon = config.icon;
            const subs = groupedSubscriptions[cat];
            
            return (
              <div key={cat} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Icon className={cn("w-4 h-4", config.color)} />
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    {config.label} ({subs.length})
                  </h3>
                </div>
                {subs.map(sub => (
                  <SubscriptionCard 
                    key={sub.id} 
                    sub={sub} 
                    config={config}
                    onDelete={deleteSubscription}
                    onMarkUsed={markAsUsed}
                    getDaysUntilCharge={getDaysUntilCharge}
                    getDaysSinceUsed={getDaysSinceUsed}
                    getTrialDaysLeft={getTrialDaysLeft}
                  />
                ))}
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
  getDaysUntilCharge: (date: string) => number;
  getDaysSinceUsed: (date: string | null) => number | null;
  getTrialDaysLeft: (sub: Subscription) => number | null;
}

function SubscriptionCard({ sub, config, onDelete, onMarkUsed, getDaysUntilCharge, getDaysSinceUsed, getTrialDaysLeft }: SubscriptionCardProps) {
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
      <CardContent className="py-4 px-4">
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
            config.bgColor
          )}>
            <Icon className={cn("w-5 h-5", config.color)} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold truncate">{sub.name}</h3>
              {sub.is_trial && trialDaysLeft !== null && trialDaysLeft > 0 && (
                <span className="text-xs bg-yellow-500/20 text-yellow-600 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                  <Zap className="w-3 h-3" />
                  {trialDaysLeft}d trial
                </span>
              )}
              {isZombie && (
                <span className="text-xs bg-warning/20 text-warning px-2 py-0.5 rounded-full shrink-0">
                  💤 Unused
                </span>
              )}
              {isUpcoming && !sub.is_trial && (
                <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full shrink-0">
                  Soon
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : daysUntil < 0 ? 'Past due' : `${daysUntil}d`}
              </span>
              {daysSinceUsed !== null && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {daysSinceUsed === 0 ? 'Used today' : `${daysSinceUsed}d ago`}
                </span>
              )}
            </div>
          </div>

          {/* Price & Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right">
              <p className={cn("font-bold", sub.is_trial && "line-through text-muted-foreground")}>
                ${sub.amount.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">
                /{sub.frequency === 'monthly' ? 'mo' : sub.frequency === 'weekly' ? 'wk' : 'yr'}
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-primary"
                onClick={() => onMarkUsed(sub.id)}
                title="Mark as used"
              >
                <CheckCircle2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(sub.id)}
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}