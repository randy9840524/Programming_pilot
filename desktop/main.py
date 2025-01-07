import sys
import os
import webview
from pathlib import Path

def get_entrypoint():
    if getattr(sys, 'frozen', False):
        # Running as compiled
        return os.path.join(sys._MEIPASS, 'public', 'index.html')
    else:
        # Running in development
        return os.path.join(Path(__file__).parent.parent, 'client', 'public', 'index.html')

def main():
    # Set up the window configuration
    window = webview.create_window(
        'CodeCraft IDE',
        url=get_entrypoint(),
        width=1280,
        height=800,
        min_size=(800, 600),
        resizable=True,
        frameless=False,
        easy_drag=True,
    )

    # Start the application
    webview.start(debug=True)

if __name__ == '__main__':
    main()