# BRIEF: Amali's Trivia Game landing page

**Status: partly interviewed, partly self-authored.** The user answered four decisions
(scope, look, structure, visuals). Everything else below was authored from the product
itself and is labelled as such. Nothing here is invented about the product: every fact is
taken from the game's own code (`server/src/GameManager.ts`, `server/src/data/questions.ts`).

## The eight topics

1. **Vibe.** *Interviewed:* "Playful game-show". *Authored:* loud, bouncy, family game night,
   saturated colour on hard-cut grounds, chunky buttons with a darker bottom edge (the game's
   own button style). References (authored, from other media): a TV quiz show's scoreboard,
   a board-game box lid, a party-popper emoji sheet.
2. **Scroll journey.** *Authored:* pulse, two screens, four letters, the question, the
   points, the Game Master, the rounds, your own rounds, rejoin, home screen, then who's
   hosting. See the score table below.
3. **Energy curve.** *Authored:* loud open, one calm beat (four letters) as the silence
   before the peak, the peak, then a run of short bright cuts, ending abruptly on the ask.
4. **Feeling curve and the one moment.** See below.
5. **One thing no site does.** *Authored:* the page plays a real round of the game with you
   while you scroll, and the scoreboard in the header keeps real score.
6. **Range.** *Interviewed:* playful game-show (not premium-minimal).
7. **One world or distinct scenes.** *Interviewed:* distinct scenes.
8. **Assets.** *Interviewed:* no generated media. Built from type, colour, SVG/CSS, the
   game's own icon (`/icons/icon-192.png`) and its own answer colours and avatars. No
   ffmpeg, no image-generation key, so there are no scrub clips (and none are wanted).

*Scope (interviewed):* a scroll landing page in front of the game for browser visitors.
Host / Join buttons open the existing game. The installed phone app and anyone with a saved
game skip it. No game screen changes.

## Grammar: rhythmic cutlist

Short hard-cut sections at speed, every one on its own flat ground, a loud bar, an abrupt
close. **Why the other seven lost:**

- *Filmic one-shot:* needs a continuous camera film. No generated media, and it is the
  grammar the skill warns is the default drift.
- *Chaptered editorial:* paper and calm. The interview asked for loud and playful.
- *Live surface:* forbids marketing chrome and big headings. It is borrowed from, though:
  the peak is a real running surface with the game's real scoring rule, labelled as a sample.
- *Continuous world:* needs worldflight and generated video.
- *Typographic poster:* the game's mechanics (two devices, four answers, points) need to be
  shown, not only named.
- *Gallery:* the rounds are a range, but the page is not a collection of objects.
- *Split stage:* no two-sided argument here.

Bans honoured: no `pin`, no `dwell`, no `parallax`, no `spotlight`, no `magnet`, no section
over about 1.4 viewport-heights, no overlapping cue windows, no slow easing.
Hero depth (the standing preference) is delivered with four independent planes, occlusion
and pointer/idle motion, not scroll parallax, because this grammar bans parallax.

## The feeling curve (written before the acts)

| # | Feeling | What on screen causes it |
|---|---|---|
| 1 | Pulse | confetti planes and the four answer tiles, loud bar, the headline already on screen |
| 2 | Clarity | one big screen and a crowd of phones: "oh, that's how it works" |
| 3 | Ease (authored silence) | a quiet pale ground, four big letters, one field. Nothing competes |
| 4 | **Pressure (the peak)** | a question, a 30 second fuse, and the scoreboard dropping from the header with three players already racing |
| 5 | Reward | the points land: 500, 375, 250, 125, from the rule you just played |
| 6 | Mischief | the Game Master buttons: +100, or take 100 away, once |
| 7 | Abundance | seven round stamps tumbling in |
| 8 | Intimacy | "add your family's questions" |
| 9 | Relief | the phone drops out and comes straight back with the score intact |
| 10 | Ownership | the real icon on the home screen |
| 11 | Resolve | abrupt, full bleed: who's hosting? |

No two adjacent acts share a feeling. The ending resolves on the ask and holds.

## The peak

**Sentence a visitor would say to a friend:** "I hadn't even signed up and the scoreboard
dropped down from the top of the page and I was racing three other players for points on a
real question."

It lives in act 4. The silence before it is act 3 (pale ground, one idea). The peak gets
the most scroll room, the only timed mechanic, and the one chrome choreography that
outlives its act: the scoreboard stays in the header for the rest of the page and is still
there, with the visitor's score, at the close.

**Tell-someone sentence:** *It's the site where the scoreboard drops in and you race three
other players on a real trivia question before you've even signed up.*

## Signature move

**A live scoreboard in the header that keeps real game-show score while you scroll.** The
visitor answers one real question from the game; three sample players answer on a timer
(clearly labelled as a sample). Points follow the game's real rule: with 4 players, the
first correct answer earns 4 × 125, the next 3 × 125, and so on down to 125. The board
re-sorts live. Bespoke code in `welcome/landing.js`; the engine is untouched.

## Fingerprint gate

`scrollcraft/FINGERPRINTS.md` is empty, so there is nothing to differ from. This build adds
the first row: grammar *rhythmic cutlist*; nav *loud yellow bar carrying both CTAs, plus a
scoreboard strip that drops in*; hero *four independent planes (confetti far/mid, answer
tiles, confetti near) with pointer response, no media*; sequence *11 short flow cuts, no
pin, about 10 viewport-heights*; close *abrupt full-bleed ask, two equal buttons*; signature
move *header scoreboard racing sample players with the real scoring rule*.

## Score table (device per beat)

| Beat | Device | Why |
|---|---|---|
| 1 Pulse | layered hero, pointer + idle depth | the greet: headline readable on frame one |
| 2 Clarity | `in` stagger + counted real number (10 players) | simple fact, fast |
| 3 Ease | `reveal` wipe on the code tiles + a real input | the quiet before the peak |
| 4 Pressure | timed bespoke surface + header scoreboard | the peak |
| 5 Reward | bars grown from the real formula | payoff of 4 |
| 6 Mischief | bespoke buttons with the once-per-round rule | the game's own constraint, playable |
| 7 Abundance | `reveal` + staggered stamps | a range |
| 8 Intimacy | `reveal` left | slows down, personal |
| 9 Relief | timed state loop | the product's reassurance |
| 10 Ownership | `in` + the real icon | a small, true detail |
| 11 Resolve | static, full bleed | no spotlight, no magnet, no fade |

## Content rules for this page

- Only real figures: up to 10 players, 30 seconds per question, 7 built-in rounds, 125 point
  steps, plus or minus 100 once per player per round, 90 second host grace, 30 second lobby grace.
- No testimonials, no invented stats. The sample players and the sample room code are
  labelled as samples.
- One label per intent: **Host a game** and **Join a game**, everywhere.
- No em dash in visible copy.

## Not verified (read this before trusting the page)

- Headless harness (`shoot.mjs`): not run. It needs Playwright, Chrome and a full ffmpeg
  build, none installed here. Verification used the built-in browser pane instead.
- A real phone and a real phone browser.
- `prefers-reduced-motion` could only be checked by reading the CSS and forcing the paths.
