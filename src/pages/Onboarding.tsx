import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent } from '@/components/ui/card';
import { personalities, PersonalityType } from '@/lib/personalities';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowRight, Check, MessageCircle, PiggyBank, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

type Step = 'welcome' | 'name' | 'income' | 'budget' | 'personality';

const stepVariants = {
  initial: { opacity: 0, x: 20, scale: 0.98 },
  animate: { opacity: 1, x: 0, scale: 1 },
  exit: { opacity: 0, x: -20, scale: 0.98 }
};

const itemVariants = {
  initial: { opacity: 0, y: 15 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.4 }
  })
};

export default function Onboarding() {
  const [step, setStep] = useState<Step>('welcome');
  const [name, setName] = useState('');
  const [income, setIncome] = useState('');
  const [budgetSplit, setBudgetSplit] = useState({ needs: 50, wants: 30, savings: 20 });
  const [selectedPersonality, setSelectedPersonality] = useState<PersonalityType>('chill');
  const [isLoading, setIsLoading] = useState(false);
  
  const { updateProfile } = useProfile();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleNext = () => {
    if (step === 'name' && !name.trim()) {
      toast({ title: 'Please enter your name', variant: 'destructive' });
      return;
    }
    if (step === 'income' && (!income || parseFloat(income) <= 0)) {
      toast({ title: 'Please enter a valid income', variant: 'destructive' });
      return;
    }
    
    const steps: Step[] = ['welcome', 'name', 'income', 'budget', 'personality'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    
    const { error } = await updateProfile({
      name: name.trim(),
      monthly_income: parseFloat(income),
      needs_percentage: budgetSplit.needs,
      wants_percentage: budgetSplit.wants,
      savings_percentage: budgetSplit.savings,
      personality: selectedPersonality,
      onboarding_completed: true
    });
    
    setIsLoading(false);
    
    if (error) {
      toast({ title: 'Failed to save settings', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: `Welcome, ${name}! 🎉`, description: "You're all set up!" });
      navigate('/');
    }
  };

  const incomeNum = parseFloat(income) || 0;
  const budgetAmounts = {
    needs: (incomeNum * budgetSplit.needs) / 100,
    wants: (incomeNum * budgetSplit.wants) / 100,
    savings: (incomeNum * budgetSplit.savings) / 100
  };

  const steps: Step[] = ['welcome', 'name', 'income', 'budget', 'personality'];
  const currentStepIndex = steps.indexOf(step);

  // Floating particles
  const particles = Array.from({ length: 4 }, (_, i) => ({
    id: i,
    size: Math.random() * 60 + 30,
    x: Math.random() * 100,
    y: Math.random() * 100,
    duration: Math.random() * 12 + 18,
    delay: Math.random() * 5,
  }));

  const features = [
    { icon: MessageCircle, text: 'Chat to log expenses' },
    { icon: PiggyBank, text: 'Smart budget tracking' },
    { icon: TrendingUp, text: 'Visual insights' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-finbuddy-dark via-finbuddy-deep to-finbuddy-forest p-3 flex items-center justify-center overflow-hidden relative">
      {/* Animated floating particles */}
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full bg-finbuddy-mint/10 blur-2xl"
          style={{
            width: particle.size,
            height: particle.size,
            left: `${particle.x}%`,
            top: `${particle.y}%`,
          }}
          animate={{
            y: [0, -40, 0, 40, 0],
            x: [0, 25, 0, -25, 0],
            scale: [1, 1.15, 1, 0.85, 1],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay,
            ease: "easeInOut",
          }}
        />
      ))}

      <div className="w-full max-w-sm relative z-10">
        {/* Animated Progress Dots */}
        <motion.div 
          className="flex justify-center gap-1.5 mb-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {steps.map((s, i) => (
            <motion.div
              key={s}
              className={cn(
                'w-2 h-2 rounded-full transition-colors duration-300',
                step === s ? 'bg-finbuddy-mint' : 
                currentStepIndex > i ? 'bg-finbuddy-sage' : 'bg-finbuddy-forest'
              )}
              animate={{
                scale: step === s ? 1.3 : 1,
              }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            />
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <Card className="border-0 shadow-2xl bg-card/95 backdrop-blur overflow-hidden">
            <CardContent className="p-5">
              <AnimatePresence mode="wait">
                {/* Step 0: Welcome */}
                {step === 'welcome' && (
                  <motion.div
                    key="welcome"
                    variants={stepVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="space-y-5"
                  >
                    <motion.div 
                      className="text-center"
                      variants={itemVariants}
                      initial="initial"
                      animate="animate"
                      custom={0}
                    >
                      <motion.img 
                        src="/logo.png" 
                        alt="FinBuddy" 
                        className="w-16 h-16 rounded-2xl mx-auto mb-3 shadow-lg"
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                      />
                      <h2 className="text-xl font-bold mb-1">Welcome to FinBuddy</h2>
                      <p className="text-sm text-muted-foreground">Track expenses naturally, like texting a friend</p>
                    </motion.div>
                    
                    {/* Feature highlights instead of video */}
                    <motion.div 
                      className="space-y-2"
                      variants={itemVariants}
                      initial="initial"
                      animate="animate"
                      custom={1}
                    >
                      {features.map((feature, index) => (
                        <motion.div
                          key={feature.text}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 + index * 0.1 }}
                          className="flex items-center gap-3 p-3 bg-primary/5 rounded-xl border border-primary/10"
                        >
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <feature.icon className="w-4 h-4 text-primary" />
                          </div>
                          <span className="text-sm font-medium">{feature.text}</span>
                        </motion.div>
                      ))}
                    </motion.div>

                    <motion.div
                      variants={itemVariants}
                      initial="initial"
                      animate="animate"
                      custom={2}
                    >
                      <Button 
                        onClick={handleNext} 
                        className="w-full h-11 text-base transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                      >
                        Get Started <ArrowRight className="ml-2 w-4 h-4" />
                      </Button>
                    </motion.div>
                  </motion.div>
                )}

                {/* Step 1: Name */}
                {step === 'name' && (
                  <motion.div
                    key="name"
                    variants={stepVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="space-y-5"
                  >
                    <motion.div 
                      className="text-center"
                      variants={itemVariants}
                      initial="initial"
                      animate="animate"
                      custom={0}
                    >
                      <motion.div 
                        className="text-3xl mb-3"
                        animate={{ rotate: [0, 14, -8, 14, -4, 10, 0] }}
                        transition={{ duration: 1.5, delay: 0.2 }}
                      >
                        👋
                      </motion.div>
                      <h2 className="text-xl font-bold mb-1">Hey! I'm FinBuddy</h2>
                      <p className="text-sm text-muted-foreground">Your personal finance companion. What should I call you?</p>
                    </motion.div>
                    <motion.div
                      variants={itemVariants}
                      initial="initial"
                      animate="animate"
                      custom={1}
                    >
                      <Input
                        placeholder="Your name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="h-12 text-base text-center transition-all duration-200 focus:scale-[1.02]"
                        autoFocus
                      />
                    </motion.div>
                    <motion.div
                      variants={itemVariants}
                      initial="initial"
                      animate="animate"
                      custom={2}
                    >
                      <Button 
                        onClick={handleNext} 
                        className="w-full h-11 text-base transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                      >
                        Continue <ArrowRight className="ml-2 w-4 h-4" />
                      </Button>
                    </motion.div>
                  </motion.div>
                )}

                {/* Step 2: Income */}
                {step === 'income' && (
                  <motion.div
                    key="income"
                    variants={stepVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="space-y-5"
                  >
                    <motion.div 
                      className="text-center"
                      variants={itemVariants}
                      initial="initial"
                      animate="animate"
                      custom={0}
                    >
                      <motion.div 
                        className="text-3xl mb-3"
                        animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
                        transition={{ duration: 1, delay: 0.2 }}
                      >
                        💰
                      </motion.div>
                      <h2 className="text-xl font-bold mb-1">Nice to meet you, {name}!</h2>
                      <p className="text-sm text-muted-foreground">What's your monthly income? This stays completely private.</p>
                    </motion.div>
                    <motion.div 
                      className="relative"
                      variants={itemVariants}
                      initial="initial"
                      animate="animate"
                      custom={1}
                    >
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl text-muted-foreground">$</span>
                      <Input
                        type="number"
                        placeholder="3,500"
                        value={income}
                        onChange={(e) => setIncome(e.target.value)}
                        className="h-12 text-xl text-center pl-10 transition-all duration-200 focus:scale-[1.02]"
                        autoFocus
                      />
                    </motion.div>
                    <motion.div
                      variants={itemVariants}
                      initial="initial"
                      animate="animate"
                      custom={2}
                    >
                      <Button 
                        onClick={handleNext} 
                        className="w-full h-11 text-base transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                      >
                        Continue <ArrowRight className="ml-2 w-4 h-4" />
                      </Button>
                    </motion.div>
                  </motion.div>
                )}

                {/* Step 3: Budget Split */}
                {step === 'budget' && (
                  <motion.div
                    key="budget"
                    variants={stepVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="space-y-4"
                  >
                    <motion.div 
                      className="text-center"
                      variants={itemVariants}
                      initial="initial"
                      animate="animate"
                      custom={0}
                    >
                      <motion.div 
                        className="text-3xl mb-2"
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
                      >
                        📊
                      </motion.div>
                      <h2 className="text-xl font-bold mb-1">Split your money</h2>
                      <p className="text-xs text-muted-foreground">The 50/30/20 rule is a great start!</p>
                    </motion.div>
                    
                    <div className="space-y-4">
                      {/* Needs */}
                      <motion.div 
                        className="space-y-2"
                        variants={itemVariants}
                        initial="initial"
                        animate="animate"
                        custom={1}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-semibold text-sm text-needs">Needs</span>
                            <span className="text-xs text-muted-foreground ml-1">(rent, bills)</span>
                          </div>
                          <span className="font-bold text-sm">{budgetSplit.needs}%</span>
                        </div>
                        <Slider
                          value={[budgetSplit.needs]}
                          onValueChange={([v]) => {
                            const remaining = 100 - v;
                            const wantsRatio = budgetSplit.wants / (budgetSplit.wants + budgetSplit.savings) || 0.6;
                            setBudgetSplit({
                              needs: v,
                              wants: Math.round(remaining * wantsRatio),
                              savings: Math.round(remaining * (1 - wantsRatio))
                            });
                          }}
                          max={80}
                          min={20}
                          step={5}
                          className="[&_[role=slider]]:bg-needs"
                        />
                        <p className="text-xs text-center text-muted-foreground">${budgetAmounts.needs.toFixed(0)}/mo</p>
                      </motion.div>

                      {/* Wants */}
                      <motion.div 
                        className="space-y-2"
                        variants={itemVariants}
                        initial="initial"
                        animate="animate"
                        custom={2}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-semibold text-sm text-wants">Wants</span>
                            <span className="text-xs text-muted-foreground ml-1">(fun, hobbies)</span>
                          </div>
                          <span className="font-bold text-sm">{budgetSplit.wants}%</span>
                        </div>
                        <Slider
                          value={[budgetSplit.wants]}
                          onValueChange={([v]) => {
                            const remaining = 100 - budgetSplit.needs - v;
                            if (remaining >= 5) {
                              setBudgetSplit(prev => ({ ...prev, wants: v, savings: remaining }));
                            }
                          }}
                          max={50}
                          min={10}
                          step={5}
                          className="[&_[role=slider]]:bg-wants"
                        />
                        <p className="text-xs text-center text-muted-foreground">${budgetAmounts.wants.toFixed(0)}/mo</p>
                      </motion.div>

                      {/* Savings */}
                      <motion.div 
                        className="space-y-2"
                        variants={itemVariants}
                        initial="initial"
                        animate="animate"
                        custom={3}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-semibold text-sm text-savings">Savings</span>
                            <span className="text-xs text-muted-foreground ml-1">(future you!)</span>
                          </div>
                          <span className="font-bold text-sm">{budgetSplit.savings}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <motion.div 
                            className="h-full bg-savings"
                            initial={{ width: 0 }}
                            animate={{ width: `${(budgetSplit.savings / 40) * 100}%` }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                        <p className="text-xs text-center text-muted-foreground">${budgetAmounts.savings.toFixed(0)}/mo</p>
                      </motion.div>
                    </div>

                    <motion.div
                      variants={itemVariants}
                      initial="initial"
                      animate="animate"
                      custom={4}
                    >
                      <Button 
                        onClick={handleNext} 
                        className="w-full h-11 text-base transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                      >
                        Continue <ArrowRight className="ml-2 w-4 h-4" />
                      </Button>
                    </motion.div>
                  </motion.div>
                )}

                {/* Step 4: Personality */}
                {step === 'personality' && (
                  <motion.div
                    key="personality"
                    variants={stepVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="space-y-4"
                  >
                    <motion.div 
                      className="text-center"
                      variants={itemVariants}
                      initial="initial"
                      animate="animate"
                      custom={0}
                    >
                      <motion.div 
                        className="text-3xl mb-2"
                        animate={{ rotateY: [0, 180, 360] }}
                        transition={{ duration: 1.5, delay: 0.2 }}
                      >
                        🎭
                      </motion.div>
                      <h2 className="text-xl font-bold mb-1">Choose your buddy's vibe</h2>
                      <p className="text-xs text-muted-foreground">Pick how FinBuddy talks to you</p>
                    </motion.div>
                    
                    <div className="grid gap-2">
                      {personalities.map((p, index) => (
                        <motion.button
                          key={p.id}
                          onClick={() => setSelectedPersonality(p.id)}
                          className={cn(
                            'p-3 rounded-xl border-2 text-left transition-colors',
                            selectedPersonality === p.id 
                              ? 'border-primary bg-primary/5' 
                              : 'border-muted hover:border-muted-foreground/30'
                          )}
                          variants={itemVariants}
                          initial="initial"
                          animate="animate"
                          custom={index + 1}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xl">{p.emoji}</span>
                            <span className="font-semibold text-sm">{p.name}</span>
                            <AnimatePresence>
                              {selectedPersonality === p.id && (
                                <motion.div
                                  initial={{ scale: 0, rotate: -180 }}
                                  animate={{ scale: 1, rotate: 0 }}
                                  exit={{ scale: 0, rotate: 180 }}
                                  className="ml-auto"
                                >
                                  <Check className="w-4 h-4 text-primary" />
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                          <p className="text-xs text-muted-foreground italic line-clamp-1">"{p.examples[0]}"</p>
                        </motion.button>
                      ))}
                    </div>

                    <motion.div
                      variants={itemVariants}
                      initial="initial"
                      animate="animate"
                      custom={personalities.length + 1}
                    >
                      <Button 
                        onClick={handleComplete} 
                        className="w-full h-11 text-base transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>Let's Go! 🚀</>
                        )}
                      </Button>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
