import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, AlertTriangle, Calendar, Trash2 } from 'lucide-react';
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
  const [nextCharge, setNextCharge] = useState('');
  const [isTrial, setIsTrial] = useState(false);

  useEffect(() => {
    if (user) fetchSubscriptions();
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
          next_charge_date: nextCharge,
          is_trial: isTrial
        });
      
      if (error) throw error;
      
      toast({ title: 'Subscription added! 📝' });
      setDialogOpen(false);
      setName('');
      setAmount('');
      setNextCharge('');
      fetchSubscriptions();
    } catch (error) {
      toast({ title: 'Failed to add subscription', variant: 'destructive' });
    }
  };

  const deleteSubscription = async (id: string) => {
    try {
      const { error } = await supabase
        .from('subscriptions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setSubscriptions(prev => prev.filter(s => s.id !== id));
      toast({ title: 'Subscription removed' });
    } catch (error) {
      toast({ title: 'Failed to delete', variant: 'destructive' });
    }
  };

  const getDaysUntilCharge = (date: string) => {
    const chargeDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    chargeDate.setHours(0, 0, 0, 0);
    const diff = Math.ceil((chargeDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const getDaysSinceUsed = (date: string | null) => {
    if (!date) return null;
    const usedDate = new Date(date);
    const today = new Date();
    return Math.floor((today.getTime() - usedDate.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getMonthlyTotal = () => {
    return subscriptions.reduce((sum, s) => {
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

  const unusedSavings = getUnusedSubscriptions().reduce((sum, s) => sum + s.amount, 0);

  return (
    <div className="p-4 space-y-6 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Subscriptions</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1" /> Add
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Subscription</DialogTitle>
            </DialogHeader>
            <form onSubmit={addSubscription} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="Netflix, Spotify..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
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
                <Label htmlFor="frequency">Frequency</Label>
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
              <div className="space-y-2">
                <Label htmlFor="next-charge">Next Charge Date</Label>
                <Input
                  id="next-charge"
                  type="date"
                  value={nextCharge}
                  onChange={(e) => setNextCharge(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full">Add Subscription</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Card */}
      <Card className="bg-gradient-to-br from-finbuddy-forest to-finbuddy-sage text-finbuddy-light">
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <p className="text-sm opacity-80">Total Monthly Cost</p>
            <p className="text-4xl font-bold">${getMonthlyTotal().toFixed(2)}</p>
            <p className="text-sm opacity-80">That's ${getYearlyTotal().toFixed(0)}/year</p>
          </div>
          {unusedSavings > 0 && (
            <div className="mt-4 p-3 bg-warning/20 rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              <p className="text-sm">
                Potential savings: <span className="font-bold">${unusedSavings.toFixed(0)}/mo</span> from unused subscriptions
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subscriptions List */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : subscriptions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No subscriptions yet.</p>
            <p className="text-sm text-muted-foreground mt-1">Add your first one to start tracking!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {subscriptions.map((sub) => {
            const daysUntil = getDaysUntilCharge(sub.next_charge_date);
            const daysSinceUsed = getDaysSinceUsed(sub.last_used_date);
            const isZombie = daysSinceUsed !== null && daysSinceUsed > 30;
            const isUpcoming = daysUntil <= 3 && daysUntil >= 0;

            return (
              <Card 
                key={sub.id}
                className={cn(
                  'relative overflow-hidden',
                  isZombie && 'border-warning/50 bg-warning/5'
                )}
              >
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{sub.name}</h3>
                        {isZombie && (
                          <span className="text-xs bg-warning/20 text-warning px-2 py-0.5 rounded-full">
                            Unused
                          </span>
                        )}
                        {isUpcoming && (
                          <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                            Soon
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
                        </span>
                        {daysSinceUsed !== null && (
                          <span>
                            Last used: {daysSinceUsed === 0 ? 'Today' : `${daysSinceUsed}d ago`}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="font-bold">${sub.amount.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">/{sub.frequency.slice(0, 2)}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => deleteSubscription(sub.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
