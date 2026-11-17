@echo off
setlocal
set "HTML=%~dp0index.html"
if not exist "%HTML%" (
  echo [ERROR] index.html not found next to this launcher.
  pause
  exit /b 1
)
rem Prefer standalone app window (no browser UI): Edge first, then Chrome
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
  start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --app="file:///%HTML:\=/%"
  exit /b 0
)
if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
  start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" --app="file:///%HTML:\=/%"
  exit /b 0
)
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
  start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --app="file:///%HTML:\=/%"
  exit /b 0
)
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
  start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" --app="file:///%HTML:\=/%"
  exit /b 0
)
rem Fallback: system default handler
start "" "%HTML%"
exit /b 0
