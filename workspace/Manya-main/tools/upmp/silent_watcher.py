#!/usr/bin/env python3
"""
================================================================================
SILENT WATCHER  -  UPMP-ADT ambient observer
================================================================================

A passive, zero-persistence watcher that observes what's happening on your
device (active window/app, optionally transcription) and answers when you ask.

DESIGN PRINCIPLES
-----------------
  1. SILENT BY DEFAULT     — writes nothing to disk. The rolling context
                             buffer lives in RAM only. When the daemon exits,
                             the buffer is gone.
  2. OBSERVES, DOESN'T JUDGE — no logging, no stuck detection, no quality
                             scoring. Just "you are in <app> doing <thing>."
  3. ON-DEMAND ANSWERS     — when you query it ("what am I doing?"), the
                             watcher answers in plain language from the
                             in-memory buffer.
  4. PROMOTABLE            — `promote` elevates the watcher to active mode,
                             where it may contact other intelligences or
                             agents (via UPMP-ADT or external tools) to act.
                             `recess` returns it to silent observation.
  5. LOCAL ONLY            — no network calls. Window detection is via OS
                             APIs (X11 / Quartz / Win32). Optional transcription
                             hook is a stub you fill in.

ARCHITECTURE
------------
  silent_watcher.py start                 → launches daemon, opens IPC socket
  silent_watcher.py status                → "is the watcher running?"
  silent_watcher.py query [natural lang]  → ask the watcher what's happening
  silent_watcher.py promote [reason]      → elevate to active mode
  silent_watcher.py recess                → return to silent mode
  silent_watcher.py stop                  → stop the daemon

  Daemon: polls active window every `poll_interval` seconds (default 2s),
  keeps a rolling buffer of the last `buffer_size` observations (default 300,
  i.e. ~10 min at 2s poll). When queried, summarizes the recent context in
  natural language.

IPC
---
  Unix domain socket at ~/.upmp_adt/watcher.sock (or named pipe on Windows).
  Clients (the CLI subcommands) connect, send a single JSON line, read a
  single JSON line back, disconnect.

CROSS-PLATFORM WINDOW DETECTION
-------------------------------
  Linux X11:    python-xlib  (active window + window title)
  Linux GNOME:  gdbus call to org.gnome.Shell (fallback)
  Linux Wayland: not directly supported; falls back to "unknown" + warns
  macOS:        pyobjc Quartz (active app + window title)
  Windows:      win32gui.GetForegroundWindow + GetWindowText
  Mock mode:    --mock flag simulates activity (for testing on headless boxes)

OPTIONAL: TRANSCRIPTION HOOK
-----------------------------
  If you set --transcribe-cmd "whisper-stream /tmp/mic", the watcher will
  pipe the latest transcription line into the buffer every poll cycle.
  Not enabled by default — privacy.

PRIVACY
-------
  - No disk writes by default.
  - No network calls.
  - Buffer is RAM-only, capped, rolling.
  - When the daemon exits, the buffer is gone.
  - Query responses are printed to stdout only.

PYTHON 3.8+ / standard library + (optionally) python-xlib, pyobjc, pywin32
================================================================================
"""

from __future__ import annotations

import argparse
import json
import os
import signal
import socket
import sys
import threading
import time
from collections import deque
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


# ============================================================================
# CONSTANTS
# ============================================================================

VERSION = "1.0.0-watcher"

DEFAULT_STATE_DIR = Path.home() / ".upmp_adt"
DEFAULT_SOCKET_PATH = DEFAULT_STATE_DIR / "watcher.sock"
DEFAULT_PID_FILE = DEFAULT_STATE_DIR / "watcher.pid"
DEFAULT_POLL_INTERVAL = 2.0         # seconds between window polls
DEFAULT_BUFFER_SIZE = 300           # ~10 min at 2s polling
DEFAULT_SUMMARY_WINDOW = 60.0       # seconds to summarize on query

WATCHER_MODES = ("silent", "active")


# ============================================================================
# DATA MODEL (in-memory only)
# ============================================================================

