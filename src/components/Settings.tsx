import { useProfile } from '@/hooks/useProfile';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { personalities, PersonalityType } from '@/lib/personalities';
import { useToast } from '@/hooks/use-toast';
import { Check, Bell, BellOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';

export function Settings() {
  const { profile, updateProfile } = useProfile();
  const { toast } = useToast();
  const { 
    isSupported, 
    isSubscribed, 
    permission, 
    loading: pushLoading, 
    subscribe, 
    unsubscribe 
  } = usePushNotifications();

  const handlePersonalityChange = async (personality: PersonalityType) => {
    const { error } = await updateProfile({ personality });
    
    if (error) {
      toast({ title: 'Failed to update', variant: 'destructive' });
    } else {
      const p = personalities.find(p => p.id === personality);
      toast({ title: `Switched to ${p?.name}! ${p?.emoji}` });
    }
  };

  const handleNotificationToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  return (
    <div className="p-4 space-y-6 overflow-y-auto h-full">
      <h2 className="text-xl font-bold">Settings</h2>

      {/* Profile Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Name</span>
            <span className="font-medium">{profile?.name || 'Not set'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Monthly Income</span>
            <span className="font-medium">${profile?.monthly_income?.toFixed(0) || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Budget Split</span>
            <span className="font-medium">
              {profile?.needs_percentage}/{profile?.wants_percentage}/{profile?.savings_percentage}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Push Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isSupported ? (
            <>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium">Push Notifications</p>
                  <p className="text-sm text-muted-foreground">
                    Get alerts for upcoming charges and budget warnings
                  </p>
                </div>
                {pushLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                ) : (
                  <Switch
                    checked={isSubscribed}
                    onCheckedChange={handleNotificationToggle}
                    disabled={permission === 'denied'}
                  />
                )}
              </div>
              {permission === 'denied' && (
                <p className="text-sm text-destructive">
                  Notifications are blocked. Please enable them in your browser settings.
                </p>
              )}
              {isSubscribed && (
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary" />
                    <span>Subscription charge reminders (3 days before)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary" />
                    <span>Budget warnings (90%+ spent)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary" />
                    <span>Budget exceeded alerts</span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <BellOff className="w-4 h-4" />
              <span>Push notifications are not supported in this browser</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Personality Picker */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Buddy Personality</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {personalities.map((p) => (
            <button
              key={p.id}
              onClick={() => handlePersonalityChange(p.id)}
              className={cn(
                'w-full p-4 rounded-xl border-2 text-left transition-all',
                profile?.personality === p.id 
                  ? 'border-primary bg-primary/5' 
                  : 'border-muted hover:border-muted-foreground/30'
              )}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{p.emoji}</span>
                <div className="flex-1">
                  <span className="font-semibold">{p.name}</span>
                  <p className="text-sm text-muted-foreground">{p.description}</p>
                </div>
                {profile?.personality === p.id && (
                  <Check className="w-5 h-5 text-primary" />
                )}
              </div>
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Privacy */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Privacy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="text-budget-safe">✓</span>
            <span>Data encrypted and stored securely</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="text-budget-safe">✓</span>
            <span>No bank account connections</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="text-budget-safe">✓</span>
            <span>Never sold to third parties</span>
          </div>
        </CardContent>
      </Card>

      <p className="text-center text-sm text-muted-foreground">
        FinBuddy v1.0 • Made with 💚 for LovHack
      </p>
    </div>
  );
}
