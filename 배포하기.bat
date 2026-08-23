@echo off
title NMIXX TCG - Deploy to GitHub and Vercel
color 0A
cls

echo ================================================================
echo  Deploying NMIXX TCG to GitHub and Vercel...
echo ================================================================
echo.

cd /d "%~dp0"

echo [1/2] Pushing main branch...
git push --progress -v origin main

echo.
echo [2/2] Pushing dev branch...
git push --progress -v origin dev

echo.
echo ================================================================
echo  SUCCESS! All latest updates have been pushed to GitHub.
echo  Live Website: https://nmixx-tcg.vercel.app
echo ================================================================
echo.
pause