@dataclass
class Observation:
    """A single point-in-time observation of device context."""
    timestamp: float
    app_name: str = ""           # e.g. "firefox", "code.exe", "ChatGPT"
    window_title: str = ""       # e.g. "upmp_adt.py - Code - z.my-project"
    workspace: str = ""          # optional virtual desktop / space name
    transcription: str = ""      # latest transcription line if enabled
    mode: str = "silent"         # watcher mode at observation time

    def to_dict(self) -> dict:
        return asdict(self)

    def brief(self) -> str:
        """One-line human-readable summary."""
        parts = [self.app_name or "(unknown app)"]
        if self.window_title:
            parts.append(f"«{self.window_title}»")
        if self.transcription:
            t = self.transcription[:80]
            parts.append(f"[transcript: {t}]")
        if self.mode == "active":
            parts.append("(active mode)")
        return " ".join(parts)


@dataclass
class WatcherState:
    """All in-memory watcher state. Never persisted."""
    started_at: float
    mode: str = "silent"                      # silent | active
    buffer: deque = field(default_factory=lambda: deque(maxlen=DEFAULT_BUFFER_SIZE))
    promote_reason: str = ""                  # last reason for promotion
    promoted_at: Optional[float] = None
    query_count: int = 0
    last_query_at: Optional[float] = None

    def latest(self) -> Optional[Observation]:
        return self.buffer[-1] if self.buffer else None

    def recent(self, seconds: float = DEFAULT_SUMMARY_WINDOW) -> List[Observation]:
        cutoff = time.time() - seconds
        return [o for o in self.buffer if o.timestamp >= cutoff]


# ============================================================================
# WINDOW DETECTORS — cross-platform
# ============================================================================

class WindowDetector:
    """Base class. Subclasses implement detect()."""

    name = "base"

    def detect(self) -> Tuple[str, str]:
        """Return (app_name, window_title). Empty strings if unknown."""
        return ("", "")

    @staticmethod
    def best_available(mock: bool = False) -> "WindowDetector":
        if mock:
            return MockWindowDetector()
        # Try platform-specific detectors in order of preference
        plat = sys.platform
        if plat.startswith("linux"):
            for cls in (X11WindowDetector, GnomeShellDetector):
                det = cls()
                if det.is_available():
                    return det
            return WaylandUnavailableDetector()
        if plat == "darwin":
            det = MacQuartzDetector()
            return det if det.is_available() else WindowDetector()
        if plat.startswith("win"):
            det = Win32Detector()
            return det if det.is_available() else WindowDetector()
        return WindowDetector()

    def is_available(self) -> bool:
        return False


class X11WindowDetector(WindowDetector):
    """Linux X11 via python-xlib."""
    name = "x11"

    def __init__(self) -> None:
        self._disp = None
        self._root = None
        self._NET_ACTIVE_WINDOW = None
        try:
            from Xlib.display import Display
            from Xlib import Xatom
            self._disp = Display()
            self._root = self._disp.screen().root
            self._NET_ACTIVE_WINDOW = self._disp.intern_atom("_NET_ACTIVE_WINDOW")
        except Exception:
            self._disp = None

    def is_available(self) -> bool:
        return self._disp is not None

    def detect(self) -> Tuple[str, str]:
        if not self._disp:
            return ("", "")
        try:
            # Read _NET_ACTIVE_WINDOW
            active = self._root.get_full_property(self._NET_ACTIVE_WINDOW, 0)
            if not active or not active.value:
                return ("", "")
            win_id = active.value[0]
            if win_id == 0:
                return ("", "")
            win = self._disp.create_resource_object("window", win_id)
            # Get WM_CLASS for app_name
            app_name = ""
            try:
                wm_class = win.get_wm_class()
                if wm_class and len(wm_class) >= 2:
                    app_name = wm_class[1] or wm_class[0] or ""
            except Exception:
                pass
            # Get _NET_WM_NAME or WM_NAME for window_title
            title = ""
            try:
                net_name_atom = self._disp.intern_atom("_NET_WM_NAME")
                prop = win.get_full_property(net_name_atom, 0)
                if prop and prop.value:
                    title = prop.value
            except Exception:
                pass
            if not title:
                try:
                    title = win.get_wm_name() or ""
                except Exception:
                    pass
            return (app_name, title)
        except Exception:
            return ("", "")


