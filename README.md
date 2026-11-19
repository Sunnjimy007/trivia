# Amali's Trivia Game

A real-time multiplayer trivia game in the style of Kahoot. One person hosts as the **Game Master** on a big
screen; up to 10 players join on their own phones with a 4-letter room code and race to answer.

- **Client:** React 18 + Vite + Tailwind (`client/`)
- **Server:** Node + Express + Socket.io, in TypeScript (`server/`)
- One npm-workspaces repo. In production the server also serves the built client, so it runs as a single service.

## How a game works

1. The host opens the app, taps **Host a Game** and gets a room code. Players tap **Join a Game** and enter it.
   The host doesn't play; they run the game.
2. The host starts the game. It runs through the enabled **rounds**, each with an intro, a set of
   multiple-choice questions (A to D) and a round summary.
3. Each question has a **30 second** timer, and ends early once every connected player has answered.
4. **Scoring** is by speed among the correct answers: with *n* players the first correct answer earns
   *n* × 125 points, the second (*n* − 1) × 125, and so on down to 125. Wrong answers earn nothing.
5. The host can give each player **one ±100 adjustment per round** (a bonus or a penalty, never below zero);
   players see a notification when it happens.
6. After the last round everyone sees the final scoreboard, and **Play Again** returns to the start.

### Rounds

Seven rounds are built in (`server/src/data/questions.ts`): General Knowledge, Australian Animals, Animals,
Countries, Sports, Geography and Diwali. In the host lobby, **Add / Manage Rounds** lets you switch rounds on
and off, and create, edit, duplicate and delete your own. Only enabled rounds are played, and a game keeps the
rounds it started with even if you change them mid-game.

### If someone refreshes or loses connection

Nobody is thrown out of a game by a page refresh or a patchy connection. Each browser gets a secret token when it
joins and uses it to take its old seat back, in the same phase, with its score and answer intact.

- A **player** who drops mid-game stays on the scoreboard, and the game stops waiting for them. In the lobby they
  are removed after 30 seconds if they don't return.
- If the **host** drops, players see a "host lost connection" banner and the room stays open for 90 seconds.
- If a game no longer exists (it ended, or the server restarted), the browser returns to the start screen.

## The landing page

First-time visitors in a normal browser tab see a scroll-driven landing page (`client/public/welcome.html`
and `client/public/welcome/`) before the game. It is plain static HTML, CSS and JS, separate from the React app,
so it can be edited without rebuilding anything but the client.

- A small script at the top of `client/index.html` sends visitors to `/welcome.html` unless they are in the
  installed app, already have a saved game, or arrived from the landing page itself.
- Its buttons open the game directly: `/?play=host` (host form), `/?play=join` (join) and
  `/?play=join&code=abcd` (join, with the room code already filled in).
- One section is a playable round: a real question from the game raced against three clearly labelled sample
  players, using the game's actual scoring rule. The scoreboard drops into the page header while it runs.
- The scroll effects come from the scroll-craft engine (`welcome/scrollcraft.js` and `.css`, unmodified). Everything
  page-specific is in `welcome/landing.js` and `welcome/landing.css`. The design brief is in
  `scrollcraft/builds/landing/BRIEF.md`.

## Running locally

You need Node.js 20 or newer (22+ to run the tests).

```bash
npm install
npm run dev
```

This starts the server on <http://localhost:3001> and the client on <http://localhost:5173> (Vite proxies
`/socket.io` and `/api` to the server). Open the client in one tab as the host and in other tabs or phones on the
same network as players.

To run it the way production does (one server serving the built client):

```bash
npm run build
npm start        # http://localhost:3001
```

## Configuration

All settings are environment variables and all are optional for local development.

| Variable | Where | What it does |
| --- | --- | --- |
| `PORT` | server | Port to listen on. Defaults to `3001`. Railway sets this for you. |
| `CORS_ORIGIN` | server | Comma-separated list of allowed browser origins. Only needed when the client is hosted on a different domain from the server (for example Vercel). Defaults to the local Vite ports. |
| `VITE_SOCKET_URL` | client, at build time | Full URL of the server (for example `https://your-app.up.railway.app`). Leave empty when the server serves the client itself. |
| `ADMIN_PASSWORD` | server | If set, changing rounds and opening a round's full data (which includes the answers) require this password; **Manage Rounds** asks for it. If unset, the rounds API is open and the server logs a warning at startup. **Set this in production.** |
| `DATA_DIR` | server | Folder where `custom-rounds.json` is saved (custom rounds and which rounds are switched on). Defaults to the `server/` folder. **Point it at persistent storage in production**, otherwise your changes are lost on every deploy. |

## Deploying to Railway

`railway.json` tells Railway to build with `npm install && npm run build` and start with `npm run start`.

1. Create the service from this repo and give it a public domain.
2. Add a **volume** to the service, mounted at `/data`, and set `DATA_DIR=/data`. Without this, custom rounds and
   round on/off settings reset whenever the service is redeployed.
3. Set `ADMIN_PASSWORD` to a password of your choice.
4. If the client is on a separate host, set `VITE_SOCKET_URL` for the client build and `CORS_ORIGIN` on the server.

Game rooms live in the server's memory, so a deploy or restart ends any game in progress. Deploy between games.

## How it fits together

```
client/src
  context/GameContext.tsx   socket connection, app state, saved seat for rejoining
  pages/                    Home, HostLobby, HostGame, PlayerJoin, PlayerLobby, PlayerGame, RoundsManager
  components/               Timer, Scoreboard, Confetti, ConnectionBanner
server/src
  index.ts                  Express routes (rounds API) + Socket.io event handlers
  GameManager.ts            all game rules and state: rooms, phases, scoring, reconnection
  data/questions.ts         the built-in rounds
  data/customRoundsStore.ts custom rounds + on/off settings, saved to DATA_DIR
server/test                 automated tests
```

**Rounds API** (`/api/rounds`): `GET` the list is public and has no questions. Everything else, including
`GET /api/rounds/:id`, needs the `x-admin-password` header when `ADMIN_PASSWORD` is set.

**Socket events**

| Client sends | Meaning |
| --- | --- |
| `create-game`, `join-game` | Start a room / join one. The reply carries this browser's private rejoin token. |
| `rejoin-game` | Take your seat back with `{ roomCode, token }`; replies `rejoin-success` with the full current state, or `rejoin-error`. |
| `start-game`, `advance` | Host only: start, then move through intro, questions, results and summaries. |
| `submit-answer` | Player picks an option. |
| `adjust-score` | Host gives a ±100 adjustment. |

The server announces `round-intro`, `question-started`, `answer-submitted`, `question-ended`, `round-summary`,
`game-over`, `score-adjusted`, `player-joined`, `player-disconnected`, `players-updated`, `host-connection` and
`host-disconnected` to the room.

## Tests

```bash
npm test
```

Runs with Node's built-in test runner (no extra tooling). The tests cover the game rules in `GameManager`
(scoring order, join rules, adjustments, disconnects, rejoining), saving rounds to disk, the rounds API with and
without the admin password, and a full create, join, play, drop and rejoin game over real sockets against the
real server.
