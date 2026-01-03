import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Send, Sparkles, Camera, Coffee, ShoppingCart, Utensils, Car, Film, Dumbbell, Home, Zap, X, Loader2, Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  onReceiptScanned?: (data: { amount: number; merchant: string; category: string }) => void;
}

const placeholders = [
  "Coffee $5 at Starbucks...",
  "Groceries $45 at Trader Joe's...",
  "Netflix subscription $15...",
  "Gas $40...",
  "Lunch $12...",
];

const quickReplies = [
  { icon: Coffee, label: 'Coffee', template: 'Coffee $', color: 'text-amber-600' },
  { icon: Utensils, label: 'Food', template: 'Food $', color: 'text-orange-500' },
  { icon: ShoppingCart, label: 'Groceries', template: 'Groceries $', color: 'text-green-600' },
  { icon: Car, label: 'Transport', template: 'Transport $', color: 'text-blue-500' },
  { icon: Film, label: 'Entertainment', template: 'Entertainment $', color: 'text-purple-500' },
  { icon: Dumbbell, label: 'Fitness', template: 'Gym $', color: 'text-red-500' },
  { icon: Home, label: 'Bills', template: 'Bill payment $', color: 'text-slate-600' },
  { icon: Zap, label: 'Utilities', template: 'Utilities $', color: 'text-yellow-500' },
];

