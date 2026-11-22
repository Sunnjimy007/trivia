# Typing rounds and questions in Notion

Instead of editing code or using the small editor in **Manage Rounds**, you can type your rounds, questions and
answers into Notion, like a spreadsheet. The game reads them from there.

## How it works

Two Notion databases live inside the **Questions** page (under *Projects / Trivia game*):

**Rounds** has one row per round:

| Column | What to type |
|---|---|
| Name | The round's name, for example *Aussie Sports* |
| Emoji | One emoji |
| Description | One line shown on the round intro screen |
| On | Tick it to put the round in the game |
| Order | Optional number. Lower numbers play first |
| Round ID | Leave blank for new rounds (see *Built-in rounds* below) |

**Question bank** has one row per question:

| Column | What to type |
|---|---|
| Question | The question |
| Round | Which round it belongs to (pick from the list) |
| A, B, C, D | The four answers |
| Correct | Pick A, B, C or D |
| Order | Optional number for the order inside the round, otherwise the order you typed them in |

A question that is not finished (a missing answer, no Correct picked, no Round) is **skipped**, not broken, so you
can type in the middle of a game night. **Manage Rounds → Read Notion now** lists what it skipped and why.

## One-time setup (three steps)

1. **Make an integration.** Go to <https://www.notion.so/profile/integrations>, choose *New integration*, keep the
   type *Internal*, and copy the *Internal Integration Secret*.
2. **Let it see your databases.** Open the **Questions** page in Notion, click **•••** (top right) →
   **Connections** → add your integration. The two databases inside it are then shared with it too.
3. **Tell the game.** On Railway, open the service's **Variables** and add:

   | Variable | Value |
   |---|---|
   | `NOTION_TOKEN` | the secret from step 1 |
   | `NOTION_ROUNDS_DB` | the id of the **Rounds** database |
   | `NOTION_QUESTIONS_DB` | the id of the **Question bank** database |

   The id is the 32 letters and numbers at the end of the database's address. Open the database as a full page,
   choose **Copy link**, and you can paste the whole link as the value: the game picks the id out of it.
   Locally, set the same three variables before starting the server.

The secret is a password: keep it in Railway only, never in the code or in chat.

## First time: copy what is already in the game

Open **Manage Rounds**. The Notion card at the top shows **Copy built-in rounds to Notion**. It creates a row in
Notion for every built-in round and question, with the same answers, and keeps each round switched on or off as it
is now. It takes a few minutes. Safe to run again: a round that is already in Notion is left alone, and if a copy
is interrupted the half-copied round is tidied away so the next run starts that round fresh.

Afterwards the Notion version **replaces** the built-in one (they share a **Round ID** such as `round3`), so you
edit it in Notion. Leave the Round ID alone on those rows. Delete a row in Notion and the built-in version comes
back.

## Day to day

* Type new rows in Notion and tick **On** on a round when it is ready.
* The game picks changes up by itself: when a host opens a lobby or the rounds list (at most once a minute), and
  every five minutes in the background. **Read Notion now** does it straight away.
* A game uses the rounds that were on when it **started**.
* In **Manage Rounds**, rounds that come from Notion are marked *Notion*. They are switched on and off with the
  **On** box in Notion, and edited with the **Edit in Notion** link. Built-in rounds you have not copied, and
  rounds made with the small editor, work as before.

## If something goes wrong

* **Notion is down or the token stops working:** the game keeps using the last copy it read (saved in the data
  folder as `notion-cache.json`), and **Manage Rounds** shows the error. Nothing breaks.
* **"Notion could not find a database":** the ids are wrong, or the integration is not connected to the Questions
  page (step 2).
* **A round is missing:** it has no finished questions yet, or no Name. **Read Notion now** says which.
* **To switch Notion off:** remove `NOTION_TOKEN`. The built-in and in-app rounds play as before.

## Limits

* The game only **reads** Notion, apart from the one-off copy above. It never edits or deletes your rows.
* The **speed factor** switch and the answer-order scoring live in the game, not in Notion.
