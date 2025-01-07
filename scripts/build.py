import os
import sys
import shutil
from pathlib import Path
import subprocess
import platform
from PIL import Image
import cairosvg
import io

def get_platform():
    """Get current platform information"""
    system = platform.system().lower()
    return {
        'is_windows': system == 'windows',
        'is_linux': system == 'linux',
        'is_mac': system == 'darwin',
        'system': system
    }

def create_ico_from_svg(svg_path, output_path):
    """Convert SVG to ICO format for Windows"""
    try:
        # Convert SVG to PNG in memory
        png_data = cairosvg.svg2png(url=svg_path, output_width=256, output_height=256)

        # Open PNG from memory buffer
        img = Image.open(io.BytesIO(png_data))

        # Create ICO file with multiple sizes
        icon_sizes = [(16,16), (32,32), (48,48), (64,64), (128,128), (256,256)]
        img.save(output_path, format='ICO', sizes=icon_sizes)
        return True
    except Exception as e:
        print(f"Warning: Failed to create icon: {str(e)}")
        return False

def build_desktop():
    """Build desktop executable with installer"""
    print("Starting desktop build...")
    platform_info = get_platform()

    # First build the web application
    build_web()

    # Create icon if needed
    icon_path = None
    if platform_info['is_windows']:
        svg_icon = Path('assets/icon.svg')
        if svg_icon.exists():
            ico_path = Path('assets/icon.ico')
            if create_ico_from_svg(str(svg_icon), str(ico_path)):
                icon_path = str(ico_path)

    # Create spec file for PyInstaller
    spec_content = f'''# -*- mode: python ; coding: utf-8 -*-

block_cipher = None

# Analyze the web application
a = Analysis(
    ['desktop/main.py'],
    pathex=[],
    binaries=[],
    datas=[('dist/public', 'public')],
    hiddenimports=['webview'],
    hookspath=[],
    hooksconfig={{}},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False
)

# Create the executable
pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='Application',
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
    icon='{icon_path if icon_path else ""}'
)

# For Windows, create an installer
if {platform_info['is_windows']}:
    coll = COLLECT(
        exe,
        a.binaries,
        a.zipfiles,
        a.datas,
        strip=False,
        upx=True,
        upx_exclude=[],
        name='Application'
    )
'''

    try:
        # Write spec file
        with open('Application.spec', 'w') as f:
            f.write(spec_content)

        # Run PyInstaller
        pyinstaller_args = [
            'pyinstaller',
            '--clean',
            '--noconfirm',
            'Application.spec'
        ]

        if platform_info['is_windows']:
            pyinstaller_args.extend(['--windowed'])

        subprocess.run(pyinstaller_args, check=True)

        # Create installer if on Windows
        if platform_info['is_windows']:
            create_windows_installer()

        print("Desktop build completed! Files are in the dist folder.")
        print_build_instructions(platform_info)
    except Exception as e:
        print(f"Error during desktop build: {str(e)}")
        sys.exit(1)

def create_windows_installer():
    """Create Windows installer using NSIS"""
    try:
        # NSIS script for creating installer
        nsis_script = r'''
!include "MUI2.nsh"
!define APP_NAME "CodeCraft IDE"
!define COMP_NAME "Your Company"
!define VERSION "1.0.0"

Name "${APP_NAME}"
OutFile "Install-${APP_NAME}.exe"
InstallDir "$PROGRAMFILES\${APP_NAME}"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_WELCOME
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

!insertmacro MUI_LANGUAGE "English"

Section "Install"
    SetOutPath "$INSTDIR"
    File /r "dist\Application\*.*"

    CreateDirectory "$SMPROGRAMS\${APP_NAME}"
    CreateShortCut "$SMPROGRAMS\${APP_NAME}\${APP_NAME}.lnk" "$INSTDIR\Application.exe"
    CreateShortCut "$DESKTOP\${APP_NAME}.lnk" "$INSTDIR\Application.exe"

    WriteUninstaller "$INSTDIR\Uninstall.exe"

    # Add size info
    ${GetSize} "$INSTDIR" "/S=0K" $0 $1 $2
    IntFmt $0 "0x%08X" $0
    WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "EstimatedSize" "$0"

    # Add uninstall information to Add/Remove Programs
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "DisplayName" "${APP_NAME}"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "UninstallString" "$INSTDIR\Uninstall.exe"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "DisplayIcon" "$INSTDIR\Application.exe"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "Publisher" "${COMP_NAME}"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "DisplayVersion" "${VERSION}"
SectionEnd

Section "Uninstall"
    RMDir /r "$INSTDIR"
    Delete "$SMPROGRAMS\${APP_NAME}\${APP_NAME}.lnk"
    Delete "$DESKTOP\${APP_NAME}.lnk"
    RMDir "$SMPROGRAMS\${APP_NAME}"

    # Remove registry entries
    DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}"
SectionEnd
'''
        # Write NSIS script
        with open('installer.nsi', 'w') as f:
            f.write(nsis_script)

        # Run NSIS compiler
        subprocess.run(['makensis', 'installer.nsi'], check=True)
        print("Windows installer created successfully!")
    except Exception as e:
        print(f"Error creating Windows installer: {str(e)}")
        print("Installer creation skipped. You can still use the executable from the dist folder.")

def print_build_instructions(platform_info):
    """Print platform-specific instructions"""
    print("\nBuild Output Instructions:")
    if platform_info['is_windows']:
        print("- The Windows installer is available as 'Install-CodeCraft-IDE.exe'")
        print("- You can also find the standalone executable in 'dist/Application'")
    elif platform_info['is_linux']:
        print("- The Linux executable is available in 'dist/Application'")
        print("- Run it using './dist/Application/Application'")
    elif platform_info['is_mac']:
        print("- The macOS application is available in 'dist/Application.app'")
        print("- You can copy it to your Applications folder")

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