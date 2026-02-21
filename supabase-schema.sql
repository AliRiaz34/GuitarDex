-- GuitarDex Supabase Schema
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==================
-- SONGS TABLE
-- ==================
CREATE TABLE public.songs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  song_duration NUMERIC,
  difficulty TEXT NOT NULL DEFAULT 'normal'
    CHECK (difficulty IN ('easy', 'normal', 'hard')),
  tuning TEXT[] NOT NULL DEFAULT ARRAY['E','A','D','G','B','E'],
  capo INTEGER NOT NULL DEFAULT 0,
  lyrics TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'seen'
    CHECK (status IN ('seen', 'learning', 'stale', 'refined', 'mastered')),
  level INTEGER,
  xp NUMERIC DEFAULT 0,
  highest_level_reached INTEGER,
  practice_streak INTEGER,
  last_practice_date TIMESTAMPTZ,
  last_decay_date TIMESTAMPTZ,
  add_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_songs_user_id ON public.songs(user_id);
CREATE INDEX idx_songs_user_status ON public.songs(user_id, status);
CREATE INDEX idx_songs_updated_at ON public.songs(user_id, updated_at);

-- ==================
-- PRACTICES TABLE
-- ==================
CREATE TABLE public.practices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  min_played NUMERIC NOT NULL,
  xp_gain NUMERIC,
  practice_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_practices_user_id ON public.practices(user_id);
CREATE INDEX idx_practices_song_id ON public.practices(song_id);
CREATE INDEX idx_practices_updated_at ON public.practices(user_id, updated_at);

-- ==================
-- DECKS TABLE
-- ==================
CREATE TABLE public.decks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  level INTEGER,
  total_duration NUMERIC NOT NULL DEFAULT 0,
  creation_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_decks_user_id ON public.decks(user_id);
CREATE INDEX idx_decks_updated_at ON public.decks(user_id, updated_at);

-- ==================
-- DECK_SONGS TABLE (junction)
-- ==================
CREATE TABLE public.deck_songs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deck_id UUID NOT NULL REFERENCES public.decks(id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  sort_order NUMERIC NOT NULL DEFAULT 0,
  added_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(deck_id, song_id)
);

CREATE INDEX idx_deck_songs_deck_id ON public.deck_songs(deck_id);
CREATE INDEX idx_deck_songs_song_id ON public.deck_songs(song_id);
CREATE INDEX idx_deck_songs_updated_at ON public.deck_songs(user_id, updated_at);

-- ==================
-- AUTO-UPDATE updated_at TRIGGER
-- ==================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER songs_updated_at BEFORE UPDATE ON public.songs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER practices_updated_at BEFORE UPDATE ON public.practices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER decks_updated_at BEFORE UPDATE ON public.decks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER deck_songs_updated_at BEFORE UPDATE ON public.deck_songs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================
-- ROW LEVEL SECURITY (RLS)
-- ==================
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deck_songs ENABLE ROW LEVEL SECURITY;

-- Songs RLS
CREATE POLICY "Users can view own songs" ON public.songs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own songs" ON public.songs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own songs" ON public.songs
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own songs" ON public.songs
  FOR DELETE USING (auth.uid() = user_id);

-- Practices RLS
CREATE POLICY "Users can view own practices" ON public.practices
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own practices" ON public.practices
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own practices" ON public.practices
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own practices" ON public.practices
  FOR DELETE USING (auth.uid() = user_id);

-- Decks RLS
CREATE POLICY "Users can view own decks" ON public.decks
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own decks" ON public.decks
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own decks" ON public.decks
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own decks" ON public.decks
  FOR DELETE USING (auth.uid() = user_id);

-- Deck Songs RLS
CREATE POLICY "Users can view own deck_songs" ON public.deck_songs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own deck_songs" ON public.deck_songs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own deck_songs" ON public.deck_songs
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own deck_songs" ON public.deck_songs
  FOR DELETE USING (auth.uid() = user_id);
