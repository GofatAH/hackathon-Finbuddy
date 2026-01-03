import { useProfile } from '@/hooks/useProfile';
import { useExpenses } from '@/hooks/useExpenses';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Wallet, Target, Calendar, ArrowRight, Sparkles, ShoppingBag, PiggyBank, Home } from 'lucide-react';

interface ProgressRingProps {
  percentage: number;
  label: string;
  spent: number;
  budget: number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  delay?: number;
}

function ProgressRing({ percentage, label, spent, budget, icon, color, bgColor, delay = 0 }: ProgressRingProps) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(percentage, 100) / 100) * circumference;
  
  const getStatusEmoji = () => {
    if (percentage >= 91) return '🔥';
    if (percentage >= 76) return '👀';
    return '✓';
  };

  return (
    <div 
      className="flex flex-col items-center animate-fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="relative w-24 h-24">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="48"
            cy="48"
            r={radius}
            strokeWidth="6"
            stroke="currentColor"
            fill="transparent"
            className="text-muted/30"
          />
          <circle
            cx="48"
            cy="48"
            r={radius}
            strokeWidth="6"
            stroke="currentColor"
            fill="transparent"
            strokeLinecap="round"
            style={{
              strokeDasharray: circumference,
              strokeDashoffset,
              transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
            className={color}
          />
        </svg>
        <div className={cn(
          "absolute inset-2 rounded-full flex flex-col items-center justify-center",
          bgColor
        )}>
          {icon}
        </div>
      </div>
      <div className="mt-3 text-center">
        <div className="flex items-center justify-center gap-1">
          <span className="font-bold text-lg">{percentage}%</span>
          <span className="text-sm">{getStatusEmoji()}</span>
        </div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          ${spent.toFixed(0)} / ${budget.toFixed(0)}
        </p>
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  subtext?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
  delay?: number;
}

function StatCard({ label, value, subtext, icon, trend, className, delay = 0 }: StatCardProps) {
  return (
    <Card 
      className={cn(
        "overflow-hidden animate-fade-in",
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold tracking-tight">{value}</p>
              {trend && (
                <span className={cn(
                  "flex items-center text-xs font-medium",
                  trend === 'up' && "text-budget-safe",
                  trend === 'down' && "text-budget-danger"
                )}>
                  {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                </span>
              )}
            </div>
            {subtext && <p className="text-xs text-muted-foreground mt-1">{subtext}</p>}
          </div>
          <div className="p-2 rounded-xl bg-muted/50">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function Dashboard() {
  const { profile, getBudgetAmounts } = useProfile();
  const { expenses, getSpendingByCategory } = useExpenses();
  
  const budgets = getBudgetAmounts();
  const spending = getSpendingByCategory();
  
  const percentages = {
    needs: budgets.needs > 0 ? Math.round((spending.needs / budgets.needs) * 100) : 0,
    wants: budgets.wants > 0 ? Math.round((spending.wants / budgets.wants) * 100) : 0,
    savings: budgets.savings > 0 ? Math.round((spending.savings / budgets.savings) * 100) : 0,
  };

  const totalSpent = spending.needs + spending.wants + spending.savings;
  const totalBudget = profile?.monthly_income || 0;
  const remaining = totalBudget - totalSpent;
  const overallPercentage = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
  
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysLeft = daysInMonth - today.getDate();
  const monthName = today.toLocaleDateString('en-US', { month: 'long' });
  const dailyBudget = remaining > 0 ? remaining / Math.max(daysLeft, 1) : 0;

  const getInsight = () => {
    const dayOfMonth = today.getDate();
    const expectedSpendPercentage = (dayOfMonth / daysInMonth) * 100;
    const difference = overallPercentage - expectedSpendPercentage;
    
    if (difference < -10) {
      return { text: "You're ahead of pace! Keep it up", emoji: "🚀", type: "positive" };
    } else if (difference > 15) {
      return { text: "Spending is high, consider slowing down", emoji: "⚡", type: "warning" };
    } else {
      return { text: "Right on track for the month", emoji: "🎯", type: "neutral" };
    }
  };

  const insight = getInsight();

  return (
    <div className="p-4 space-y-5 overflow-y-auto h-full pb-24">
      {/* Header */}
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-2xl font-bold tracking-tight">{monthName}</h2>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
            <Calendar className="w-3.5 h-3.5" />
            <span>{daysLeft}d left</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">Your financial snapshot</p>
      </div>

      {/* Main Balance Card */}
      <Card 
        className="overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground animate-fade-in"
        style={{ animationDelay: '50ms' }}
      >
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm opacity-80 mb-1">Remaining Budget</p>
              <p className="text-4xl font-bold tracking-tight">
                ${remaining >= 0 ? remaining.toFixed(0) : '0'}
              </p>
              {remaining < 0 && (
                <p className="text-sm opacity-80 mt-1">
                  Over by ${Math.abs(remaining).toFixed(0)}
                </p>
              )}
            </div>
            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-sm">
              <Wallet className="w-6 h-6" />
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs opacity-80">
              <span>${totalSpent.toFixed(0)} spent</span>
              <span>${totalBudget.toFixed(0)} total</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full transition-all duration-1000 ease-out",
                  overallPercentage >= 90 ? "bg-red-400" : overallPercentage >= 75 ? "bg-amber-400" : "bg-white"
                )}
                style={{ width: `${Math.min(overallPercentage, 100)}%` }}
              />
            </div>
          </div>

          {/* Daily budget */}
          <div className="mt-4 pt-4 border-t border-white/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 opacity-70" />
              <span className="text-sm opacity-80">Daily budget</span>
            </div>
            <span className="font-semibold">${dailyBudget.toFixed(0)}/day</span>
          </div>
        </CardContent>
      </Card>

      {/* Insight Card */}
      <Card 
        className={cn(
          "border-l-4 animate-fade-in",
          insight.type === 'positive' && "border-l-budget-safe bg-budget-safe/5",
          insight.type === 'warning' && "border-l-budget-warning bg-budget-warning/5",
          insight.type === 'neutral' && "border-l-primary bg-primary/5"
        )}
        style={{ animationDelay: '100ms' }}
      >
        <CardContent className="py-4 px-4">
          <div className="flex items-center gap-3">
            <div className="text-2xl">{insight.emoji}</div>
            <div className="flex-1">
              <p className="font-medium">{insight.text}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Day {today.getDate()} of {daysInMonth} · {overallPercentage}% spent
              </p>
            </div>
            <Sparkles className="w-4 h-4 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>

      {/* Category Progress Rings */}
      <div className="grid grid-cols-3 gap-2 py-2">
        <ProgressRing
          percentage={percentages.needs}
          label="Needs"
          spent={spending.needs}
          budget={budgets.needs}
          icon={<Home className="w-5 h-5 text-needs" />}
          color="text-needs"
          bgColor="bg-needs/10"
          delay={150}
        />
        <ProgressRing
          percentage={percentages.wants}
          label="Wants"
          spent={spending.wants}
          budget={budgets.wants}
          icon={<ShoppingBag className="w-5 h-5 text-wants" />}
          color="text-wants"
          bgColor="bg-wants/10"
          delay={200}
        />
        <ProgressRing
          percentage={percentages.savings}
          label="Savings"
          spent={spending.savings}
          budget={budgets.savings}
          icon={<PiggyBank className="w-5 h-5 text-savings" />}
          color="text-savings"
          bgColor="bg-savings/10"
          delay={250}
        />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Total Spent"
          value={`$${totalSpent.toFixed(0)}`}
          subtext={`${overallPercentage}% of budget`}
          icon={<TrendingDown className="w-4 h-4 text-muted-foreground" />}
          delay={300}
        />
        <StatCard
          label="Monthly Income"
          value={`$${totalBudget.toFixed(0)}`}
          subtext="Set in settings"
          icon={<TrendingUp className="w-4 h-4 text-muted-foreground" />}
          delay={350}
        />
      </div>

      {/* Recent Transactions */}
      <div className="animate-fade-in" style={{ animationDelay: '400ms' }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Recent Activity</h3>
          {expenses.length > 5 && (
            <button className="text-xs text-primary flex items-center gap-1 hover:underline">
              View all <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
        
        {expenses.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <Wallet className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="font-medium mb-1">No expenses yet</p>
              <p className="text-sm text-muted-foreground">
                Chat with FinBuddy to log your first expense
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {expenses.slice(0, 5).map((expense, index) => {
              const CategoryIcon = expense.category === 'needs' ? Home : expense.category === 'wants' ? ShoppingBag : PiggyBank;
              
              return (
                <Card 
                  key={expense.id} 
                  className="animate-fade-in"
                  style={{ animationDelay: `${450 + index * 50}ms` }}
                >
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                        expense.category === 'needs' && "bg-needs/10",
                        expense.category === 'wants' && "bg-wants/10",
                        expense.category === 'savings' && "bg-savings/10"
                      )}>
                        <CategoryIcon className={cn(
                          "w-5 h-5",
                          expense.category === 'needs' && "text-needs",
                          expense.category === 'wants' && "text-wants",
                          expense.category === 'savings' && "text-savings"
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {expense.merchant || expense.description || 'Expense'}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {expense.category} · {new Date(expense.expense_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      <p className={cn(
                        'font-bold tabular-nums',
                        expense.category === 'needs' && 'text-needs',
                        expense.category === 'wants' && 'text-wants',
                        expense.category === 'savings' && 'text-savings'
                      )}>
                        -${expense.amount.toFixed(2)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}