class GnomeShellDetector(WindowDetector):
    """Linux GNOME Shell via gdbus (fallback when Xlib can't see it)."""
    name = "gnome-shell"

    def is_available(self) -> bool:
        import shutil
        return shutil.which("gdbus") is not None

    def detect(self) -> Tuple[str, str]:
        import subprocess
        try:
            # Eval JS in GNOME Shell to get the active window
            js = (
                "global.get_window_actors().map(w => w.meta_window)."
                "filter(w => w.has_focus()).map(w => ({"
                "  app: w.wm_class, title: w.title"
                "}))[0]"
            )
            result = subprocess.run(
                ["gdbus", "call", "--session",
                 "--dest", "org.gnome.Shell",
                 "--object-path", "/org/gnome/Shell",
                 "--method", "org.gnome.Shell.Eval",
                 js],
                capture_output=True, text=True, timeout=2.0,
            )
            out = result.stdout.strip()
            # Output looks like: (true, '{"app": "firefox", "title": "..."}')
            if out.startswith("(true,"):
                payload = out[len("(true,"):].strip()
                # Strip surrounding quotes/parens
                payload = payload.rstrip(")")
                if payload.startswith("'") or payload.startswith('"'):
                    payload = payload[1:-1]
                payload = payload.replace("\\\"", "\"").replace("\\'", "'")
                obj = json.loads(payload)
                return (obj.get("app", ""), obj.get("title", ""))
        except Exception:
            pass
        return ("", "")


class WaylandUnavailableDetector(WindowDetector):
    """Wayland has no universal active-window API. Warns once."""
    name = "wayland-unavailable"

    def __init__(self) -> None:
        self._warned = False

    def is_available(self) -> bool:
        return True

    def detect(self) -> Tuple[str, str]:
        if not self._warned:
            sys.stderr.write(
                "[silent_watcher] Wayland session detected (or no X11/GNOME). "
                "Active-window detection not available. Use --mock for testing, "
                "or implement a portal-based detector.\n"
            )
            self._warned = True
        return ("", "")


class MacQuartzDetector(WindowDetector):
    """macOS via pyobjc Quartz."""
    name = "quartz"

    def __init__(self) -> None:
        try:
            import Quartz  # type: ignore
            self._q = Quartz
        except Exception:
            self._q = None

    def is_available(self) -> bool:
        return self._q is not None

    def detect(self) -> Tuple[str, str]:
        if not self._q:
            return ("", "")
        try:
            ws = self._q.CGWindowListCopyWindowInfo(
                self._q.kCGWindowListOptionOnScreenOnly,
                self._q.kCGNullWindowID,
            )
            for win in ws:
                owner = win.get("kCGWindowOwnerName", "")
                title = win.get("kCGWindowName", "")
                layer = win.get("kCGWindowLayer", 999)
                if layer == 0 and (title or owner):
                    # First non-menu window is the frontmost
                    return (owner, title)
        except Exception:
            pass
        return ("", "")


class Win32Detector(WindowDetector):
    """Windows via win32gui."""
    name = "win32"

    def __init__(self) -> None:
        try:
            import win32gui  # type: ignore
            self._win32 = win32gui
        except Exception:
            self._win32 = None

    def is_available(self) -> bool:
        return self._win32 is not None

    def detect(self) -> Tuple[str, str]:
        if not self._win32:
            return ("", "")
        try:
            hwnd = self._win32.GetForegroundWindow()
            if not hwnd:
                return ("", "")
            title = self._win32.GetWindowText(hwnd) or ""
            # App name from the window's process
            import win32process  # type: ignore
            import psutil
            _, pid = win32process.GetWindowThreadProcessId(hwnd)
            try:
                p = psutil.Process(pid)
                app = p.name()
            except Exception:
                app = ""
            return (app, title)
        except Exception:
            return ("", "")


class MockWindowDetector(WindowDetector):
    """Simulates activity for testing on headless boxes."""
    name = "mock"

    def __init__(self) -> None:
        self._cycle = [
            ("ChatGPT", "Conversation with UPMP-ADT watcher"),
            ("ChatGPT", "Dictating transcription about the watcher"),
            ("Code", "silent_watcher.py - z.my-project"),
            ("Firefox", "python-xlib documentation"),
            ("Terminal", "python silent_watcher.py start"),
        ]
        self._idx = 0
        self._last_switch = time.time()
        self._dwell = 8.0  # seconds per simulated window

    def is_available(self) -> bool:
        return True

    def detect(self) -> Tuple[str, str]:
        now = time.time()
        if now - self._last_switch > self._dwell:
            self._idx = (self._idx + 1) % len(self._cycle)
            self._last_switch = now
        return self._cycle[self._idx]


