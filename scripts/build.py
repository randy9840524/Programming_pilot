import os
import sys
import shutil
from pathlib import Path
import subprocess

def build_desktop():
    """Build desktop executable"""
    print("Starting desktop build...")

    # First build the web application
    build_web()

    # Create spec file for PyInstaller
    spec_content = """
# -*- mode: python ; coding: utf-8 -*-

block_cipher = None

a = Analysis(
    ['desktop/main.py'],
    pathex=[],
    binaries=[],
    datas=[('dist/public', 'public')],
    hiddenimports=['webview'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='CodeCraft-IDE',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
"""

    try:
        # Write spec file
        with open('CodeCraft-IDE.spec', 'w') as f:
            f.write(spec_content)

        # Run PyInstaller
        subprocess.run([
            'pyinstaller',
            '--clean',
            '--noconfirm',
            'CodeCraft-IDE.spec'
        ], check=True)

        print("Desktop build completed! Executable is in the dist folder.")
    except Exception as e:
        print(f"Error during desktop build: {str(e)}")
        sys.exit(1)

def build_web():
    """Build web application"""
    print("Starting web build...")

    try:
        # Clean previous build
        dist_dir = Path('dist')
        if dist_dir.exists():
            shutil.rmtree(dist_dir)

        # Create production build
        subprocess.run(['npm', 'run', 'build'], check=True)
        print("Web build completed! Files are in the dist folder.")
    except subprocess.CalledProcessError as e:
        print(f"Error during web build: {str(e)}")
        sys.exit(1)
    except Exception as e:
        print(f"Unexpected error during web build: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Please specify build type: desktop or web")
        sys.exit(1)

    build_type = sys.argv[1].lower()
    if build_type == "desktop":
        build_desktop()
    elif build_type == "web":
        build_web()
    else:
        print("Invalid build type. Use 'desktop' or 'web'")
        sys.exit(1)