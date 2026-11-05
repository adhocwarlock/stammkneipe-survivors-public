@echo off
rem Starts the local game server (if it isn't running yet) and opens the game in the browser.
cd /d "%~dp0"
where python >nul 2>nul || (echo Python was not found. Install Python 3 and tick "Add to PATH". & pause & exit /b 1)
python tools\wait_server.py check 8000
if errorlevel 1 start "LARS server (close to stop)" cmd /k python tools\serve.py 8000
python tools\wait_server.py wait 8000 || (pause & exit /b 1)
start "" http://localhost:8000
