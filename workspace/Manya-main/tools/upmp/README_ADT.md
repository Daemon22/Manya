# UPMP-ADT — Active Device Tracker

**UPMP-ADT** (Universal Progress Monitoring — Active Device Tracker) is the
evolution of UPMP into a personal activity & intelligence tracker that runs on
your device. It captures writing sessions with stuck-point detection, logs
discoveries you make while scrolling, and exports discussion-ready artifacts
you can paste into an AI chat for collaborative reflection.

It ships in two complementary programs:

- **`upmp_adt.py`** — the active tracker (sessions, stuck points, discoveries, quality)
- **`silent_watcher.py`** — a passive ambient watcher that observes device context (active window, optional transcription) and answers when you ask. Writes nothing to disk. Promotable to active mode on demand.

## What it tracks

1. **Writing/activity sessions** — start, pause, resume, end (with full event log)
2. **Stuck points** — exact moment + context + intelligence engaged + resolution
3. **Discoveries** — posts, images, snippets, links you find while scrolling
4. **Intelligence engagement** — Gardner's 9 intelligences + your own custom ones
5. **Activity state** — full UPMP 15-layer monitoring on each session

## Quick start

```bash
# First-time setup (creates ~/.upmp_adt/state.json)
python upmp_adt.py init

# Start a writing session
python upmp_adt.py start writing -i linguistic -c "blog post on X" \
    --intent "Write 500 words" \
    --goal "Outline" --goal "Intro" --goal "Body" --goal "Conclusion"

# Add notes as you work
python upmp_adt.py note "Outline: intro -> body -> conclusion"

# Mark when you get stuck
python upmp_adt.py stuck "Can't figure out the hook"

# Pause to scroll, capture a discovery
python upmp_adt.py pause "scrolling for inspiration"
python upmp_adt.py discover post \
    --url "https://example.com/article" \
    --note "Great technique for transitions" \
    -i linguistic \
    -q "How can I apply this?" \
    -q "Is this appropriate for technical posts?" \
    --tag writing --tag craft

# Resume and mark unstuck
python upmp_adt.py resume
python upmp_adt.py unstuck --strategy "Used the technique from the post"

# End session — generates UPMP 15-layer report
python upmp_adt.py end "Draft complete"

# Check status
python upmp_adt.py status

# See recent timeline
python upmp_adt.py timeline --hours 24

# Export a discussion artifact for AI review
python upmp_adt.py discuss --hours 24
# -> ~/.upmp_adt/discussions/discussion_YYYYMMDD_HHMMSS.{json,md}

# Run the built-in demo
python upmp_adt.py demo
```

## Silent Watcher (`silent_watcher.py`)

A **passive, zero-persistence ambient watcher**. It observes what's happening on your device (active app + window title, optionally transcription) and answers when you ask. Writes nothing to disk by default. When you need help, you promote it; when you're done, you recess it.

```bash
# Start the watcher in the background (silent mode)
python silent_watcher.py start

# Check it's running
python silent_watcher.py status

# Ask what you're doing right now
python silent_watcher.py query "what am I doing?"

# Ask for a recent-activity breakdown
python silent_watcher.py query "what have I been doing recently?"

# Promote to ACTIVE mode — watcher may now contact other intelligences/agents
python silent_watcher.py promote "I'm stuck writing the docs section, need suggestions"

# Return to silent observation
python silent_watcher.py recess

# Stop the daemon (buffer is lost — that's the point)
python silent_watcher.py stop
```

**Design principles:**
1. **Silent by default** — writes nothing to disk. The rolling buffer (default 300 observations, ~10 min at 2s poll) lives in RAM only.
2. **Observes, doesn't judge** — no logging, no stuck detection, no quality scoring. Just "you are in `<app>` doing `<thing>`."
3. **On-demand answers** — `query` returns a plain-language summary from the in-memory buffer.
4. **Promotable** — `promote <reason>` elevates the watcher to active mode, where it may dispatch to UPMP-ADT, an LLM agent, or other intelligences. `recess` returns it to silent observation.
5. **Local only** — no network calls.

**Window detection (cross-platform):**
- Linux X11: `python-xlib` (recommended) — `pip install python-xlib`
- Linux GNOME: `gdbus` fallback (no extra deps)
- Linux Wayland: not directly supported (use `--mock` for testing, or wire up a portal-based detector)
- macOS: `pyobjc-core` + `pyobjc-framework-Quartz`
- Windows: `pywin32` (+ `psutil` for process names)
- Mock mode: `--mock` simulates activity for testing on headless boxes

