import { useProfile } from '@/hooks/useProfile';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { personalities, PersonalityType } from '@/lib/personalities';
import { useToast } from '@/hooks/use-toast';
import { Check, Bell, BellOff, Loader2, Moon, Sun, LogOut, Shield, User, Palette, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { useTheme } from 'next-themes';
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export function Settings() {
  const { profile, updateProfile } = useProfile();
  const { signOut } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
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

  const handleLogout = async () => {
    await signOut();
    toast({ title: 'Signed out successfully' });
  };

  return (
    <motion.div 
      className="p-4 space-y-5 overflow-y-auto h-full pb-24"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
          <p className="text-sm text-muted-foreground">Customize your experience</p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-primary" />
        </div>
      </motion.div>

      {/* Profile Info */}
      <motion.div variants={itemVariants}>
        <Card className="overflow-hidden shadow-premium border-0 bg-gradient-to-br from-card to-card/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10">
                <User className="w-4 h-4 text-primary" />
              </div>
              Your Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-muted-foreground">Name</span>
              <span className="font-semibold">{profile?.name || 'Not set'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-muted-foreground">Monthly Income</span>
              <span className="font-semibold text-primary">${profile?.monthly_income?.toFixed(0) || 0}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-muted-foreground">Budget Split</span>
              <div className="flex gap-1">
                <span className="px-2 py-0.5 rounded-md bg-needs/10 text-needs text-sm font-medium">{profile?.needs_percentage}%</span>
                <span className="px-2 py-0.5 rounded-md bg-wants/10 text-wants text-sm font-medium">{profile?.wants_percentage}%</span>
                <span className="px-2 py-0.5 rounded-md bg-savings/10 text-savings text-sm font-medium">{profile?.savings_percentage}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Appearance */}
      <motion.div variants={itemVariants}>
        <Card className="overflow-hidden shadow-premium border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10">
                <Palette className="w-4 h-4 text-primary" />
              </div>
              Appearance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <motion.div 
                  className="p-2.5 rounded-xl bg-muted"
                  animate={{ rotate: theme === 'dark' ? 180 : 0 }}
                  transition={{ type: "spring", stiffness: 200 }}
                >
                  {theme === 'dark' ? (
                    <Moon className="w-5 h-5 text-primary" />
                  ) : (
                    <Sun className="w-5 h-5 text-amber-500" />
                  )}
                </motion.div>
                <div>
                  <p className="font-medium">Dark Mode</p>
                  <p className="text-sm text-muted-foreground">
                    {theme === 'dark' ? 'Currently using dark theme' : 'Currently using light theme'}
                  </p>
                </div>
              </div>
              <Switch
                checked={theme === 'dark'}
                onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Push Notifications */}
      <motion.div variants={itemVariants}>
        <Card className="overflow-hidden shadow-premium border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10">
                <Bell className="w-4 h-4 text-primary" />
              </div>
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
                      Get alerts for charges and budget warnings
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
                  <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20">
                    <p className="text-sm text-destructive">
                      Notifications are blocked. Enable them in browser settings.
                    </p>
                  </div>
                )}
                {isSubscribed && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-2 pt-2 border-t border-border/50"
                  >
                    {[
                      'Subscription charge reminders (3 days before)',
                      'Budget warnings (90%+ spent)',
                      'Budget exceeded alerts'
                    ].map((text, i) => (
                      <motion.div 
                        key={text}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-center gap-2 text-sm text-muted-foreground"
                      >
                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                          <Check className="w-3 h-3 text-primary" />
                        </div>
                        <span>{text}</span>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </>
            ) : (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                <BellOff className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Push notifications not supported in this browser</span>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Personality Picker */}
      <motion.div variants={itemVariants}>
        <Card className="overflow-hidden shadow-premium border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              Buddy Personality
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {personalities.map((p, index) => (
              <motion.button
                key={p.id}
                onClick={() => handlePersonalityChange(p.id)}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  'w-full p-4 rounded-xl border-2 text-left transition-all duration-200',
                  profile?.personality === p.id 
                    ? 'border-primary bg-primary/5 shadow-md' 
                    : 'border-border/50 hover:border-primary/30 hover:bg-muted/30'
                )}
              >
                <div className="flex items-center gap-3">
                  <motion.span 
                    className="text-2xl"
                    animate={profile?.personality === p.id ? { scale: [1, 1.2, 1] } : {}}
                    transition={{ duration: 0.3 }}
                  >
                    {p.emoji}
                  </motion.span>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold">{p.name}</span>
                    <p className="text-sm text-muted-foreground truncate">{p.description}</p>
                  </div>
                  {profile?.personality === p.id && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-6 h-6 rounded-full bg-primary flex items-center justify-center"
                    >
                      <Check className="w-4 h-4 text-primary-foreground" />
                    </motion.div>
                  )}
                </div>
              </motion.button>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      {/* Privacy */}
      <motion.div variants={itemVariants}>
        <Card className="overflow-hidden shadow-premium border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="p-2 rounded-xl bg-budget-safe/10">
                <Shield className="w-4 h-4 text-budget-safe" />
              </div>
              Privacy & Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { icon: '🔒', text: 'Data encrypted and stored securely' },
              { icon: '🏦', text: 'No bank account connections required' },
              { icon: '🚫', text: 'Never sold to third parties' }
            ].map((item, i) => (
              <motion.div 
                key={item.text}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-3 p-2.5 rounded-xl bg-budget-safe/5"
              >
                <span className="text-lg">{item.icon}</span>
                <span className="text-sm font-medium">{item.text}</span>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      {/* Logout Button */}
      <motion.div variants={itemVariants}>
        <Button 
          variant="outline" 
          onClick={handleLogout}
          className="w-full h-12 rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive transition-all"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </motion.div>

      {/* Footer */}
      <motion.div variants={itemVariants} className="text-center space-y-2 pt-4">
        <div className="flex items-center justify-center gap-2">
          <img src="/logo.png" alt="FinBuddy" className="w-6 h-6 rounded-lg" />
          <span className="font-semibold">FinBuddy</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Version 1.0 • Made with 💚 for LovHack
        </p>
      </motion.div>
    </motion.div>
  );
}
