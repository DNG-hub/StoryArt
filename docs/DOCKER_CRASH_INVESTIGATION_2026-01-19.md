# Docker Crash Investigation Log
**Date:** Monday, January 19, 2026

## Issue
Docker engine instability and "crash loops" observed when running StoryArt. Container count dropped from 11 to 5.

## Findings
1. **Crash Source:** The `storyteller_frontend` Docker container is in a crash loop.
   - **Command:** `vite --open /register`
   - **Error:** `spawn xdg-open ENOENT` (Attempting to open a browser window inside a headless container).
   - **Context:** This container runs a Vue.js application, distinct from the local StoryArt React application.

2. **Root Cause:**
   - The `package.json` inside the `storyteller-storyteller_frontend` image has the `dev` script set to `vite --open /register`.
   - This configuration is incompatible with a headless Docker environment.

## Actions Taken
1. **Stopped Container:** `docker stop storyteller_frontend`
   - **Reason:** To stabilize the Docker engine by removing the process responsible for the crash loop.
   - **Impact:** The `StoryTeller` backend (Port 8000) remains active for API access. The crashing frontend is disabled.

## Verification
- Pending user startup of `start-storyart.ps1` to confirm system stability and API connectivity.
