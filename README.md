# GuitarDex
A guitar practice tracking app that gamifies learning through a Pokemon-inspired leveling system. 
Track your progress on songs, earn XP through practice sessions, quickly tune between songs and practice songs from "learning", "refined" and "mastered".

## How to install on your phone

1. Visit [guitardex.vercel.app](https://guitardex.vercel.app/) on your phone 
2. Click share button
3. Click add to your home screen
4. Done! Enjoy the app :)

## Features

**Leveling System**
- Earn XP by logging practice sessions
- XP scales based on song difficulty, practice duration, song duration, your previous highest level, and streak bonuses
- Songs progress through statuses: Seen → Learning → Refined → Mastered

**Decay Mechanic**
- Songs decay if not practiced within grace periods
- Harder songs decay faster
- Not really meant to punish, more to keep it realisitc

**Practice Decks**
- Organize songs into custom playlists/decks
- Track average level and total duration per deck

**PWA Support**
- Installable on mobile devices
- Works fully offline
- All data stored locally in IndexedDB (browser cache)

## Tech Stack
- React 19
- React Router v7
- Framer Motion
- Vite
- IndexedDB for local storage
- PWA with Workbox

