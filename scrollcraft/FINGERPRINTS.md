# Fingerprints

Every site you build with **scroll-craft** gets one row here, appended after it
ships. The registry exists so your next build can prove it is a different page
rather than a re-skin of one you already made.

This file is **yours**. It starts empty on purpose: the gate is about not
repeating *yourself*, so it has nothing to say until you have built something.

The rules and the gate live in the skill's
`references/uniqueness.md`. Short version:

**A new build must differ from EVERY row below on at least 4 of the 6
dimensions.** Four against each row individually, not four on average across the
table. If a planned build fails, change the plan. Never edit a row to make room
for it.

The six dimensions are: **grammar**, **nav treatment**, **hero device**,
**act-sequence shape**, **close pattern**, **signature move**.

Dimension 6 is free, because a signature move is unique by definition. So the
gate really asks for three more out of the remaining five, and a build that
changes only grammar and world will fail it.

---

## The registry

| Build | Grammar | Nav treatment | Hero device | Act-sequence shape | Close pattern | Signature move | World | Port |
|---|---|---|---|---|---|---|---|---|
| Amali's Trivia landing | Rhythmic cutlist | Loud yellow bar carrying both CTAs, plus a scoreboard strip that drops into it mid-page | Four independent planes (far and mid confetti, the game's answer tiles, near confetti and ribbons), pointer and idle depth, no media | 11 short flow cuts, no pin, flat hard-cut grounds, about 10.1 viewport-heights, peak scene 1.28vh | Abrupt full-bleed ask ("Who's hosting?"), two equal buttons, no spotlight or magnet | A header scoreboard that races three sample players on a real question using the game's real scoring rule | Playful game-show, flat saturated grounds, no generated media | static (client/public/welcome.html), dev port 4500 |


---

## What is taken

Add a bullet here whenever a build claims something a later build should avoid
reusing: a grammar, a nav treatment, a close pattern, a signature move, an
act-count-and-length band. The shared columns are what the next build inherits
as a constraint, so writing them down is the whole point.

- **Rhythmic cutlist** grammar, with its peak moved into the fixed chrome (a scoreboard strip in the header) because the grammar bans pin and dwell.
- **A live scoreboard that races sample players on a real question** as the signature move.
- **Act-count-and-length band:** 11 acts, about 10.1 viewport-heights, none over 1.3vh.
- **Shared with any later build:** the loud top bar with both CTAs at the same weight as the wordmark.

---

## Appending a row

After shipping, add one line to the table and one bullet to **What is taken** if
the build claimed something new. Fill every column. Say what the build shares
with existing rows.

Rows are append-only. A build that has been superseded stays in the table,
because the space it occupies is still occupied.

---

## Worked example

The skill's author kept a registry of twelve builds across eight page grammars.
If you want to see what a filled-in table looks like, and which shapes tend to
collide, read `EXAMPLES.md` in the scroll-craft repository. Treat it as
illustration only: those rows are somebody else's builds and they do **not**
constrain yours.
