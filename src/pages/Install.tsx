import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Download, Check, Smartphone, Share, MoreVertical, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    // Listen for install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Listen for successful install
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full text-center space-y-8"
      >
        {/* App Icon */}
        <motion.img
          src="/logo.png"
          alt="FinBuddy"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
          className="mx-auto w-24 h-24 rounded-3xl shadow-premium-lg"
        />

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Install FinBuddy</h1>
          <p className="text-muted-foreground">
            Add FinBuddy to your home screen for the best experience
          </p>
        </div>

        {/* Features */}
        <div className="space-y-3 text-left">
          {[
            'Works offline',
            'Loads instantly',
            'Full-screen experience',
            'Quick access from home screen',
          ].map((feature, index) => (
            <motion.div
              key={feature}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              className="flex items-center gap-3 px-4 py-3 bg-card rounded-xl border border-border/40"
            >
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                <Check className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm font-medium">{feature}</span>
            </motion.div>
          ))}
        </div>

        {/* Install Button / Instructions */}
        {isInstalled ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-center gap-2 text-primary">
              <Check className="w-5 h-5" />
              <span className="font-medium">Already installed!</span>
            </div>
            <Button 
              onClick={() => navigate('/')}
              className="w-full rounded-xl h-12 shadow-premium"
            >
              Open App
            </Button>
          </motion.div>
        ) : isIOS ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <div className="bg-card border border-border/40 rounded-2xl p-5 space-y-4">
              <p className="text-sm font-medium text-muted-foreground">
                To install on iOS:
              </p>
              <div className="space-y-3 text-left">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold">1</div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Tap the</span>
                    <Share className="w-5 h-5" />
                    <span className="text-sm">Share button</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold">2</div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Scroll and tap</span>
                    <Plus className="w-4 h-4" />
                    <span className="text-sm font-medium">"Add to Home Screen"</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold">3</div>
                  <span className="text-sm">Tap "Add" to confirm</span>
                </div>
              </div>
            </div>
            <Button 
              variant="outline"
              onClick={() => navigate('/')}
              className="w-full rounded-xl h-12"
            >
              Continue to App
            </Button>
          </motion.div>
        ) : deferredPrompt ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            <Button 
              onClick={handleInstall}
              className="w-full rounded-xl h-12 shadow-premium gap-2"
            >
              <Download className="w-5 h-5" />
              Install App
            </Button>
            <Button 
              variant="ghost"
              onClick={() => navigate('/')}
              className="w-full rounded-xl"
            >
              Maybe later
            </Button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <div className="bg-card border border-border/40 rounded-2xl p-5 space-y-4">
              <p className="text-sm font-medium text-muted-foreground">
                To install on Android:
              </p>
              <div className="space-y-3 text-left">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold">1</div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Tap the</span>
                    <MoreVertical className="w-5 h-5" />
                    <span className="text-sm">menu button</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold">2</div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Tap</span>
                    <Smartphone className="w-4 h-4" />
                    <span className="text-sm font-medium">"Install app"</span>
                  </div>
                </div>
              </div>
            </div>
            <Button 
              variant="outline"
              onClick={() => navigate('/')}
              className="w-full rounded-xl h-12"
            >
              Continue to App
            </Button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