# ============================================================================
# WATCHER DAEMON
# ============================================================================

class WatcherDaemon:
    """
    The silent watcher itself. Runs in its own process, opens an IPC socket,
    polls active window on a timer, holds the rolling buffer in RAM.
    """

    def __init__(self, socket_path: Path = DEFAULT_SOCKET_PATH,
                 poll_interval: float = DEFAULT_POLL_INTERVAL,
                 buffer_size: int = DEFAULT_BUFFER_SIZE,
                 mock: bool = False,
                 transcribe_cmd: str = "") -> None:
        self.socket_path = socket_path
        self.poll_interval = poll_interval
        self.mock = mock
        self.transcribe_cmd = transcribe_cmd
        self.state = WatcherState(started_at=time.time())
        self.state.buffer = deque(maxlen=buffer_size)
        self.detector = WindowDetector.best_available(mock=mock)
        self._stop = threading.Event()
        self._server: Optional[socket.socket] = None
        self._last_transcription = ""

    # ----- lifecycle -----

    def run(self) -> int:
        # Set up signal handlers
        signal.signal(signal.SIGTERM, self._signal_handler)
        signal.signal(signal.SIGINT, self._signal_handler)
        # Write PID file
        self.socket_path.parent.mkdir(parents=True, exist_ok=True)
        try:
            with open(DEFAULT_PID_FILE, "w") as f:
                f.write(str(os.getpid()))
        except Exception:
            pass
        # Open Unix domain socket
        try:
            if self.socket_path.exists():
                self.socket_path.unlink()
            self._server = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
            self._server.bind(str(self.socket_path))
            self._server.listen(8)
            self._server.settimeout(0.5)  # so we can check _stop periodically
        except Exception as e:
            sys.stderr.write(f"[silent_watcher] failed to bind socket: {e}\n")
            return 2
        sys.stderr.write(
            f"[silent_watcher] daemon started (pid {os.getpid()}, "
            f"detector={self.detector.name}, mode=silent, "
            f"poll={self.poll_interval}s, buffer={self.state.buffer.maxlen})\n"
        )
        sys.stderr.write(
            f"[silent_watcher] socket: {self.socket_path}\n"
        )
        sys.stderr.flush()
        # Start polling thread
        poller = threading.Thread(target=self._poll_loop, daemon=True)
        poller.start()
        # Main loop: accept IPC connections
        while not self._stop.is_set():
            try:
                conn, _ = self._server.accept()
            except socket.timeout:
                continue
            except OSError:
                break
            try:
                self._handle_client(conn)
            except Exception as e:
                sys.stderr.write(f"[silent_watcher] client error: {e}\n")
            finally:
                try:
                    conn.close()
                except Exception:
                    pass
        # Cleanup
        try:
            self._server.close()
        except Exception:
            pass
        try:
            self.socket_path.unlink()
        except Exception:
            pass
        try:
            DEFAULT_PID_FILE.unlink()
        except Exception:
            pass
        sys.stderr.write("[silent_watcher] daemon stopped\n")
        return 0

    def _signal_handler(self, signum, frame) -> None:
        sys.stderr.write(f"[silent_watcher] received signal {signum}, stopping\n")
        self._stop.set()

    # ----- polling -----

    def _poll_loop(self) -> None:
        while not self._stop.is_set():
            try:
                app, title = self.detector.detect()
                transcript = self._fetch_transcription()
                obs = Observation(
                    timestamp=time.time(),
                    app_name=app,
                    window_title=title,
                    transcription=transcript,
                    mode=self.state.mode,
                )
                self.state.buffer.append(obs)
            except Exception as e:
                sys.stderr.write(f"[silent_watcher] poll error: {e}\n")
            # Sleep in small increments so we can stop quickly
            slept = 0.0
            while not self._stop.is_set() and slept < self.poll_interval:
                time.sleep(0.2)
                slept += 0.2

    def _fetch_transcription(self) -> str:
        """If --transcribe-cmd was given, run it and capture the latest line."""
        if not self.transcribe_cmd:
            return ""
        import subprocess
        try:
            result = subprocess.run(
                self.transcribe_cmd, shell=True,
                capture_output=True, text=True, timeout=1.5,
            )
            line = result.stdout.strip().splitlines()[-1] if result.stdout.strip() else ""
            if line and line != self._last_transcription:
                self._last_transcription = line
                return line
        except Exception:
            pass
        return ""

    # ----- IPC -----

    def _handle_client(self, conn: socket.socket) -> None:
        conn.settimeout(5.0)
        try:
            data = self._recv_json(conn)
            if not data:
                return
            cmd = data.get("cmd", "")
            response = self._dispatch(cmd, data)
            self._send_json(conn, response)
        except Exception as e:
            try:
                self._send_json(conn, {"ok": False, "error": str(e)})
            except Exception:
                pass

    def _dispatch(self, cmd: str, data: dict) -> dict:
        if cmd == "ping":
            return {"ok": True, "version": VERSION, "mode": self.state.mode}
        if cmd == "status":
            return self._cmd_status()
        if cmd == "query":
            return self._cmd_query(data)
        if cmd == "promote":
            return self._cmd_promote(data)
        if cmd == "recess":
            return self._cmd_recess()
        if cmd == "stop":
            self._stop.set()
            return {"ok": True, "message": "stopping"}
        return {"ok": False, "error": f"unknown cmd: {cmd}"}

    # ----- commands -----

    def _cmd_status(self) -> dict:
        latest = self.state.latest()
        return {
            "ok": True,
            "running": True,
            "started_at": self.state.started_at,
            "uptime_seconds": time.time() - self.state.started_at,
            "mode": self.state.mode,
            "detector": self.detector.name,
            "buffer_size": len(self.state.buffer),
            "buffer_max": self.state.buffer.maxlen,
            "poll_interval": self.poll_interval,
            "latest": latest.to_dict() if latest else None,
            "promote_reason": self.state.promote_reason,
            "promoted_at": self.state.promoted_at,
            "query_count": self.state.query_count,
        }

    def _cmd_query(self, data: dict) -> dict:
        question = data.get("question", "").strip().lower()
        window = float(data.get("window_seconds", DEFAULT_SUMMARY_WINDOW))
        self.state.query_count += 1
        self.state.last_query_at = time.time()
        recent = self.state.recent(window)
        if not recent:
            # If we have any observations at all, fall back to the latest one
            # rather than saying "haven't observed anything" — that's misleading
            # if the window was just smaller than the poll interval.
            latest = self.state.latest()
            if latest is not None:
                answer = (
                    f"Right now ({time.strftime('%H:%M:%S', time.localtime(latest.timestamp))}): "
                    f"you're in {latest.app_name or '(unknown app)'}"
                    + (f", window «{latest.window_title}»" if latest.window_title else "")
                    + ("." if not latest.transcription else f", dictating: \"{latest.transcription}\".")
                    + f"\n\n(Requested window was {window:.1f}s, smaller than the {self.poll_interval:.1f}s "
                      f"poll interval — showing only the latest observation.)"
                )
                return {
                    "ok": True,
                    "answer": answer,
                    "observations": 1,
                    "window_seconds": window,
                    "mode": self.state.mode,
                    "latest": latest.to_dict(),
                }
            return {
                "ok": True,
                "answer": "I haven't observed anything yet — the watcher just started.",
                "observations": 0,
                "mode": self.state.mode,
            }
        # Compose natural-language summary
        answer = self._summarize(recent, question)
        return {
            "ok": True,
            "answer": answer,
            "observations": len(recent),
            "window_seconds": window,
            "mode": self.state.mode,
            "latest": recent[-1].to_dict(),
        }

    def _summarize(self, observations: List[Observation], question: str) -> str:
        """Compose a plain-language summary of recent observations."""
        now = time.time()
        span = observations[-1].timestamp - observations[0].timestamp
        # Group by app to find dominant
        app_seconds: Dict[str, float] = {}
        app_titles: Dict[str, set] = {}
        last_transcription = ""
        for i, obs in enumerate(observations):
            app = obs.app_name or "(unknown)"
            next_ts = observations[i + 1].timestamp if i + 1 < len(observations) else now
            dwell = next_ts - obs.timestamp
            app_seconds[app] = app_seconds.get(app, 0.0) + dwell
            if obs.window_title:
                app_titles.setdefault(app, set()).add(obs.window_title)
            if obs.transcription:
                last_transcription = obs.transcription
        # Sort by time
        ranked = sorted(app_seconds.items(), key=lambda x: -x[1])
        total = sum(v for _, v in ranked) or 1.0
        # Build the answer
        lines: List[str] = []
        # The latest observation — most direct answer to "what am I doing?"
        latest = observations[-1]
        lines.append(
            f"Right now ({time.strftime('%H:%M:%S', time.localtime(latest.timestamp))}): "
            f"you're in {latest.app_name or '(unknown app)'}"
            + (f", window «{latest.window_title}»" if latest.window_title else "")
            + ("." if not latest.transcription else f", dictating: \"{latest.transcription}\".")
        )
        # If the question mentions "what was" or "recently", include the breakdown
        if any(w in question for w in ("recently", "was", "last", "past", "what have")) or not question:
            lines.append("")
            lines.append(f"Over the last {span:.0f}s:")
            for app, secs in ranked[:4]:
                pct = (secs / total) * 100
                titles = app_titles.get(app, set())
                title_hint = ""
                if titles:
                    if len(titles) == 1:
                        title_hint = f" — «{next(iter(titles))}»"
                    else:
                        title_hint = f" — {len(titles)} different windows"
                lines.append(f"  • {app}: {secs:.0f}s ({pct:.0f}%){title_hint}")
        # Mode hint
        if self.state.mode == "active":
            lines.append("")
            lines.append(f"(Watcher is in ACTIVE mode — promoted at "
                         f"{time.strftime('%H:%M:%S', time.localtime(self.state.promoted_at or 0))}"
                         f" for: {self.state.promote_reason or 'no reason given'})")
        elif any(w in question for w in ("help", "stuck", "assist", "what should", "next")):
            lines.append("")
            lines.append("(Watcher is in silent mode. Run `promote` to bring it active"
                         " if you want me to act on this.)")
        return "\n".join(lines)

    def _cmd_promote(self, data: dict) -> dict:
        reason = data.get("reason", "").strip()
        if not reason:
            return {"ok": False, "error": "promote requires a 'reason'"}
        prev_mode = self.state.mode
        self.state.mode = "active"
        self.state.promote_reason = reason
        self.state.promoted_at = time.time()
        # In active mode, the watcher MAY contact other intelligences/agents.
        # For now, we log the intent in the response — actual agent dispatch
        # is a hook the user can wire up.
        latest = self.state.latest()
        return {
            "ok": True,
            "previous_mode": prev_mode,
            "current_mode": "active",
            "reason": reason,
            "latest_observation": latest.to_dict() if latest else None,
            "note": (
                "Watcher promoted to ACTIVE mode. It will now consider contacting "
                "other intelligences/agents. Hook `on_promote(reason, latest)` "
                "in this file to dispatch to UPMP-ADT, an LLM agent, etc."
            ),
        }

    def _cmd_recess(self) -> dict:
        prev_mode = self.state.mode
        self.state.mode = "silent"
        self.state.promote_reason = ""
        self.state.promoted_at = None
        return {
            "ok": True,
            "previous_mode": prev_mode,
            "current_mode": "silent",
            "message": "Watcher returned to silent observation. No data was written.",
        }

    # ----- socket I/O helpers -----

    @staticmethod
    def _recv_json(conn: socket.socket) -> Optional[dict]:
        chunks: List[bytes] = []
        while True:
            chunk = conn.recv(4096)
            if not chunk:
                break
            chunks.append(chunk)
            if b"\n" in chunk:
                break
            if sum(len(c) for c in chunks) > 65536:
                break
        if not chunks:
            return None
        try:
            line = b"".join(chunks).split(b"\n", 1)[0]
            return json.loads(line.decode("utf-8"))
        except Exception:
            return None

    @staticmethod
    def _send_json(conn: socket.socket, obj: dict) -> None:
        data = (json.dumps(obj) + "\n").encode("utf-8")
        conn.sendall(data)


