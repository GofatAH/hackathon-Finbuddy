import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent } from '@/components/ui/card';
import { personalities, PersonalityType } from '@/lib/personalities';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowRight, Check, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import demoVideo from '@/assets/demo-video.mp4';

type Step = 'welcome' | 'name' | 'income' | 'budget' | 'personality';

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-finbuddy-dark via-finbuddy-deep to-finbuddy-forest p-4 flex items-center justify-center">
      <div className="w-full max-w-lg animate-fade-in">
        {/* Progress */}
        <div className="flex justify-center gap-2 mb-8">
          {['welcome', 'name', 'income', 'budget', 'personality'].map((s, i) => (
            <div
              key={s}
              className={cn(
                'w-3 h-3 rounded-full transition-all',
                step === s ? 'bg-finbuddy-mint scale-125' : 
                ['welcome', 'name', 'income', 'budget', 'personality'].indexOf(step) > i ? 'bg-finbuddy-sage' : 'bg-finbuddy-forest'
              )}
            />
          ))}
        </div>

        <Card className="border-0 shadow-2xl bg-card/95 backdrop-blur overflow-hidden">
          <CardContent className="p-8">
            {/* Step 0: Welcome with Demo Video */}
            {step === 'welcome' && (
              <div className="space-y-6 animate-fade-in">
                <div className="text-center">
                  <h2 className="text-2xl font-bold mb-2">Welcome to FinBuddy</h2>
                  <p className="text-muted-foreground">Track expenses naturally, like texting a friend</p>
                </div>
                
                <div className="relative rounded-2xl overflow-hidden bg-black/20 aspect-[9/16] max-h-[320px] mx-auto">
                  <video
                    src={demoVideo}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-3 left-3 right-3 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2">
                    <p className="text-xs text-white/90 text-center">
                      Just type your expenses like a chat message!
                    </p>
                  </div>
                </div>

                <Button onClick={handleNext} className="w-full h-12 text-lg">
                  Get Started <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </div>
            )}

            {/* Step 1: Name */}
            {step === 'name' && (
              <div className="space-y-6 animate-fade-in">
                <div className="text-center">
                  <div className="text-4xl mb-4">👋</div>
                  <h2 className="text-2xl font-bold mb-2">Hey! I'm FinBuddy</h2>
                  <p className="text-muted-foreground">Your personal finance companion. What should I call you?</p>
                </div>
                <Input
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-14 text-lg text-center"
                  autoFocus
                />
                <Button onClick={handleNext} className="w-full h-12 text-lg">
                  Continue <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </div>
            )}

            {/* Step 2: Income */}
            {step === 'income' && (
              <div className="space-y-6 animate-fade-in">
                <div className="text-center">
                  <div className="text-4xl mb-4">💰</div>
                  <h2 className="text-2xl font-bold mb-2">Nice to meet you, {name}!</h2>
                  <p className="text-muted-foreground">What's your monthly income? This stays completely private.</p>
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-muted-foreground">$</span>
                  <Input
                    type="number"
                    placeholder="3,500"
                    value={income}
                    onChange={(e) => setIncome(e.target.value)}
                    className="h-14 text-2xl text-center pl-10"
                    autoFocus
                  />
                </div>
                <Button onClick={handleNext} className="w-full h-12 text-lg">
                  Continue <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </div>
            )}

            {/* Step 3: Budget Split */}
            {step === 'budget' && (
              <div className="space-y-6 animate-fade-in">
                <div className="text-center">
                  <div className="text-4xl mb-4">📊</div>
                  <h2 className="text-2xl font-bold mb-2">Let's split up your money</h2>
                  <p className="text-muted-foreground">The 50/30/20 rule is a great start. Adjust if you'd like!</p>
                </div>
                
                <div className="space-y-6">
                  {/* Needs */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-semibold text-needs">Needs</span>
                        <span className="text-sm text-muted-foreground ml-2">(rent, groceries, bills)</span>
                      </div>
                      <span className="font-bold">{budgetSplit.needs}%</span>
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
                  </div>

                  {/* Wants */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-semibold text-wants">Wants</span>
                        <span className="text-sm text-muted-foreground ml-2">(fun, dining, hobbies)</span>
                      </div>
                      <span className="font-bold">{budgetSplit.wants}%</span>
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
                  </div>

                  {/* Savings */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-semibold text-savings">Savings</span>
                        <span className="text-sm text-muted-foreground ml-2">(future you!)</span>
                      </div>
                      <span className="font-bold">{budgetSplit.savings}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-savings transition-all" 
                        style={{ width: `${(budgetSplit.savings / 40) * 100}%` }} 
                      />
                    </div>
                    <p className="text-sm text-center text-muted-foreground">${budgetAmounts.savings.toFixed(0)}/month</p>
                  </div>
                </div>

                <Button onClick={handleNext} className="w-full h-12 text-lg">
                  Continue <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </div>
            )}

            {/* Step 4: Personality */}
            {step === 'personality' && (
              <div className="space-y-6 animate-fade-in">
                <div className="text-center">
                  <div className="text-4xl mb-4">🎭</div>
                  <h2 className="text-2xl font-bold mb-2">Choose your buddy's vibe</h2>
                  <p className="text-muted-foreground">Pick how FinBuddy talks to you. You can change anytime!</p>
                </div>
                
                <div className="grid gap-3">
                  {personalities.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPersonality(p.id)}
                      className={cn(
                        'p-4 rounded-xl border-2 text-left transition-all',
                        selectedPersonality === p.id 
                          ? 'border-primary bg-primary/5' 
                          : 'border-muted hover:border-muted-foreground/30'
                      )}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{p.emoji}</span>
                        <span className="font-semibold">{p.name}</span>
                        {selectedPersonality === p.id && (
                          <Check className="w-5 h-5 text-primary ml-auto" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground italic">"{p.examples[0]}"</p>
                    </button>
                  ))}
                </div>

                <Button 
                  onClick={handleComplete} 
                  className="w-full h-12 text-lg"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>Let's Go! 🚀</>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
