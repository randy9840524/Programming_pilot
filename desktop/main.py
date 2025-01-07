import sys
import os
from pathlib import Path
import webview

def get_entrypoint():
    """Get the entry point for the web application"""
    if getattr(sys, 'frozen', False):
        # Running as a bundled application
        base_path = sys._MEIPASS
    else:
        # Running in development
        base_path = Path(__file__).parent.parent

    # Default paths to check for the entry point
    possible_paths = [
        os.path.join(base_path, 'public', 'index.html'),
        os.path.join(base_path, 'dist', 'public', 'index.html'),
        os.path.join(base_path, 'build', 'index.html'),
        os.path.join(base_path, 'dist', 'index.html')
    ]

    # Find the first valid path
    for path in possible_paths:
        if os.path.exists(path):
            return 'file://' + path

    raise FileNotFoundError(
        "Could not find the application entry point. "
        "Make sure to build the application first."
    )

def main():
    try:
        # Get application name from environment or use default
        app_name = os.environ.get('APP_NAME', 'CodeCraft IDE')

        # Set up the window configuration
        window = webview.create_window(
            title=app_name,
            url=get_entrypoint(),
            width=1280,
            height=800,
            min_size=(800, 600),
            resizable=True,
            frameless=False,
            easy_drag=True,
            text_select=True,
            confirm_close=True,
            background_color='#FFFFFF'
        )

        # Start the application
        webview.start(debug=True)

    except Exception as e:
        print(f"Error starting application: {str(e)}")
        sys.exit(1)

if __name__ == '__main__':
    main()