-- Migration: Create chat tables for multi-user support
-- This migration creates tables for storing chats and messages per user

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: t_chats
-- Stores chat metadata per user
CREATE TABLE IF NOT EXISTS t_chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Neuer Chat',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  message_count INTEGER NOT NULL DEFAULT 0,
  is_shared BOOLEAN NOT NULL DEFAULT FALSE,
  shared_with_user_ids UUID[] DEFAULT ARRAY[]::UUID[],
  CONSTRAINT t_chats_user_id_check CHECK (user_id IS NOT NULL)
);

-- Table: t_chat_messages
-- Stores individual messages within chats
CREATE TABLE IF NOT EXISTS t_chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID NOT NULL REFERENCES t_chats(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tool_calls JSONB,
  tool_call_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT t_chat_messages_chat_id_check CHECK (chat_id IS NOT NULL)
);

-- Add role constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 't_chat_messages_role_check'
  ) THEN
    ALTER TABLE t_chat_messages 
    ADD CONSTRAINT t_chat_messages_role_check 
    CHECK (role IN ('user', 'assistant', 'tool'));
  END IF;
END $$;

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_t_chats_user_id ON t_chats(user_id);
CREATE INDEX IF NOT EXISTS idx_t_chats_updated_at ON t_chats(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_t_chat_messages_chat_id ON t_chat_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_t_chat_messages_timestamp ON t_chat_messages(timestamp DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at on t_chats (drop if exists first)
DROP TRIGGER IF EXISTS update_t_chats_updated_at ON t_chats;
CREATE TRIGGER update_t_chats_updated_at
  BEFORE UPDATE ON t_chats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to update message_count on t_chats
CREATE OR REPLACE FUNCTION update_chat_message_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE t_chats SET message_count = message_count + 1 WHERE id = NEW.chat_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE t_chats SET message_count = GREATEST(0, message_count - 1) WHERE id = OLD.chat_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update message_count (drop if exists first)
DROP TRIGGER IF EXISTS update_chat_message_count_trigger ON t_chat_messages;
CREATE TRIGGER update_chat_message_count_trigger
  AFTER INSERT OR DELETE ON t_chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_message_count();

-- Row Level Security (RLS) Policies
ALTER TABLE t_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE t_chat_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view their own chats" ON t_chats;
DROP POLICY IF EXISTS "Users can create their own chats" ON t_chats;
DROP POLICY IF EXISTS "Users can update their own chats" ON t_chats;
DROP POLICY IF EXISTS "Users can delete their own chats" ON t_chats;
DROP POLICY IF EXISTS "Users can view messages from their own chats" ON t_chat_messages;
DROP POLICY IF EXISTS "Users can insert messages into their own chats" ON t_chat_messages;
DROP POLICY IF EXISTS "Users can update messages in their own chats" ON t_chat_messages;
DROP POLICY IF EXISTS "Users can delete messages from their own chats" ON t_chat_messages;

-- Policy: Users can only see their own chats
CREATE POLICY "Users can view their own chats"
  ON t_chats FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = ANY(shared_with_user_ids));

-- Policy: Users can create their own chats
CREATE POLICY "Users can create their own chats"
  ON t_chats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own chats
CREATE POLICY "Users can update their own chats"
  ON t_chats FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own chats
CREATE POLICY "Users can delete their own chats"
  ON t_chats FOR DELETE
  USING (auth.uid() = user_id);

-- Policy: Users can view messages from their own chats
CREATE POLICY "Users can view messages from their own chats"
  ON t_chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM t_chats
      WHERE t_chats.id = t_chat_messages.chat_id
      AND (t_chats.user_id = auth.uid() OR auth.uid() = ANY(t_chats.shared_with_user_ids))
    )
  );

-- Policy: Users can insert messages into their own chats
CREATE POLICY "Users can insert messages into their own chats"
  ON t_chat_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM t_chats
      WHERE t_chats.id = t_chat_messages.chat_id
      AND t_chats.user_id = auth.uid()
    )
  );

-- Policy: Users can update messages in their own chats
CREATE POLICY "Users can update messages in their own chats"
  ON t_chat_messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM t_chats
      WHERE t_chats.id = t_chat_messages.chat_id
      AND t_chats.user_id = auth.uid()
    )
  );

-- Policy: Users can delete messages from their own chats
CREATE POLICY "Users can delete messages from their own chats"
  ON t_chat_messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM t_chats
      WHERE t_chats.id = t_chat_messages.chat_id
      AND t_chats.user_id = auth.uid()
    )
  );

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON t_chats TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON t_chat_messages TO authenticated;

-- Grant usage on sequences (for UUID generation)
GRANT USAGE ON SCHEMA public TO authenticated;