# ============================================================================
# IPC CLIENT (used by the CLI subcommands)
# ============================================================================

class WatcherClient:
    """Talks to a running watcher daemon over the Unix socket."""

    def __init__(self, socket_path: Path = DEFAULT_SOCKET_PATH) -> None:
        self.socket_path = socket_path

    def is_running(self) -> bool:
        if not self.socket_path.exists():
            return False
        # Check the pid file too
        try:
            with open(DEFAULT_PID_FILE) as f:
                pid = int(f.read().strip())
            os.kill(pid, 0)  # signal 0 = check existence
            return True
        except Exception:
            return False

    def send(self, cmd: str, **kwargs) -> dict:
        if not self.socket_path.exists():
            return {"ok": False, "error": f"socket not found: {self.socket_path}"}
        try:
            sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
            sock.settimeout(5.0)
            sock.connect(str(self.socket_path))
            payload = (json.dumps({"cmd": cmd, **kwargs}) + "\n").encode("utf-8")
            sock.sendall(payload)
            # Read response
            chunks: List[bytes] = []
            while True:
                chunk = sock.recv(4096)
                if not chunk:
                    break
                chunks.append(chunk)
                if b"\n" in chunk:
                    break
            sock.close()
            line = b"".join(chunks).split(b"\n", 1)[0]
            return json.loads(line.decode("utf-8"))
        except Exception as e:
            return {"ok": False, "error": str(e)}


