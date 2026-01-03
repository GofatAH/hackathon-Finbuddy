import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent } from '@/components/ui/card';
import { personalities, PersonalityType } from '@/lib/personalities';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import demoVideo from '@/assets/demo-video.mp4';

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
  const particles = Array.from({ length: 5 }, (_, i) => ({
    id: i,
    size: Math.random() * 80 + 40,
    x: Math.random() * 100,
    y: Math.random() * 100,
    duration: Math.random() * 12 + 18,
    delay: Math.random() * 5,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-finbuddy-dark via-finbuddy-deep to-finbuddy-forest p-4 flex items-center justify-center overflow-hidden relative">
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

      <div className="w-full max-w-lg relative z-10">
        {/* Animated Progress Dots */}
        <motion.div 
          className="flex justify-center gap-2 mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {steps.map((s, i) => (
            <motion.div
              key={s}
              className={cn(
                'w-3 h-3 rounded-full transition-colors duration-300',
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
            <CardContent className="p-8">
              <AnimatePresence mode="wait">
                {/* Step 0: Welcome with Demo Video */}
                {step === 'welcome' && (
                  <motion.div
                    key="welcome"
                    variants={stepVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="space-y-6"
                  >
                    <motion.div 
                      className="text-center"
                      variants={itemVariants}
                      initial="initial"
                      animate="animate"
                      custom={0}
                    >
                      <h2 className="text-2xl font-bold mb-2">Welcome to FinBuddy</h2>
                      <p className="text-muted-foreground">Track expenses naturally, like texting a friend</p>
                    </motion.div>
                    
                    <motion.div 
                      className="relative rounded-2xl overflow-hidden bg-black/20 aspect-[9/16] max-h-[320px] mx-auto"
                      variants={itemVariants}
                      initial="initial"
                      animate="animate"
                      custom={1}
                    >
                      <video
                        src={demoVideo}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                      />
                      <motion.div 
                        className="absolute bottom-3 left-3 right-3 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                      >
                        <p className="text-xs text-white/90 text-center">
                          Just type your expenses like a chat message!
                        </p>
                      </motion.div>
                    </motion.div>

                    <motion.div
                      variants={itemVariants}
                      initial="initial"
                      animate="animate"
                      custom={2}
                    >
                      <Button 
                        onClick={handleNext} 
                        className="w-full h-12 text-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                      >
                        Get Started <ArrowRight className="ml-2 w-5 h-5" />
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
                    className="space-y-6"
                  >
                    <motion.div 
                      className="text-center"
                      variants={itemVariants}
                      initial="initial"
                      animate="animate"
                      custom={0}
                    >
                      <motion.div 
                        className="text-4xl mb-4"
                        animate={{ rotate: [0, 14, -8, 14, -4, 10, 0] }}
                        transition={{ duration: 1.5, delay: 0.2 }}
                      >
                        👋
                      </motion.div>
                      <h2 className="text-2xl font-bold mb-2">Hey! I'm FinBuddy</h2>
                      <p className="text-muted-foreground">Your personal finance companion. What should I call you?</p>
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
                        className="h-14 text-lg text-center transition-all duration-200 focus:scale-[1.02]"
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
                        className="w-full h-12 text-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                      >
                        Continue <ArrowRight className="ml-2 w-5 h-5" />
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
                    className="space-y-6"
                  >
                    <motion.div 
                      className="text-center"
                      variants={itemVariants}
                      initial="initial"
                      animate="animate"
                      custom={0}
                    >
                      <motion.div 
                        className="text-4xl mb-4"
                        animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
                        transition={{ duration: 1, delay: 0.2 }}
                      >
                        💰
                      </motion.div>
                      <h2 className="text-2xl font-bold mb-2">Nice to meet you, {name}!</h2>
                      <p className="text-muted-foreground">What's your monthly income? This stays completely private.</p>
                    </motion.div>
                    <motion.div 
                      className="relative"
                      variants={itemVariants}
                      initial="initial"
                      animate="animate"
                      custom={1}
                    >
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-muted-foreground">$</span>
                      <Input
                        type="number"
                        placeholder="3,500"
                        value={income}
                        onChange={(e) => setIncome(e.target.value)}
                        className="h-14 text-2xl text-center pl-10 transition-all duration-200 focus:scale-[1.02]"
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
                        className="w-full h-12 text-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                      >
                        Continue <ArrowRight className="ml-2 w-5 h-5" />
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
                    className="space-y-6"
                  >
                    <motion.div 
                      className="text-center"
                      variants={itemVariants}
                      initial="initial"
                      animate="animate"
                      custom={0}
                    >
                      <motion.div 
                        className="text-4xl mb-4"
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
                      >
                        📊
                      </motion.div>
                      <h2 className="text-2xl font-bold mb-2">Let's split up your money</h2>
                      <p className="text-muted-foreground">The 50/30/20 rule is a great start. Adjust if you'd like!</p>
                    </motion.div>
                    
                    <div className="space-y-6">
                      {/* Needs */}
                      <motion.div 
                        className="space-y-3"
                        variants={itemVariants}
                        initial="initial"
                        animate="animate"
                        custom={1}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-semibold text-needs">Needs</span>
                            <span className="text-sm text-muted-foreground ml-2">(rent, groceries, bills)</span>
                          </div>
                          <motion.span 
                            className="font-bold"
                            key={budgetSplit.needs}
                            initial={{ scale: 1.2 }}
                            animate={{ scale: 1 }}
                          >
                            {budgetSplit.needs}%
                          </motion.span>
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
                        <p className="text-sm text-center text-muted-foreground">${budgetAmounts.needs.toFixed(0)}/month</p>
                      </motion.div>

                      {/* Wants */}
                      <motion.div 
                        className="space-y-3"
                        variants={itemVariants}
                        initial="initial"
                        animate="animate"
                        custom={2}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-semibold text-wants">Wants</span>
                            <span className="text-sm text-muted-foreground ml-2">(fun, dining, hobbies)</span>
                          </div>
                          <motion.span 
                            className="font-bold"
                            key={budgetSplit.wants}
                            initial={{ scale: 1.2 }}
                            animate={{ scale: 1 }}
                          >
                            {budgetSplit.wants}%
                          </motion.span>
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
                        <p className="text-sm text-center text-muted-foreground">${budgetAmounts.wants.toFixed(0)}/month</p>
                      </motion.div>

                      {/* Savings */}
                      <motion.div 
                        className="space-y-3"
                        variants={itemVariants}
                        initial="initial"
                        animate="animate"
                        custom={3}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-semibold text-savings">Savings</span>
                            <span className="text-sm text-muted-foreground ml-2">(future you!)</span>
                          </div>
                          <motion.span 
                            className="font-bold"
                            key={budgetSplit.savings}
                            initial={{ scale: 1.2 }}
                            animate={{ scale: 1 }}
                          >
                            {budgetSplit.savings}%
                          </motion.span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <motion.div 
                            className="h-full bg-savings"
                            initial={{ width: 0 }}
                            animate={{ width: `${(budgetSplit.savings / 40) * 100}%` }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                        <p className="text-sm text-center text-muted-foreground">${budgetAmounts.savings.toFixed(0)}/month</p>
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
                        className="w-full h-12 text-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                      >
                        Continue <ArrowRight className="ml-2 w-5 h-5" />
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
                    className="space-y-6"
                  >
                    <motion.div 
                      className="text-center"
                      variants={itemVariants}
                      initial="initial"
                      animate="animate"
                      custom={0}
                    >
                      <motion.div 
                        className="text-4xl mb-4"
                        animate={{ rotateY: [0, 180, 360] }}
                        transition={{ duration: 1.5, delay: 0.2 }}
                      >
                        🎭
                      </motion.div>
                      <h2 className="text-2xl font-bold mb-2">Choose your buddy's vibe</h2>
                      <p className="text-muted-foreground">Pick how FinBuddy talks to you. You can change anytime!</p>
                    </motion.div>
                    
                    <div className="grid gap-3">
                      {personalities.map((p, index) => (
                        <motion.button
                          key={p.id}
                          onClick={() => setSelectedPersonality(p.id)}
                          className={cn(
                            'p-4 rounded-xl border-2 text-left transition-colors',
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
                          <div className="flex items-center gap-3 mb-2">
                            <motion.span 
                              className="text-2xl"
                              animate={selectedPersonality === p.id ? { scale: [1, 1.2, 1] } : {}}
                              transition={{ duration: 0.3 }}
                            >
                              {p.emoji}
                            </motion.span>
                            <span className="font-semibold">{p.name}</span>
                            <AnimatePresence>
                              {selectedPersonality === p.id && (
                                <motion.div
                                  initial={{ scale: 0, rotate: -180 }}
                                  animate={{ scale: 1, rotate: 0 }}
                                  exit={{ scale: 0, rotate: 180 }}
                                  className="ml-auto"
                                >
                                  <Check className="w-5 h-5 text-primary" />
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                          <p className="text-sm text-muted-foreground italic">"{p.examples[0]}"</p>
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
                        className="w-full h-12 text-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
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
