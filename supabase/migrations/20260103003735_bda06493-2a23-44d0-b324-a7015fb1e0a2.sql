-- Drop existing category check constraint
ALTER TABLE public.subscriptions DROP CONSTRAINT subscriptions_category_check;

-- Update existing records to new categories
UPDATE public.subscriptions SET category = 'entertainment' WHERE category = 'wants';
UPDATE public.subscriptions SET category = 'utilities' WHERE category = 'needs';

-- Add new check constraint with expanded categories
ALTER TABLE public.subscriptions 
ADD CONSTRAINT subscriptions_category_check 
CHECK (category IN ('tools', 'entertainment', 'productivity', 'lifestyle', 'utilities', 'gaming', 'music', 'news', 'fitness', 'other'));