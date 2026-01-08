import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface Subscription {
  id: string;
  name: string;
  amount: number;
  frequency: 'weekly' | 'monthly' | 'yearly';
  next_charge_date: string;
  is_trial: boolean;
  category: string;
}

interface CategoryConfig {
  label: string;
  color: string;
  bgColor: string;
  dotColor?: string;
}

interface SubscriptionCalendarProps {
  subscriptions: Subscription[];
  categoryConfig: Record<string, CategoryConfig>;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 
                'July', 'August', 'September', 'October', 'November', 'December'];

export function SubscriptionCalendar({ subscriptions, categoryConfig }: SubscriptionCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Calculate charge dates for the current month
  const chargesForMonth = useMemo(() => {
    const charges: Record<number, Subscription[]> = {};
    
    subscriptions.forEach(sub => {
      if (sub.is_trial) return; // Don't show trial subscriptions on calendar
      
      const chargeDate = new Date(sub.next_charge_date);
      
      // Get all occurrences in this month based on frequency
      const occurrences: Date[] = [];
      
      if (sub.frequency === 'weekly') {
        // Find all weekly occurrences in this month
        let checkDate = new Date(year, month, 1);
        const endOfMonth = new Date(year, month + 1, 0);
        
        // Find the first occurrence in or before this month
        const dayOfWeek = chargeDate.getDay();
        while (checkDate.getDay() !== dayOfWeek) {
          checkDate.setDate(checkDate.getDate() + 1);
        }
        
        while (checkDate <= endOfMonth) {
          if (checkDate.getMonth() === month) {
            occurrences.push(new Date(checkDate));
          }
          checkDate.setDate(checkDate.getDate() + 7);
        }
      } else if (sub.frequency === 'monthly') {
        // Check if charge day falls in this month
        const chargeDay = chargeDate.getDate();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const actualDay = Math.min(chargeDay, daysInMonth);
        occurrences.push(new Date(year, month, actualDay));
      } else if (sub.frequency === 'yearly') {
        // Check if this is the charge month
        if (chargeDate.getMonth() === month) {
          const chargeDay = chargeDate.getDate();
          const daysInMonth = new Date(year, month + 1, 0).getDate();
          const actualDay = Math.min(chargeDay, daysInMonth);
          occurrences.push(new Date(year, month, actualDay));
        }
      }
      
      occurrences.forEach(date => {
        const day = date.getDate();
        if (!charges[day]) charges[day] = [];
        charges[day].push(sub);
      });
    });
    
    return charges;
  }, [subscriptions, year, month]);

  // Get calendar grid data
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    
    const days: { day: number; isCurrentMonth: boolean; isToday: boolean }[] = [];
    
    // Previous month days
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      days.push({
        day: daysInPrevMonth - i,
        isCurrentMonth: false,
        isToday: false
      });
    }
    
    // Current month days
    const today = new Date();
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        isCurrentMonth: true,
        isToday: today.getDate() === i && today.getMonth() === month && today.getFullYear() === year
      });
    }
    
    // Next month days to complete the grid
    const remainingDays = 42 - days.length; // 6 rows * 7 days
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        day: i,
        isCurrentMonth: false,
        isToday: false
      });
    }
    
    return days;
  }, [year, month]);

  const goToPrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDay(null);
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDay(null);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDay(new Date().getDate());
  };

  const selectedDayCharges = selectedDay ? chargesForMonth[selectedDay] || [] : [];
  const totalForSelectedDay = selectedDayCharges.reduce((sum, sub) => sum + sub.amount, 0);

  // Calculate monthly total from charges
  const monthlyTotal = useMemo(() => {
    let total = 0;
    Object.values(chargesForMonth).forEach(subs => {
      subs.forEach(sub => {
        total += sub.amount;
      });
    });
    return total;
  }, [chargesForMonth]);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={goToPrevMonth}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="font-semibold text-sm min-w-[120px] text-center">
              {MONTHS[month]} {year}
            </h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={goToNextMonth}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={goToToday}
          >
            Today
          </Button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {DAYS.map(day => (
            <div key={day} className="text-center text-[10px] font-medium text-muted-foreground py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((dayInfo, index) => {
            const charges = dayInfo.isCurrentMonth ? chargesForMonth[dayInfo.day] || [] : [];
            const hasCharges = charges.length > 0;
            const totalAmount = charges.reduce((sum, sub) => sum + sub.amount, 0);
            const isSelected = selectedDay === dayInfo.day && dayInfo.isCurrentMonth;
            
            return (
              <button
                key={index}
                onClick={() => dayInfo.isCurrentMonth && setSelectedDay(isSelected ? null : dayInfo.day)}
                disabled={!dayInfo.isCurrentMonth}
                className={cn(
                  "relative aspect-square rounded-lg flex flex-col items-center justify-center text-xs transition-all",
                  "min-h-[36px] p-0.5",
                  dayInfo.isCurrentMonth 
                    ? "hover:bg-muted cursor-pointer" 
                    : "text-muted-foreground/30 cursor-default",
                  dayInfo.isToday && "ring-2 ring-primary ring-offset-1 ring-offset-background",
                  isSelected && "bg-primary text-primary-foreground hover:bg-primary/90",
                  hasCharges && !isSelected && "font-semibold"
                )}
              >
                <span className={cn(
                  "text-xs",
                  dayInfo.isToday && !isSelected && "text-primary font-bold"
                )}>
                  {dayInfo.day}
                </span>
                
                {/* Charge indicators */}
                {hasCharges && dayInfo.isCurrentMonth && (
                  <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center max-w-full">
                    {charges.slice(0, 3).map((sub, i) => {
                      const config = categoryConfig[sub.category];
                      // Map category to specific color classes
                      const dotColors: Record<string, string> = {
                        tools: 'bg-violet-500',
                        entertainment: 'bg-pink-500',
                        productivity: 'bg-amber-500',
                        lifestyle: 'bg-rose-500',
                        utilities: 'bg-blue-500',
                        gaming: 'bg-green-500',
                        music: 'bg-emerald-500',
                        news: 'bg-slate-500',
                        fitness: 'bg-orange-500',
                        other: 'bg-gray-500'
                      };
                      return (
                        <div
                          key={i}
                          className={cn(
                            "w-1.5 h-1.5 rounded-full shrink-0",
                            isSelected ? "bg-primary-foreground/70" : (dotColors[sub.category] || "bg-primary")
                          )}
                        />
                      );
                    })}
                    {charges.length > 3 && (
                      <span className={cn(
                        "text-[8px] leading-none",
                        isSelected ? "text-primary-foreground/70" : "text-muted-foreground"
                      )}>
                        +{charges.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Monthly summary */}
        <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs">
          <span className="text-muted-foreground">This month's charges</span>
          <span className="font-bold flex items-center gap-1">
            <DollarSign className="w-3 h-3" />
            {monthlyTotal.toFixed(0)}
          </span>
        </div>

        {/* Selected day details */}
        <AnimatePresence>
          {selectedDay && selectedDayCharges.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 pt-3 border-t border-border"
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-sm">
                  {MONTHS[month]} {selectedDay}
                </h4>
                <span className="text-xs text-muted-foreground">
                  ${totalForSelectedDay.toFixed(2)} total
                </span>
              </div>
              <div className="space-y-1.5">
                {selectedDayCharges.map(sub => {
                  // Map category to specific color classes
                  const dotColors: Record<string, string> = {
                    tools: 'bg-violet-500',
                    entertainment: 'bg-pink-500',
                    productivity: 'bg-amber-500',
                    lifestyle: 'bg-rose-500',
                    utilities: 'bg-blue-500',
                    gaming: 'bg-green-500',
                    music: 'bg-emerald-500',
                    news: 'bg-slate-500',
                    fitness: 'bg-orange-500',
                    other: 'bg-gray-500'
                  };
                  return (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          dotColors[sub.category] || "bg-primary"
                        )} />
                        <span className="text-sm font-medium">{sub.name}</span>
                      </div>
                      <span className="text-sm font-bold">${sub.amount.toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {selectedDay && selectedDayCharges.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-3 pt-3 border-t border-border text-center"
          >
            <p className="text-xs text-muted-foreground">
              No charges on {MONTHS[month]} {selectedDay}
            </p>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
