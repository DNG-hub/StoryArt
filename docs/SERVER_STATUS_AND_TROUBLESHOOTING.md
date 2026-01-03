# StoryArt Server Status and Troubleshooting

**Date**: 2025-11-24  
**Status**: Active Monitoring  
**Purpose**: Track server status and diagnose connection issues

---

## Current Server Status

### ✅ Backend Server (Port 7802)
- **Status**: Running
- **Process ID**: 34872
- **Health Check**: `http://localhost:7802/health`
- **Response**: `{"success":true,"status":"healthy","redis":"connected","memory":"empty"}`
- **Redis**: Connected to `redis://localhost:6382/0`

### ✅ Frontend Server (Port 3000)
- **Status**: Running
- **Process ID**: 30552
- **URL**: `http://localhost:3000`
- **Response**: 200 OK (HTML content)

---

## Connection Issues

### Firefox "Unable to connect" Error

**Symptoms**:
- Firefox can't establish connection to `localhost:3000`
- Error message: "The site could be temporarily unavailable or too busy"

**Possible Causes**:
1. **Browser Cache**: Firefox may be caching a failed connection
2. **Vite Still Compiling**: Frontend may not be fully ready
3. **Firewall/Proxy**: Local firewall blocking localhost connections
4. **Browser Extension**: Security extension blocking localhost
5. **IPv6 vs IPv4**: Firefox may be trying IPv6 when server is on IPv4

---

## Troubleshooting Steps

### Step 1: Clear Browser Cache
1. Press `Ctrl+Shift+Delete` in Firefox
2. Select "Everything" for time range
3. Check "Cache" and "Cookies"
4. Click "Clear Now"
5. Try accessing `http://localhost:3000` again

### Step 2: Try Hard Refresh
- Press `Ctrl+F5` or `Ctrl+Shift+R` to force reload
- Bypasses cache completely

### Step 3: Try Different Browser
- Test in Chrome/Edge: `http://localhost:3000`
- If Chrome works, it's a Firefox-specific issue

### Step 4: Check Vite Compilation
- Look at the terminal where `npm run dev` is running
- Wait for message: "VITE v6.x.x ready in XXX ms"
- Check for any compilation errors

### Step 5: Check Firefox Network Settings
1. Go to `about:config` in Firefox
2. Search for `network.dns.disableIPv6`
3. Set to `true` if IPv6 is causing issues
4. Restart Firefox

### Step 6: Try 127.0.0.1 Instead of localhost
- Use `http://127.0.0.1:3000` instead of `http://localhost:3000`
- Sometimes resolves DNS resolution issues

### Step 7: Check Firewall
- Windows Firewall may be blocking localhost connections
- Temporarily disable firewall to test
- If it works, add exception for Node.js

---

## Server Logs Location

### Backend Logs
- **Location**: Terminal where `npm run dev:server` is running
- **Look for**:
  - `🚀 Redis Session API Server running on http://localhost:7802`
  - `✅ Redis connected successfully`
  - Any error messages in red

### Frontend Logs
- **Location**: Terminal where `npm run dev` is running
- **Look for**:
  - `VITE v6.x.x ready in XXX ms`
  - `Local: http://localhost:3000/`
  - Any compilation errors

---

## Quick Health Checks

### Check Backend
```powershell
curl http://localhost:7802/health
# Should return: {"success":true,"status":"healthy","redis":"connected","memory":"empty"}
```

### Check Frontend
```powershell
curl http://localhost:3000
# Should return: HTML content (200 OK)
```

### Check Ports
```powershell
netstat -ano | findstr ":3000"
netstat -ano | findstr ":7802"
# Should show LISTENING status
```

---

## Common Error Messages

### "EADDRINUSE: address already in use"
**Cause**: Port already in use by another process  
**Solution**: Kill the process using the port or use `start-storyart.ps1` script

### "Redis connection failed"
**Cause**: Redis server not running or wrong port  
**Solution**: Check Redis is running on port 6382, verify `.env` has correct `REDIS_PORT`

### "Cannot read properties of undefined"
**Cause**: Environment variables not loaded  
**Solution**: Check `.env` file exists and has required variables

### "Firefox can't establish connection"
**Cause**: Browser cache, firewall, or Vite not ready  
**Solution**: Clear cache, try different browser, wait for Vite compilation

---

## Next Steps

1. **Clear Firefox cache** and try again
2. **Check terminal logs** for any errors
3. **Try Chrome/Edge** to see if it's Firefox-specific
4. **Wait for Vite compilation** to complete (look for "ready" message)
5. **Check browser console** (F12) for JavaScript errors

---

**Both servers are running. The issue is likely browser-related, not server-related.**

