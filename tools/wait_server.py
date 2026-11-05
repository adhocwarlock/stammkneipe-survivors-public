"""Used by start.bat. `check`: exit 0 if the game server already answers. `wait`: wait up to 20 s for it."""
import sys
import time
import urllib.request

URL = "http://127.0.0.1:{}/index.html"


def up(port):
    try:
        with urllib.request.urlopen(URL.format(port), timeout=1) as r:
            return r.status == 200
    except OSError:
        return False


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "wait"
    port = int(sys.argv[2]) if len(sys.argv) > 2 else 8000
    if mode == "check":
        sys.exit(0 if up(port) else 1)
    for _ in range(80):
        if up(port):
            sys.exit(0)
        time.sleep(0.25)
    print(f"The game server did not start on port {port}. Look at the 'LARS server' window for the error.")
    sys.exit(1)
