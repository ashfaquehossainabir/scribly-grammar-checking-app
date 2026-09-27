# Scribly — a Grammarly-style writing assistant

Full-stack app: **React (Vite) + Express + MongoDB**, with JWT auth and a
**fully self-contained, offline AI writing engine** no third-party APIs,
no API keys, no network calls of any kind at runtime.

## What's included
- Signup / login with hashed passwords (bcrypt) + JWT sessions
- Protected routes (dashboard & editor require login)
- Document CRUD (create, list, edit, autosave, delete) stored per-user in MongoDB
- Debounced document search on the dashboard (title + content, server-side)
- **A four-engine AI writing analyzer, built entirely from scratch** — see below
- Sentence-level rewrite suggestions: tone variants (Formal / Confident /
  Friendly) and a tightened "Improved" rewrite for wordy or cluttered sentences
- Inline squiggly-underline highlighting (color-coded per category) + a
  category-tabbed suggestions sidebar (Correctness / Clarity / Engagement /
  Delivery — including the rewrite suggestions above) with one-click
  "Accept" / "Use this" / "Dismiss"
- A score breakdown (overall + per-category), a tone badge, and readability
  stats (Flesch score, grade level, avg. sentence length)
- Fully responsive UI (mobile, tablet, laptop, desktop), premium look with
  Tailwind CSS

## The AI engine — 100% offline, zero third-party APIs
`backend/utils/aiEngine.js` orchestrates four detectors, all running
in-process with no external calls:

| Category | What it catches | How |
|---|---|---|
| **Correctness** | Spelling + grammar | Local ~188,000-word dictionary + a hand-written edit-distance corrector + hand-written grammar rules |
| **Clarity** | Passive voice, wordy/redundant phrases, run-on sentences | Pattern rules (`textAnalysis.js`) |
| **Engagement** | Overused filler words, flat/weak vocabulary (with richer-word suggestions) | Lexicon rules (`textAnalysis.js`) |
| **Delivery** | Hedging language, ALL-CAPS "shouting", exclamation-point overuse, overall tone badge | Lexicon rules (`textAnalysis.js` + `toneAnalyzer.js`) |

On top of those four detectors, `backend/utils/rewriteEngine.js` generates
**sentence-level rewrite suggestions** — also 100% offline and rule-based:
- **Tone rewrites** — up to three variants per eligible sentence (Formal,
  Confident, Friendly), built from contraction expansion/contraction,
  hedge-phrase stripping, and a small formal/casual vocabulary swap.
  Surfaced under the **Delivery** tab.
- **Improved rewrites** — a single tightened version of a sentence, reusing
  the same wordy-phrase, filler-word, and weak-vocabulary rules as the
  Clarity/Engagement detectors. Surfaced under the **Clarity** tab.

These appear in the sidebar alongside the regular issues, with their own
card showing the original sentence and a "Use this" button per option — but
are kept out of the inline document highlighting (their spans are whole
sentences, which would otherwise blot out the more precise word-level
underlines).

### How Correctness works (the from-scratch spell/grammar engine)

**Spelling** — a layered pipeline (`spellChecker.js`), each stage running
before falling through to the next:
1. **Common-misspellings lookup** (`commonMisspellings.js`) — an instant,
   curated map of ~240 of English's most frequent typos and closed-compound
   errors (`recieve`→`receive`, `definately`→`definitely`, `alot`→`a lot`,
   `goverment`→`government`, etc.). Real typos cluster heavily around a
   known set of words, so a direct lookup beats a generic algorithm here.
2. **Compound-word splitting** — if a word isn't recognized but splits
   cleanly into two real dictionary words ("goodmorning" → "good morning"),
   that split is offered.
3. **Edit-distance correction** — a from-scratch implementation of the
   classic corrector: generates every 1-edit (then 2-edit, if needed)
   variant of the word — deletions, transpositions, replacements,
   insertions — and keeps whichever are real dictionary words
   (`dictionary.js`, ~188,000 words expanded from the open-source hunspell
   `en_US` base dictionary + its own affix rules, bundled locally).
   Candidates are then ranked with:
   - a **QWERTY-keyboard-adjacency model** — a substitution where the
     mistyped letter is physically next to the correct one on a real
     keyboard (the single most common typo pattern) ranks far higher than
     an arbitrary same-distance alternative;
   - a **frequency signal** (`commonWords.js`) — since the dictionary
     carries no usage data, a curated list of ~500 everyday English words
     (plus a smaller ~100-word "hyper common" tier for words like "the")
     nudges genuinely common words ahead of obscure dictionary entries
     when nothing else distinguishes them.

**Grammar** — a large, hand-written rule set (`grammarChecker.js`):
- Missing-apostrophe contractions (`dont`→`don't`, `youre`→`you're`, ~35 forms)
- a/an misuse, including silent-h and consonant-sounding-u exceptions
  (`an hour`, `a university`)