# ============================================================================
# CLI COMMANDS
# ============================================================================

def cmd_start(args) -> int:
    if WatcherClient().is_running():
        print("Watcher is already running. Use `status` to check, `stop` to stop.")
        return 1
    daemon = WatcherDaemon(
        socket_path=DEFAULT_SOCKET_PATH,
        poll_interval=args.poll,
        buffer_size=args.buffer_size,
        mock=args.mock,
        transcribe_cmd=args.transcribe_cmd or "",
    )
    # Detach from terminal unless --foreground
    if not args.foreground:
        try:
            pid = os.fork()
            if pid > 0:
                # Parent: wait briefly for socket to appear
                for _ in range(20):
                    if DEFAULT_SOCKET_PATH.exists():
                        break
                    time.sleep(0.1)
                print(f"Watcher started in background (pid {pid}).")
                print(f"Socket: {DEFAULT_SOCKET_PATH}")
                print(f"Run `silent_watcher.py status` to check, `query` to ask "
                      f"what's happening, `stop` to stop.")
                return 0
        except AttributeError:
            # os.fork not available on Windows — fall through to foreground
            pass
    return daemon.run()


def cmd_status(args) -> int:
    client = WatcherClient()
    if not client.is_running():
        print("Watcher is NOT running.")
        print(f"  socket : {DEFAULT_SOCKET_PATH} (not found)")
        return 1
    resp = client.send("status")
    if not resp.get("ok"):
        print(f"Error: {resp.get('error', 'unknown')}")
        return 2
    print("=" * 60)
    print(f"SILENT WATCHER  v{VERSION}")
    print("=" * 60)
    print(f"  Status    : RUNNING (pid file: {DEFAULT_PID_FILE})")
    print(f"  Started   : {time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(resp['started_at']))}")
    print(f"  Uptime    : {_format_duration(resp['uptime_seconds'])}")
    print(f"  Mode      : {resp['mode'].upper()}"
          + (f"  (reason: {resp['promote_reason']})" if resp.get('promote_reason') else ""))
    print(f"  Detector  : {resp['detector']}")
    print(f"  Buffer    : {resp['buffer_size']}/{resp['buffer_max']} observations")
    print(f"  Poll      : {resp['poll_interval']}s")
    print(f"  Queries   : {resp['query_count']}")
    if resp.get("latest"):
        latest = resp["latest"]
        ts = time.strftime("%H:%M:%S", time.localtime(latest["timestamp"]))
        print(f"  Latest    : [{ts}] {latest.get('app_name', '?')} "
              f"«{latest.get('window_title', '')}»"
              + (f" [transcript: {latest['transcription'][:60]}]"
                 if latest.get("transcription") else ""))
    print("=" * 60)
    return 0


