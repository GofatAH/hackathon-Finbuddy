import { useProfile } from '@/hooks/useProfile';
import { useExpenses } from '@/hooks/useExpenses';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ProgressRingProps {
  percentage: number;
  color: string;
  label: string;
  spent: number;
  budget: number;
}

function ProgressRing({ percentage, color, label, spent, budget }: ProgressRingProps) {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(percentage, 100) / 100) * circumference;
  
  const getStatusColor = () => {
    if (percentage >= 91) return 'text-budget-danger';
    if (percentage >= 76) return 'text-budget-warning';
    return 'text-budget-safe';
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-28 h-28">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="56"
            cy="56"
            r={radius}
            strokeWidth="8"
            stroke="currentColor"
            fill="transparent"
            className="text-muted"
          />
          <circle
            cx="56"
            cy="56"
            r={radius}
            strokeWidth="8"
            stroke="currentColor"
            fill="transparent"
            strokeLinecap="round"
            style={{
              strokeDasharray: circumference,
              strokeDashoffset,
              transition: 'stroke-dashoffset 0.5s ease'
            }}
            className={color}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('text-xl font-bold', getStatusColor())}>{percentage}%</span>
        </div>
      </div>
      <h3 className="font-semibold mt-2">{label}</h3>
      <p className="text-sm text-muted-foreground">
        ${spent.toFixed(0)} of ${budget.toFixed(0)}
      </p>
    </div>
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
  
  const daysLeft = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate();
  const monthName = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const getInsight = () => {
    const dayOfMonth = new Date().getDate();
    const totalPercentage = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
    
    if (dayOfMonth <= 10) {
      return percentages.needs <= 40 && percentages.wants <= 30 
        ? "You're off to a solid start! On track to stay within budget 💚"
        : "Early in the month - plenty of time to adjust! 📊";
    } else if (dayOfMonth <= 20) {
      return `Halfway through and you're at ${totalPercentage}% total spending ${totalPercentage <= 60 ? '- right on pace! 🎯' : '- keep an eye on it 👀'}`;
    } else {
      const dailyBudget = remaining / Math.max(daysLeft, 1);
      return `${daysLeft} days left with $${remaining.toFixed(0)} remaining. That's ~$${dailyBudget.toFixed(0)}/day ${remaining > 0 ? '💪' : '😬'}`;
    }
  };

  return (
    <div className="p-4 space-y-6 overflow-y-auto h-full">
      <div className="text-center">
        <h2 className="text-xl font-bold">{monthName}</h2>
        <p className="text-sm text-muted-foreground">{daysLeft} days remaining</p>
      </div>

      {/* Progress Rings */}
      <div className="flex justify-around">
        <ProgressRing
          percentage={percentages.needs}
          color="text-needs"
          label="Needs"
          spent={spending.needs}
          budget={budgets.needs}
        />
        <ProgressRing
          percentage={percentages.wants}
          color="text-wants"
          label="Wants"
          spent={spending.wants}
          budget={budgets.wants}
        />
        <ProgressRing
          percentage={percentages.savings}
          color="text-savings"
          label="Savings"
          spent={spending.savings}
          budget={budgets.savings}
        />
      </div>

      {/* Summary Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-muted-foreground">Total Spent</p>
              <p className="text-xl font-bold">${totalSpent.toFixed(0)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Budget</p>
              <p className="text-xl font-bold">${totalBudget.toFixed(0)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Remaining</p>
              <p className={cn(
                'text-xl font-bold',
                remaining >= 0 ? 'text-budget-safe' : 'text-budget-danger'
              )}>
                ${remaining.toFixed(0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Insight */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <p className="text-center">{getInsight()}</p>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No expenses yet. Start by chatting with FinBuddy!
            </p>
          ) : (
            <div className="space-y-3">
              {expenses.slice(0, 5).map((expense) => (
                <div key={expense.id} className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{expense.merchant || expense.description || 'Expense'}</p>
                    <p className="text-sm text-muted-foreground capitalize">{expense.category}</p>
                  </div>
                  <p className={cn(
                    'font-semibold',
                    expense.category === 'needs' && 'text-needs',
                    expense.category === 'wants' && 'text-wants',
                    expense.category === 'savings' && 'text-savings'
                  )}>
                    ${expense.amount.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