- Subject-verb agreement on personal pronouns, covering be/do/have
  (`he are`→`he is`, `they has`→`they have`, `I has`→`I have`)
- **Commonly confused words**, each scoped to a specific safe context so
  it catches the real error without flagging correct usage elsewhere:
  their/there/they're, your/you're, its/it's, then/than, to/too,
  whose/who's, weather/whether (plus the rare-real-word trap "wether"),
  loose/lose, "could/should/would/might/must of"→"...have", affect/effect
- Double comparatives/superlatives (`more better`→`better`, `most best`→`best`)
- Countable vs. uncountable noun mismatches (`much friends`→`many friends`,
  `less problems`→`fewer problems`, `many information`→`much information`)
- Double negatives, repeated words, capitalization (sentence-start, the
  pronoun "I"), and spacing/punctuation slips

Readability (`computeReadability`) and tone (`analyzeTone`) are computed
independently and shown in the sidebar, alongside a live per-category score
breakdown so you can see exactly where your writing loses points.

### Honest limitations of the from-scratch engine
- No trained ML model means no deep semantic understanding — it won't
  catch subtle meaning errors, unclear referents, or judge whether a
  sentence actually makes sense the way a language model or a human
  editor would.
- Spelling-suggestion ranking now uses keyboard-adjacency and a curated
  frequency list, so common typos rank correctly far more often — but
  without a real usage-frequency corpus behind the whole dictionary, some
  ambiguous cases can still surface a less-likely word first.
- Confused-word, subject-verb agreement, and comparative/countable checks
  are pattern-based and deliberately scoped to safe, high-confidence
  contexts, so they cover the common cases, not every construction —
  and won't catch confusions with no distinguishing context clue.
- Grammarly's real production system is proprietary and trained on
  massive private datasets — this reproduces the *product experience and
  category structure* (Correctness/Clarity/Engagement/Delivery, live
  scoring, a tone badge), not their model.

## Project structure
```
grammarly-clone/
  backend/
    data/wordlist.txt        offline dictionary (~188k words)
    utils/
      dictionary.js          loads the wordlist into memory
      commonMisspellings.js  ~240 curated common-typo corrections
      commonWords.js         frequency signal for suggestion ranking
      spellChecker.js        layered spelling-correction pipeline
      grammarChecker.js      from-scratch grammar rules + spelling (Correctness)
      textAnalysis.js        Clarity + Engagement + Delivery rules, readability
      toneAnalyzer.js        tone badge
      rewriteEngine.js       sentence-level tone & "improved" rewrite suggestions
      aiEngine.js            orchestrates everything into one analysis
    routes/, models/, middleware/, config/, server.js
  frontend/                  React (Vite) app
```

## Setup

### 1. Backend
```bash
cd backend
npm install
cp .env.example .env
# edit .env: set MONGO_URI (local Mongo or MongoDB Atlas) and a real JWT_SECRET
npm run dev        # starts on http://localhost:5000
```
You need MongoDB running locally (`mongod`) or a MongoDB Atlas connection
string in `MONGO_URI`. Nothing else to configure — no API keys required.

### 2. Frontend
```bash
cd frontend
npm install
npm run dev        # starts on http://localhost:5173
```
The Vite dev server proxies `/api` to `http://localhost:5000`, so just open
http://localhost:5173.

### 3. Try it
1. Sign up for an account
2. Create a new document
3. Start typing — suggestions appear in the right-hand sidebar and as
   wavy underlines in the text, color-coded by category (red = correctness,
   purple = clarity, orange = engagement, teal = delivery)
4. Use the tabs above the editor to filter suggestions by category
5. Click a suggested replacement to accept it, or "Dismiss" to ignore it
6. Check the sidebar for your overall + per-category score, tone badge,
   and readability stats
7. Your document autosaves as you type

## Deploying
- Backend: any Node host (Render, Railway, Fly.io, a VPS) + MongoDB Atlas.
  Set `CLIENT_ORIGIN` to your deployed frontend URL for CORS.
- Frontend: `npm run build` in `frontend/`, deploy the `dist/` folder
  (Vercel, Netlify, or serve it from Express as static files). Point its
  API calls at your deployed backend URL (edit `vite.config.js` proxy or
  set an axios `baseURL` env var for production).

## Extending the dictionary or rules
- To add more words: append lowercase words (one per line) to
  `backend/data/wordlist.txt` — it's loaded fresh on every server start.
- To add a common typo fix: add a `typo: "correction"` entry to
  `backend/utils/commonMisspellings.js`.
- To improve suggestion ranking for a word you find under-ranked: add it
  to `backend/utils/commonWords.js`.
- To add a new grammar rule: add a pattern + message to the rule arrays in
  `grammarChecker.js` (Correctness — including `CONFUSED_WORD_RULES` for
  new commonly-confused-word pairs) or `textAnalysis.js` (Clarity/
  Engagement/Delivery). Every rule follows the same shape: a regex, an
  offset/length so the frontend can underline the exact span, and a
  message with optional replacement suggestions.
