"""Local game server with uncached assets and a persistent top-10 leaderboard."""
import datetime
import http.server
import json
import re
import sys
import threading
from functools import partial
from pathlib import Path


SCORES = Path(__file__).resolve().parent.parent / ".scratch" / "local_scores.json"
SCORES_LOCK = threading.Lock()
MAX_ENTRIES = 10
HEROES = {"lars", "mike", "johnny", "danny", "hans", "hannah"}
LIMITS = {"survived": 24 * 3600, "kills": 10**6, "beers": 10**5, "joints": 10**4, "pfand": 10**8}
NAME_RE = re.compile(r"^[\w .'-]{1,12}$")


def load_scores():
    try:
        return json.loads(SCORES.read_text(encoding="utf8"))
    except (OSError, ValueError):
        return []


def rank_key(r):
    return (-r["survived"], -r["kills"], r["id"])


def submit_score(body):
    """Returns (status, response dict)."""
    if not isinstance(body, dict):
        return 400, {"error": "json"}
    name = " ".join(str(body.get("name") or "").split())
    if not NAME_RE.match(name):
        return 400, {"error": "name"}
    if body.get("hero") not in HEROES:
        return 400, {"error": "hero"}
    run = {"name": name, "hero": body["hero"]}
    for k, mx in LIMITS.items():
        v = body.get(k)
        if not isinstance(v, int) or isinstance(v, bool) or not 0 <= v <= mx:
            return 400, {"error": k}
        run[k] = v
    with SCORES_LOCK:
        rows = sorted(load_scores(), key=rank_key)[:MAX_ENTRIES]
        run["id"] = max([r["id"] for r in rows], default=0) + 1
        run["date"] = datetime.date.today().isoformat()
        rows = sorted(rows + [run], key=rank_key)[:MAX_ENTRIES]
        SCORES.parent.mkdir(exist_ok=True)
        SCORES.write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding="utf8")
    rank = next((i + 1 for i, r in enumerate(rows) if r["id"] == run["id"]), None)
    return 200, {"scores": strip(rows), "rank": rank}


def strip(rows):
    return [{k: v for k, v in r.items() if k != "id"} for r in rows]


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    # Don't trust the Windows registry for MIME types: ES modules only load as JavaScript.
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json",
        ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".ttf": "font/ttf", ".woff2": "font/woff2",
    }

    def send_json(self, status, data):
        raw = json.dumps(data, ensure_ascii=False).encode("utf8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self):
        if self.path.split("?")[0] == "/api/scores":
            with SCORES_LOCK:
                rows = sorted(load_scores(), key=rank_key)[:MAX_ENTRIES]
            return self.send_json(200, {"scores": strip(rows)})
        return super().do_GET()

    def do_POST(self):
        if self.path.split("?")[0] != "/api/scores":
            return self.send_json(404, {"error": "not found"})
        try:
            n = int(self.headers.get("Content-Length") or 0)
            body = json.loads(self.rfile.read(min(n, 4096)).decode("utf8"))
        except ValueError:
            return self.send_json(400, {"error": "json"})
        self.send_json(*submit_score(body))

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()


class Server(http.server.ThreadingHTTPServer):
    allow_reuse_address = False  # on Windows reuse lets a 2nd server silently share the port


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    root = Path(__file__).resolve().parent.parent
    handler = partial(NoCacheHandler, directory=str(root))
    try:
        server = Server(("127.0.0.1", port), handler)
    except OSError as e:
        print(f"Port {port} is busy ({e}). Is another LARS server window still open? Close it and try again.")
        sys.exit(1)
    print(f"STAMMKNEIPE SURVIVORS: http://localhost:{port}  (close this window to stop)")
    server.serve_forever()