export function ChatInput({ onSend, disabled, onReceiptScanned }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Cycle through placeholders
  useEffect(() => {
    if (isFocused) return;
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [isFocused]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  // Hide quick replies when typing or image selected
  useEffect(() => {
    setShowQuickReplies(!message.trim() && !selectedImage);
  }, [message, selectedImage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSend(message);
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleQuickReply = (template: string) => {
    setMessage(template);
    textareaRef.current?.focus();
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({ title: 'Please select an image file', variant: 'destructive' });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: 'Image must be under 5MB', variant: 'destructive' });
        return;
      }
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleScanReceipt = async () => {
    if (!selectedImage) return;

    setIsScanning(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Please sign in to scan receipts');
      }

      // Upload image to storage
      const fileName = `${user.id}/${Date.now()}-${selectedImage.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, selectedImage);

      if (uploadError) {
        throw new Error('Failed to upload image');
      }

      // Get public URL for the image
      const { data: { publicUrl } } = supabase.storage
        .from('receipts')
        .getPublicUrl(fileName);

      // For private buckets, we need a signed URL
      const { data: signedUrlData } = await supabase.storage
        .from('receipts')
        .createSignedUrl(fileName, 300); // 5 minutes

      const imageUrl = signedUrlData?.signedUrl || publicUrl;

      // Call the scan-receipt edge function
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scan-receipt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ imageUrl }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to scan receipt');
      }

      const { amount, merchant, category, confidence } = result.data;

      // Pre-fill the message with extracted data
      const expenseMessage = `${merchant} $${amount}`;
      setMessage(expenseMessage);
      
      toast({
        title: confidence === 'high' ? '✅ Receipt scanned!' : '⚠️ Receipt scanned (low confidence)',
        description: `Found: ${merchant} - $${amount.toFixed(2)}`,
      });

      // Notify parent if callback provided
      if (onReceiptScanned) {
        onReceiptScanned({ amount, merchant, category });
      }

      // Clear the image
      clearImage();

    } catch (error) {
      console.error('Receipt scan error:', error);
      toast({
        title: 'Scan failed',
        description: error instanceof Error ? error.message : 'Could not read receipt',
        variant: 'destructive',
      });
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="border-t border-border/30 glass">
      {/* Image preview */}
      <AnimatePresence>
        {imagePreview && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 pb-0">
              <div className="relative inline-block">
                <img 
                  src={imagePreview} 
                  alt="Receipt preview" 
                  className="h-24 w-auto rounded-xl border border-border/40 shadow-sm object-cover"
                />
                <button
                  onClick={clearImage}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleScanReceipt}
                disabled={isScanning || disabled}
                className={cn(
                  "mt-2 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
                  isScanning 
                    ? "bg-muted text-muted-foreground" 
                    : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-premium"
                )}
              >
                {isScanning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Scanning receipt...</span>
                  </>
                ) : (
                  <>
                    <Receipt className="w-4 h-4" />
                    <span>Scan Receipt</span>
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick reply buttons */}
      <AnimatePresence>
        {showQuickReplies && !disabled && !isScanning && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pt-3 pb-1">
              <div className="flex items-center gap-1.5 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-primary/60" />
                <span className="text-[11px] font-medium text-muted-foreground">Quick add</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {quickReplies.map((reply, index) => {
                  const Icon = reply.icon;
                  return (
                    <motion.button
                      key={reply.label}
                      initial={{ opacity: 0, scale: 0.8, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ delay: index * 0.03, type: "spring", stiffness: 400 }}
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleQuickReply(reply.template)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-card hover:bg-muted/50 rounded-full border border-border/40 shadow-sm transition-colors group"
                    >
                      <Icon className={cn("w-3.5 h-3.5 transition-colors", reply.color)} />
                      <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                        {reply.label}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageSelect}
        className="hidden"
      />

      {/* Input form */}
      <motion.form 
        onSubmit={handleSubmit}
        initial={false}
        animate={{ 
          boxShadow: isFocused 
            ? '0 -4px 20px -4px hsl(var(--primary) / 0.1)' 
            : '0 -2px 10px -2px hsl(var(--primary) / 0.05)'
        }}
        className="p-3 transition-all duration-300"
      >
        <div className="flex items-end gap-2">
          {/* Camera/Receipt button */}
          <motion.div whileTap={{ scale: 0.9 }}>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl h-10 w-10 transition-all duration-200",
                selectedImage && "text-primary bg-primary/10"
              )}
              disabled={disabled || isScanning}
            >
              <Camera className="w-5 h-5" />
            </Button>
          </motion.div>
          
          {/* Input container */}
          <div className="flex-1 relative">
            <div className={cn(
              "relative rounded-2xl border transition-all duration-300 overflow-hidden",
              isFocused 
                ? "border-primary/40 bg-background shadow-[0_0_0_3px_hsl(var(--primary)/0.1)]" 
                : "border-border/50 bg-background/80"
            )}>
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onKeyDown={handleKeyDown}
                placeholder={placeholders[placeholderIndex]}
                rows={1}
                className={cn(
                  'w-full bg-transparent px-4 py-3 text-sm resize-none focus:outline-none placeholder:text-muted-foreground/60 transition-all duration-200',
                  (disabled || isScanning) && 'opacity-50 cursor-not-allowed'
                )}
                disabled={disabled || isScanning}
              />
              
              {/* Sparkle hint */}
              <AnimatePresence>
                {!message && !isFocused && !selectedImage && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  >
                    <Sparkles className="w-4 h-4 text-primary/40" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          
          {/* Send button */}
          <motion.div 
            whileTap={{ scale: 0.9 }}
            animate={{ 
              scale: message.trim() ? 1 : 0.9,
              opacity: message.trim() ? 1 : 0.6
            }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >
            <Button
              type="submit"
              size="icon"
              className={cn(
                "shrink-0 rounded-xl h-10 w-10 transition-all duration-300",
                message.trim() 
                  ? "bg-primary hover:bg-primary/90 shadow-premium text-primary-foreground" 
                  : "bg-muted text-muted-foreground shadow-none"
              )}
              disabled={disabled || isScanning || !message.trim()}
            >
              <Send className={cn(
                "w-4 h-4 transition-transform duration-200",
                message.trim() && "translate-x-0.5 -translate-y-0.5"
              )} />
            </Button>
          </motion.div>
        </div>
        
        {/* Character hint */}
        <AnimatePresence>
          {message.length > 100 && (
            <motion.p 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="text-[10px] text-muted-foreground text-right mt-1 pr-2"
            >
              {message.length} characters
            </motion.p>
          )}
        </AnimatePresence>
      </motion.form>
    </div>
  );
}
