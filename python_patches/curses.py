# curses.py mock to prevent "Redirection is not supported" errors on Windows
# when importing curses in a non-interactive/redirected child process.

import sys
import time

# Define typical curses constants
A_NORMAL = 0
A_BOLD = 1
A_REVERSE = 2
A_UNDERLINE = 4
A_DIM = 8

KEY_UP = 258
KEY_DOWN = 259
KEY_LEFT = 260
KEY_RIGHT = 261

class Window:
    def __init__(self):
        self.height = 24
        self.width = 80
        self._nodelay = False

    def clear(self):
        pass

    def erase(self):
        pass

    def refresh(self):
        pass

    def noutrefresh(self):
        pass

    def getch(self):
        # Prevent infinite loops in headless CLI runs:
        # If the script is calling getch() repeatedly, we sleep briefly to avoid 100% CPU spin.
        # Then we return -1 (no key pressed/EOF) or 'q' to gracefully quit games like Zindon.
        time.sleep(0.05)
        # We simulate a "q" (quit key) so interactive loops exit cleanly rather than hanging
        return ord('q')

    def getkey(self):
        return "q"

    def getmaxyx(self):
        return (self.height, self.width)

    def addstr(self, *args):
        # Format can be: (str) or (y, x, str) or (y, x, str, attr)
        s = ""
        if len(args) == 1:
            s = args[0]
        elif len(args) >= 3:
            s = args[2]
        
        # Write to stdout so the user actually sees the output frames/menus in their terminal!
        sys.stdout.write(str(s) + "\n")
        sys.stdout.flush()

    def addch(self, *args):
        # Format can be: (ch) or (y, x, ch) or (y, x, ch, attr)
        ch = ""
        if len(args) == 1:
            ch = args[0]
        elif len(args) >= 3:
            ch = args[2]
        if isinstance(ch, int):
            ch = chr(ch)
        sys.stdout.write(str(ch))
        sys.stdout.flush()

    def box(self, *args):
        pass

    def border(self, *args):
        pass

    def keypad(self, flag):
        pass

    def scrollok(self, flag):
        pass

    def timeout(self, delay):
        pass

    def nodelay(self, flag):
        self._nodelay = flag

    def leaveok(self, flag):
        pass

    def idlok(self, flag):
        pass

    def move(self, y, x):
        pass

    def subwin(self, *args):
        return self

    def derwin(self, *args):
        return self

def initscr():
    return Window()

def endwin():
    pass

def cbreak():
    pass

def nocbreak():
    pass

def echo():
    pass

def noecho():
    pass

def curs_set(visibility):
    pass

def start_color():
    pass

def init_pair(pair_number, fg, bg):
    pass

def color_pair(pair_number):
    return 0

def wrapper(func, *args, **kwds):
    stdscr = initscr()
    try:
        return func(stdscr, *args, **kwds)
    except Exception as e:
        sys.stderr.write(f"Curses mock wrapper exception: {str(e)}\n")
        sys.stderr.flush()
    finally:
        endwin()
