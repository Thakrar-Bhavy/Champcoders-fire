# ChampCoder Fire

ChampCoder Fire is a Mini-Militia-inspired 2D multiplayer shooter that runs fully in the browser without traditional game servers. It uses WebRTC for peer‑to‑peer networking, so players connect directly and share state in real time.

## Core Workflow

1. **Home / Lobby**
   - Hosts configure their match by choosing a username, match duration (3/5/8 minutes), map, and avatar. Creating a room generates a random 6-character code that is auto-copied to the clipboard for easy sharing.
   - Guests enter a username, paste the room code, pick an avatar, and join directly through WebRTC signaling (via BroadcastChannel/local storage).

2. **Peer-to-Peer Networking**
   - The first player acts as host and shares match settings (duration, map, start time) with all joiners.
   - Player movement, health, damage events, bullets, and respawns are broadcast via data channels.
   - Voice chat rides the same peer connections: once microphone permission is granted, outgoing audio tracks are added to every connection and remote tracks are played through the browser.

3. **Gameplay Loop**
   - 60 FPS loop handles input, physics, collision, networking, and rendering.
   - WASD / arrows move, mouse aims, click shoots. Space/W/Up triggers the jetpack, draining fuel that regenerates while idle.
   - A dynamic scoreboard shows kills/deaths for the entire squad, popping up on eliminations; the match ends automatically once the timer expires and displays the winner.
   - Local deaths trigger a 3-second respawn delay for that player only; other players continue uninterrupted.

4. **Maps & Avatars**
   - The game ships with multiple themed arenas (Ember Arena, Frostbite Ridge, Neon Vault) defined in `config.js`. Each layout specifies platforms, walls, ceilings, spawn points, and color themes.
   - Players can choose from stylized avatars (Flame, Voltage, Wave Rider, etc.) which drive in-game gradients, accents, and emoji emblems so every character looks distinct.

5. **Touch & Accessibility**
   - Mobile controls (left/right, jetpack, shoot) appear automatically on touch devices or via a header toggle, allowing mobile players to jet and fire without a keyboard.
   - HUD elements display health, jetpack fuel, equipped weapon, ammo, ping, voice status, and match timer.

## File Overview

| File         | Purpose |
|--------------|---------|
| `index.html` | Hosts lobby, game, and overlay markup; loads all scripts. |
| `style.css`  | Provides modern UI/UX styling for lobby, HUD, scoreboard, and mobile controls. |
| `config.js`  | Defines shared metadata (maps, avatars, dimensions). |
| `physics.js` | Collision helpers for circle/rect detection, raycasts, etc. |
| `map.js`     | Renders maps based on `config.js`, manages spawn points and bounds. |
| `player.js`  | Player movement, jetpack logic, shooting, respawn, avatar rendering, and bullet definitions. |
| `game.js`    | Main engine loop (input, physics, networking, rendering, scoreboard, match timer). |
| `network.js` | Generic network utilities (ping, validation). |
| `webrtc.js`  | WebRTC manager: room creation/join, signaling, peer connections, data channels. |
| `audio.js`   | Microphone permission handling, voice toggle, remote audio playback. |
| `ui.js`      | UI interactions, screen switching, notifications, scoreboard updates. |

## Quick Start

1. Serve the project with a static file server (or open `index.html` directly).
2. Open the game in two browser tabs/windows.
3. In tab A, create a room (allow microphone access when prompted). Share the auto-copied code.
4. In tab B, join using the room code, pick an avatar, allow mic, and connect.
5. Play! Movement, shooting, jetpack, voice chat, and scoreboard updates all sync in real time. When the timer hits zero, the match ends and shows final standings.

## Notes & Tips

- Because WebRTC requires user gestures for audio, make sure to interact with the page before expecting voice playback.
- If peers appear out of sync, ensure both sides granted microphone/camera permissions (even though no camera is used) and that no corporate network restrictions block peer connections.
- Adding new maps or avatars only requires updating `config.js`; the UI and renderers automatically pick up the new entries.

