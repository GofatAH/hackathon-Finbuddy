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
import { Plus, AlertTriangle, Calendar, Trash2, CheckCircle2, Clock, Zap, Shield, Play, Music, Tv, Dumbbell, Phone, CreditCard as CreditCardIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Subscription {
  id: string;
  name: string;
  amount: number;
  frequency: 'weekly' | 'monthly' | 'yearly';
  next_charge_date: string;
  last_used_date: string | null;
  is_trial: boolean;
  trial_end_date: string | null;
  category: 'needs' | 'wants';
}

const SERVICE_ICONS: Record<string, typeof Tv> = {
  netflix: Tv,
  spotify: Music,
  hulu: Tv,
  disney: Tv,
  hbo: Tv,
  amazon: Play,
  prime: Play,
  gym: Dumbbell,
  fitness: Dumbbell,
  phone: Phone,
  mobile: Phone,
  insurance: Shield,
  default: CreditCardIcon
};

const getServiceIcon = (name: string) => {
  const lowerName = name.toLowerCase();
  for (const [key, Icon] of Object.entries(SERVICE_ICONS)) {
    if (lowerName.includes(key)) return Icon;
  }
  return SERVICE_ICONS.default;
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
  const [category, setCategory] = useState<'needs' | 'wants'>('wants');
  const [nextCharge, setNextCharge] = useState('');
  const [isTrial, setIsTrial] = useState(false);
  const [trialEndDate, setTrialEndDate] = useState('');

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
                category: payload.new.category as 'needs' | 'wants'
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
                      category: payload.new.category as 'needs' | 'wants'
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
        category: s.category as 'needs' | 'wants'
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
      toast({ title: 'Failed to add subscription', variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setName('');
    setAmount('');
    setNextCharge('');
    setCategory('wants');
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

  const needsSubs = subscriptions.filter(s => s.category === 'needs');
  const wantsSubs = subscriptions.filter(s => s.category === 'wants');

  return (
    <div className="p-4 space-y-6 overflow-y-auto h-full pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Subscriptions</h2>
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
                  placeholder="Netflix, Spotify, Gym..."
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
                  <Select value={frequency} onValueChange={(v) => setFrequency(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as 'needs' | 'wants')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="needs">Needs (Essential)</SelectItem>
                    <SelectItem value="wants">Wants (Entertainment)</SelectItem>
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
              <CreditCardIcon className="w-8 h-8 text-muted-foreground" />
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
          {/* Needs Section */}
          {needsSubs.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-500" />
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Essential ({needsSubs.length})
                </h3>
              </div>
              {needsSubs.map(sub => (
                <SubscriptionCard 
                  key={sub.id} 
                  sub={sub} 
                  onDelete={deleteSubscription}
                  onMarkUsed={markAsUsed}
                  getDaysUntilCharge={getDaysUntilCharge}
                  getDaysSinceUsed={getDaysSinceUsed}
                  getTrialDaysLeft={getTrialDaysLeft}
                />
              ))}
            </div>
          )}

          {/* Wants Section */}
          {wantsSubs.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4 text-purple-500" />
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Entertainment ({wantsSubs.length})
                </h3>
              </div>
              {wantsSubs.map(sub => (
                <SubscriptionCard 
                  key={sub.id} 
                  sub={sub} 
                  onDelete={deleteSubscription}
                  onMarkUsed={markAsUsed}
                  getDaysUntilCharge={getDaysUntilCharge}
                  getDaysSinceUsed={getDaysSinceUsed}
                  getTrialDaysLeft={getTrialDaysLeft}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface SubscriptionCardProps {
  sub: Subscription;
  onDelete: (id: string) => void;
  onMarkUsed: (id: string) => void;
  getDaysUntilCharge: (date: string) => number;
  getDaysSinceUsed: (date: string | null) => number | null;
  getTrialDaysLeft: (sub: Subscription) => number | null;
}

function SubscriptionCard({ sub, onDelete, onMarkUsed, getDaysUntilCharge, getDaysSinceUsed, getTrialDaysLeft }: SubscriptionCardProps) {
  const Icon = getServiceIcon(sub.name);
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
            sub.category === 'needs' ? 'bg-blue-500/10' : 'bg-purple-500/10'
          )}>
            <Icon className={cn(
              "w-5 h-5",
              sub.category === 'needs' ? 'text-blue-500' : 'text-purple-500'
            )} />
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