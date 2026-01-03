import { useState, useRef } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { personalities, PersonalityType } from '@/lib/personalities';
import { useToast } from '@/hooks/use-toast';
import { Check, Bell, BellOff, Loader2, Moon, Sun, LogOut, Shield, User, Palette, Sparkles, Pencil, X, Save, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { useTheme } from 'next-themes';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0 }
};

export function Settings() {
  const { profile, updateProfile, refetch } = useProfile();
  const { signOut, user } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const { 
    isSupported, 
    isSubscribed, 
    permission, 
    loading: pushLoading, 
    subscribe, 
    unsubscribe 
  } = usePushNotifications();

  // Edit profile state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editIncome, setEditIncome] = useState('');
  const [editNeeds, setEditNeeds] = useState('');
  const [editWants, setEditWants] = useState('');
  const [editSavings, setEditSavings] = useState('');
  const [saving, setSaving] = useState(false);

  const openEditDialog = () => {
    setEditName(profile?.name || '');
    setEditIncome(profile?.monthly_income?.toString() || '');
    setEditNeeds(profile?.needs_percentage?.toString() || '50');
    setEditWants(profile?.wants_percentage?.toString() || '30');
    setEditSavings(profile?.savings_percentage?.toString() || '20');
    setEditDialogOpen(true);
  };

  const handleSaveProfile = async () => {
    const needs = parseInt(editNeeds) || 50;
    const wants = parseInt(editWants) || 30;
    const savings = parseInt(editSavings) || 20;
    
    if (needs + wants + savings !== 100) {
      toast({ title: 'Budget split must equal 100%', variant: 'destructive' });
      return;
    }

    setSaving(true);
    const { error } = await updateProfile({
      name: editName || null,
      monthly_income: parseFloat(editIncome) || 0,
      needs_percentage: needs,
      wants_percentage: wants,
      savings_percentage: savings
    });
    setSaving(false);

    if (error) {
      toast({ title: 'Failed to update profile', variant: 'destructive' });
    } else {
      toast({ title: 'Profile updated! ✓' });
      setEditDialogOpen(false);
    }
  };

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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Please select an image file', variant: 'destructive' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'Image must be less than 2MB', variant: 'destructive' });
      return;
    }

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile with avatar URL
      const { error: updateError } = await updateProfile({ avatar_url: publicUrl });
      if (updateError) throw updateError;

      await refetch();
      toast({ title: 'Avatar updated! ✓' });
    } catch (error) {
      console.error('Avatar upload error:', error);
      toast({ title: 'Failed to upload avatar', variant: 'destructive' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <motion.div 
      className="px-3 py-2 space-y-3 overflow-y-auto h-full pb-20"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Settings</h2>
          <p className="text-xs text-muted-foreground">Customize your experience</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
      </motion.div>

      {/* Profile Info */}
      <motion.div variants={itemVariants}>
        <Card className="overflow-hidden shadow-sm border-0 bg-gradient-to-br from-card to-card/80">
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <User className="w-3.5 h-3.5 text-primary" />
                </div>
                Your Profile
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={openEditDialog}
              >
                <Pencil className="w-3 h-3 mr-1" />
                Edit
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-3 pb-3">
            {/* Avatar */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center overflow-hidden border-2 border-primary/20">
                  {profile?.avatar_url ? (
                    <img 
                      src={profile.avatar_url} 
                      alt="Avatar" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-6 h-6 text-primary/60" />
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors"
                >
                  {uploadingAvatar ? (
                    <Loader2 className="w-3 h-3 text-primary-foreground animate-spin" />
                  ) : (
                    <Camera className="w-3 h-3 text-primary-foreground" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">{profile?.name || 'Not set'}</p>
                <p className="text-[10px] text-muted-foreground">Tap camera to change photo</p>
              </div>
            </div>
            
            <div className="flex justify-between items-center py-1.5 border-t border-border/50">
              <span className="text-xs text-muted-foreground">Monthly Income</span>
              <span className="font-semibold text-sm text-primary">${profile?.monthly_income?.toFixed(0) || 0}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-t border-border/50">
              <span className="text-xs text-muted-foreground">Budget Split</span>
              <div className="flex gap-1">
                <span className="px-1.5 py-0.5 rounded bg-needs/10 text-needs text-xs font-medium">{profile?.needs_percentage}%</span>
                <span className="px-1.5 py-0.5 rounded bg-wants/10 text-wants text-xs font-medium">{profile?.wants_percentage}%</span>
                <span className="px-1.5 py-0.5 rounded bg-savings/10 text-savings text-xs font-medium">{profile?.savings_percentage}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Edit Profile Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="mx-4">
          <DialogHeader>
            <DialogTitle className="text-base">Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name" className="text-xs">Your Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter your name"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-income" className="text-xs">Monthly Income ($)</Label>
              <Input
                id="edit-income"
                type="number"
                value={editIncome}
                onChange={(e) => setEditIncome(e.target.value)}
                placeholder="5000"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Budget Split (must equal 100%)</Label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-[10px] text-needs">Needs %</Label>
                  <Input
                    type="number"
                    value={editNeeds}
                    onChange={(e) => setEditNeeds(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-wants">Wants %</Label>
                  <Input
                    type="number"
                    value={editWants}
                    onChange={(e) => setEditWants(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-savings">Savings %</Label>
                  <Input
                    type="number"
                    value={editSavings}
                    onChange={(e) => setEditSavings(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
              </div>
              <p className={cn(
                "text-[10px] text-center",
                (parseInt(editNeeds) || 0) + (parseInt(editWants) || 0) + (parseInt(editSavings) || 0) === 100
                  ? "text-budget-safe"
                  : "text-destructive"
              )}>
                Total: {(parseInt(editNeeds) || 0) + (parseInt(editWants) || 0) + (parseInt(editSavings) || 0)}%
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button 
                variant="outline" 
                className="flex-1 h-9 text-sm"
                onClick={() => setEditDialogOpen(false)}
              >
                <X className="w-3.5 h-3.5 mr-1" />
                Cancel
              </Button>
              <Button 
                className="flex-1 h-9 text-sm"
                onClick={handleSaveProfile}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5 mr-1" />
                )}
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Appearance */}
      <motion.div variants={itemVariants}>
        <Card className="overflow-hidden shadow-sm border-0">
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <Palette className="w-3.5 h-3.5 text-primary" />
              </div>
              Appearance
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <motion.div 
                  className="p-2 rounded-lg bg-muted"
                  animate={{ rotate: theme === 'dark' ? 180 : 0 }}
                  transition={{ type: "spring", stiffness: 200 }}
                >
                  {theme === 'dark' ? (
                    <Moon className="w-4 h-4 text-primary" />
                  ) : (
                    <Sun className="w-4 h-4 text-amber-500" />
                  )}
                </motion.div>
                <div>
                  <p className="font-medium text-sm">Dark Mode</p>
                  <p className="text-[10px] text-muted-foreground">
                    {theme === 'dark' ? 'Dark theme active' : 'Light theme active'}
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
        <Card className="overflow-hidden shadow-sm border-0">
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <Bell className="w-3.5 h-3.5 text-primary" />
              </div>
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 px-3 pb-3">
            {isSupported ? (
              <>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="font-medium text-sm">Push Notifications</p>
                    <p className="text-[10px] text-muted-foreground">
                      Charges & budget alerts
                    </p>
                  </div>
                  {pushLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  ) : (
                    <Switch
                      checked={isSubscribed}
                      onCheckedChange={handleNotificationToggle}
                      disabled={permission === 'denied'}
                    />
                  )}
                </div>
                {permission === 'denied' && (
                  <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="text-[10px] text-destructive">
                      Notifications blocked in browser settings
                    </p>
                  </div>
                )}
                {isSubscribed && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-1.5 pt-2 border-t border-border/50"
                  >
                    {[
                      'Subscription reminders (3 days before)',
                      'Budget warnings (90%+ spent)',
                      'Budget exceeded alerts'
                    ].map((text, i) => (
                      <motion.div 
                        key={text}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-center gap-1.5 text-[10px] text-muted-foreground"
                      >
                        <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-primary" />
                        </div>
                        <span>{text}</span>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                <BellOff className="w-4 h-4 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">Not supported in this browser</span>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Personality Picker */}
      <motion.div variants={itemVariants}>
        <Card className="overflow-hidden shadow-sm border-0">
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
              </div>
              Buddy Personality
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 px-3 pb-3">
            {personalities.map((p, index) => (
              <motion.button
                key={p.id}
                onClick={() => handlePersonalityChange(p.id)}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className={cn(
                  'w-full p-2.5 rounded-lg border-2 text-left transition-all duration-200',
                  profile?.personality === p.id 
                    ? 'border-primary bg-primary/5 shadow-sm' 
                    : 'border-border/50 hover:border-primary/30 hover:bg-muted/30'
                )}
              >
                <div className="flex items-center gap-2">
                  <motion.span 
                    className="text-lg"
                    animate={profile?.personality === p.id ? { scale: [1, 1.2, 1] } : {}}
                    transition={{ duration: 0.3 }}
                  >
                    {p.emoji}
                  </motion.span>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-sm">{p.name}</span>
                    <p className="text-[10px] text-muted-foreground truncate">{p.description}</p>
                  </div>
                  {profile?.personality === p.id && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-5 h-5 rounded-full bg-primary flex items-center justify-center"
                    >
                      <Check className="w-3 h-3 text-primary-foreground" />
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
        <Card className="overflow-hidden shadow-sm border-0">
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-budget-safe/10">
                <Shield className="w-3.5 h-3.5 text-budget-safe" />
              </div>
              Privacy & Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 px-3 pb-3">
            {[
              { icon: '🔒', text: 'Data encrypted and secure' },
              { icon: '🏦', text: 'No bank connections required' },
              { icon: '🚫', text: 'Never sold to third parties' }
            ].map((item, i) => (
              <motion.div 
                key={item.text}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-2 p-2 rounded-lg bg-budget-safe/5"
              >
                <span className="text-sm">{item.icon}</span>
                <span className="text-xs font-medium">{item.text}</span>
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
          className="w-full h-10 rounded-lg border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive transition-all text-sm"
        >
          <LogOut className="w-3.5 h-3.5 mr-2" />
          Sign Out
        </Button>
      </motion.div>

      {/* Footer */}
      <motion.div variants={itemVariants} className="text-center space-y-1 pt-2">
        <div className="flex items-center justify-center gap-1.5">
          <img src="/logo.png" alt="FinBuddy" className="w-5 h-5 rounded-md" />
          <span className="font-semibold text-sm">FinBuddy</span>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Version 1.0 • Made with 💚 for LovHack
        </p>
      </motion.div>
    </motion.div>
  );
}