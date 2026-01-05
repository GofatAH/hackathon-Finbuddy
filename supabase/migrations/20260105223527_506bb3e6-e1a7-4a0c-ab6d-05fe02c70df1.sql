-- Add DELETE policy for chat_messages so users can clear their chat history
CREATE POLICY "Users can delete their own messages"
ON public.chat_messages
FOR DELETE
USING (auth.uid() = user_id);