def cmd_query(args) -> int:
    client = WatcherClient()
    if not client.is_running():
        print("Watcher is not running. Start it with `silent_watcher.py start`.")
        return 1
    question = args.question or ""
    resp = client.send("query", question=question, window_seconds=args.window)
    if not resp.get("ok"):
        print(f"Error: {resp.get('error', 'unknown')}")
        return 2
    print(resp.get("answer", "(no answer)"))
    if args.verbose and resp.get("latest"):
        print()
        print(f"[latest observation]")
        latest = resp["latest"]
        for k, v in latest.items():
            print(f"  {k:14} : {v}")
    return 0


def cmd_promote(args) -> int:
    client = WatcherClient()
    if not client.is_running():
        print("Watcher is not running. Start it first.")
        return 1
    reason = args.reason or "user requested"
    resp = client.send("promote", reason=reason)
    if not resp.get("ok"):
        print(f"Error: {resp.get('error', 'unknown')}")
        return 2
    print(f"Watcher PROMOTED to ACTIVE mode.")
    print(f"  Reason     : {reason}")
    print(f"  Previous   : {resp.get('previous_mode')}")
    print(f"  Current    : {resp.get('current_mode')}")
    if resp.get("latest_observation"):
        latest = resp["latest_observation"]
        print(f"  Context    : {latest.get('app_name', '?')} "
              f"«{latest.get('window_title', '')}»")
    print()
    print(resp.get("note", ""))
    return 0