**Optional transcription hook:**
```bash
python silent_watcher.py start --transcribe-cmd "tail -1 /tmp/whisper-out.txt"
```
The command should output a single line — the latest transcription. Polled every cycle. Disabled by default (privacy-sensitive).

**Customizing what `promote` does:** edit `_cmd_promote` in `silent_watcher.py` to dispatch to your own agent pipeline (UPMP-ADT's `start`/`stuck` commands, an LLM call, an MCP tool, etc.). The default implementation records the reason and prints guidance — it doesn't actually call external agents, by design.

**IPC architecture:** Unix domain socket at `~/.upmp_adt/watcher.sock`. The CLI subcommands connect, send one JSON line, read one JSON line back, disconnect. No long-lived connections.

**Files written by the watcher:**
- `~/.upmp_adt/watcher.sock` — IPC socket (cleaned up on stop)
- `~/.upmp_adt/watcher.pid` — pid file for `is_running()` checks (cleaned up on stop)

That's it. **No observation data is ever written to disk.**

## Advanced commands (v2.1)

### Live monitor
```bash
# Real-time TUI in your terminal. Refreshes every 5s. Ctrl+C to exit.
# Auto-detects approaching stuck thresholds based on time since last event.
python upmp_adt.py watch

# Custom refresh interval
python upmp_adt.py watch --refresh 2
```

### Pattern analysis
```bash
# Analyze patterns across the last 7 days (default)
python upmp_adt.py analyze

# Last 24 hours
python upmp_adt.py analyze --hours 24
```

Reports:
- Totals (sessions, stuck points, breakthroughs, discoveries, active time)
- Per-intelligence breakdown (sessions, stuck, breakthroughs, conversion rate)
- Stuck keyword themes (recurring words across your stuck descriptions)
- Peak activity hours
- 7-day trend (recent vs previous week)
- Recommendations (auto-generated based on your patterns)

### HTML dashboard
```bash
# Generate a self-contained HTML dashboard
python upmp_adt.py dashboard

# Custom lookback window
python upmp_adt.py dashboard --hours 48

# Save to a specific path
python upmp_adt.py dashboard --output ~/Desktop/my_dashboard.html
```

The dashboard is a single self-contained HTML file (no external dependencies, no JS, no network calls) with:
- Summary cards (sessions, stuck points, discoveries, 7-day trend)
- Intelligence engagement radar chart (inline SVG)
- Activity-by-hour bar chart (inline SVG)
- Intelligence breakdown table
- Recent sessions table with quality badges
- Stuck points list with resolution status
- Stuck theme keyword chips
- Discovery cards grid
- Auto-generated recommendations

Open it in any browser. To discuss with me: take a screenshot of the dashboard, or copy specific sections into our chat.

### Auto intelligence progression
After every session ends, UPMP-ADT automatically nudges the intelligence's aggregate progress based on:
- Session quality score (from UPMP 15-layer report)
- Health score
- Stuck→breakthrough resolution ratio
- Unresolved-stuck penalty
- Active time (short sessions scaled down)

No manual `intelligence --progress` needed — it grows organically from your actual work.

### Intelligence quality assessment (v2.2)
Beyond raw "progress %", UPMP-ADT now scores each intelligence across **six dimensions** that capture *how well* it's being developed, not just how often:

| Dimension | What it measures |
|---|---|
| **Depth** | Breakthrough density (breakthroughs per stuck point) |
| **Breadth** | Activity variety (distinct activity types + cross-intel signals) |
| **Retention** | Recency-decayed engagement (14-day half-life) |
| **Application** | Discoveries linked to stuck points (not idle captures) |
| **Refinement** | Stage progression velocity (stage-ups over time) |
| **Consistency** | Engagement regularity (distinct days + low gap variance) |

Each dimension is scored 0–100 and weighted into an overall composite (A–F grade). Trends are computed from snapshot history: `improving / stable / declining / new`.

**Quality signals** are auto-captured as you work:
- `breakthrough` → +depth (when stuck resolved as breakthrough)
- `discovery_used` → +application (when a discovery is linked to a stuck)
- `focus_run` → +consistency (long focused session, low stuck density)
- `stage_up` → +refinement (intelligence stage advanced)
- `cross_intel` → +breadth (back-to-back sessions on different intelligences)
- `return_visit` → +retention (re-engaged after a 7+ day gap)
- `stuck_deepened` → -depth (unresolved stuck at session end — penalty)

```bash
# Overview: all active intelligences with 6 dimensions + overall + trend + target
python upmp_adt.py quality

# Detailed view for one intelligence: dimension bars, recent signals, history sparkline, recommendations
python upmp_adt.py quality linguistic

# Set a target quality and see the gap
python upmp_adt.py quality linguistic --target 80
```

The `discuss` export now includes a **Quality Assessment** section (markdown table + per-intelligence recommendations for the weakest intelligences), and the `watch` live monitor surfaces a real-time quality panel for the active intelligence.

**Linking discoveries to stuck points** (now even more valuable — adds an APPLICATION quality signal):
```bash
python upmp_adt.py stuck "intro feels flat"
python upmp_adt.py discover post --url "..." --note "..." --related-stuck latest
# 'latest' resolves to the most recent unresolved stuck in the current session
```

### Discovery-stuck linking
When you mark a stuck point as resolved, UPMP-ADT suggests discoveries captured during the stuck-point window that may have informed the resolution:

```
$ python upmp_adt.py unstuck --strategy "used the hook technique"
Stuck point resolved: ec283e27
  Strategy   : used the hook technique
  Resolution : breakthrough

  Discoveries captured during this stuck-point window:
    - [post] good hook technique
      captured 14:32  ★ explicitly linked
```

To explicitly link a discovery to a stuck point at capture time:
```bash
python upmp_adt.py discover post --url "..." --note "..." --related-stuck <stuck_id>
# or use 'latest' to link to the most recent unresolved stuck
python upmp_adt.py discover post --url "..." --note "..." --related-stuck latest
```

## The discussion workflow

1. Work on something — write, code, design
2. When you get stuck, log it: `python upmp_adt.py stuck "..."`
3. When you find something interesting while scrolling: `python upmp_adt.py discover ...`
4. End your session: `python upmp_adt.py end`
5. Export: `python upmp_adt.py discuss --hours 24`
6. Open the generated `.md` file, paste its contents into our chat
7. We discuss your stuck points, discoveries, and intelligence engagement together

## Intelligence model

9 default intelligences (Howard Gardner's 8 + existential):

| Key                  | Name                     | Engaged by                                |
|----------------------|--------------------------|-------------------------------------------|
| `linguistic`         | Linguistic               | writing, reading, wordplay                |
| `logical_math`       | Logical-Mathematical     | coding, math, planning, debugging         |
| `spatial`            | Spatial                  | design, drawing, diagrams, photography    |
| `bodily_kinesthetic` | Bodily-Kinesthetic       | sports, dance, craft, cooking             |
| `musical`            | Musical                  | music, podcasts, rhythm, composition      |
| `interpersonal`      | Interpersonal            | conversations, teaching, negotiation      |
| `intrapersonal`      | Intrapersonal            | journaling, meditation, self-analysis     |
| `naturalist`         | Naturalist               | gardening, hiking, taxonomy, observation  |
| `existential`        | Existential              | philosophy, purpose-work, spirituality    |

Add your own:
```bash
python upmp_adt.py intelligence --add creative_writing \
    --name "Creative Writing" \
    --description "Fiction, poetry, narrative craft" \
    --engaged-by "fiction,poetry,storytelling,narrative"
```

## Privacy

**100% local.** No network calls. No telemetry. Your data lives in
`~/.upmp_adt/` and never leaves your machine unless you explicitly export
a discussion artifact and choose to share it.

## Files

- `upmp_adt.py` — Single-file tracker (run this)
- `upmp.py` — Original UPMP single-file (the foundation, preserved)
- `multi_file_package/` — Original multi-file UPMP package (for reference)
- `test_88x8_results.json` — Sample UPMP test output
- `visualizations/` — Sample UPMP visualizations
- `UPMP_Report.pdf` — Framework report
- `UPMP_Framework_Documentation.pdf` — Full documentation

## Python compatibility

Python 3.8+. No third-party dependencies — standard library only.

## The 15 UPMP layers (preserved in UPMP-ADT)

1. Intent Model
2. State Representation
3. Desired State Representation
4. Goal Distance Metric
5. Progress Score
6. Trajectory Quality
7. Intent Preservation
8. Context Preservation
9. Growth Velocity
10. Acceleration
11. State Health
12. Drift Detection
13. Future Projection
14. Quality Assessment
15. Intervention Engine

Plus 4 independent dimensions on every report:
- **Progress** — how far along the path
- **State Health** — current condition
- **Intent Preservation** — original goal intact
- **Quality** — how good the progress is