def cmd_recess(args) -> int:
    client = WatcherClient()
    if not client.is_running():
        print("Watcher is not running.")
        return 1
    resp = client.send("recess")
    if not resp.get("ok"):
        print(f"Error: {resp.get('error', 'unknown')}")
        return 2
    print(f"Watcher returned to SILENT mode.")
    print(f"  Previous : {resp.get('previous_mode')}")
    print(f"  Current  : {resp.get('current_mode')}")
    print(f"  {resp.get('message', '')}")
    return 0


def cmd_stop(args) -> int:
    client = WatcherClient()
    if not client.is_running():
        print("Watcher is not running.")
        # Clean up stale socket/pid if any
        for p in (DEFAULT_SOCKET_PATH, DEFAULT_PID_FILE):
            try:
                p.unlink()
            except Exception:
                pass
        return 0
    resp = client.send("stop")
    # Give it a moment
    for _ in range(20):
        if not client.is_running():
            break
        time.sleep(0.1)
    print("Watcher stopped. No data was persisted.")
    return 0


def _format_duration(seconds: float) -> str:
    s = int(seconds)
    if s < 60:
        return f"{s}s"
    m, s = divmod(s, 60)
    if m < 60:
        return f"{m}m{s}s"
    h, m = divmod(m, 60)
    return f"{h}h{m}m"


# ============================================================================
# ARGUMENT PARSER
# ============================================================================

def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="silent_watcher",
        description="Silent ambient watcher for UPMP-ADT. Passive, zero-persistence, on-demand.",
    )
    parser.add_argument("--version", action="version", version=f"silent_watcher {VERSION}")
    sub = parser.add_subparsers(dest="command", required=True)

    # start
    p = sub.add_parser("start", help="Start the watcher daemon (background by default).")
    p.add_argument("--foreground", action="store_true",
                   help="Run in foreground (don't fork).")
    p.add_argument("--poll", type=float, default=DEFAULT_POLL_INTERVAL,
                   help=f"Poll interval in seconds (default {DEFAULT_POLL_INTERVAL}).")
    p.add_argument("--buffer-size", type=int, default=DEFAULT_BUFFER_SIZE,
                   help=f"Rolling buffer max length (default {DEFAULT_BUFFER_SIZE}).")
    p.add_argument("--mock", action="store_true",
                   help="Use mock window detector (for testing on headless boxes).")
    p.add_argument("--transcribe-cmd", default="",
                   help="Shell command to fetch latest transcription line (optional, privacy-sensitive).")
    p.set_defaults(func=cmd_start)

    # status
    p = sub.add_parser("status", help="Is the watcher running? What's its state?")
    p.set_defaults(func=cmd_status)

    # query
    p = sub.add_parser("query", help="Ask the watcher what's happening.")
    p.add_argument("question", nargs="?", default="",
                   help="Optional natural-language question, e.g. 'what am I doing?'")
    p.add_argument("--window", type=float, default=DEFAULT_SUMMARY_WINDOW,
                   help=f"Seconds of recent context to summarize (default {DEFAULT_SUMMARY_WINDOW}).")
    p.add_argument("-v", "--verbose", action="store_true",
                   help="Also print the latest raw observation.")
    p.set_defaults(func=cmd_query)

    # promote
    p = sub.add_parser("promote", help="Elevate watcher to active mode (may contact agents).")
    p.add_argument("reason", nargs="?", default="",
                   help="Why you're promoting (becomes the dispatch context).")
    p.set_defaults(func=cmd_promote)

    # recess
    p = sub.add_parser("recess", help="Return watcher to silent mode.")
    p.set_defaults(func=cmd_recess)

    # stop
    p = sub.add_parser("stop", help="Stop the watcher daemon.")
    p.set_defaults(func=cmd_stop)

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
