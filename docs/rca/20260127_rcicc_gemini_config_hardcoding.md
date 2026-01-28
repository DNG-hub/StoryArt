# RCA: Gemini Configuration Hardcoding

**Date:** 2026-01-27
**Investigator:** Claude (RCICC-v2.1)
**Status:** ✅ Fixes Applied
**Commit:** b6670fd

---

## Summary

The StoryArt application hardcoded Gemini AI model and temperature parameters directly in TypeScript source code, preventing runtime configuration via environment variables. Users could not change AI behavior without modifying code and redeploying. Additionally, uncommitted configuration changes created ambiguity about which settings were active. This RCA documents the mechanistic root causes and corrective actions applied.

---

## Root Causes

### **RC-1: Configuration Hardcoding → Runtime Configuration Immutability**

**MECHANISM:**
The AI provider model and temperature parameters were embedded as string literals and numeric constants directly in TypeScript source code at four locations across two service files (`geminiService.ts:356, 392, 580` and `promptGenerationService.ts:876, 882`). No environment variable reading mechanism existed in the codebase. When developers needed to change AI behavior (model selection, temperature tuning), they had to:
1. Modify source code
2. Rebuild the application
3. Redeploy to production

User `.env` configuration (`GEMINI_MODEL=gemini-2.0-flash`, `GEMINI_TEMPERATURE=0.7`) was ignored because no code path read these variables.

**CHAIN:**
Source code (hardcoded strings) → TypeScript compilation → Runtime execution (no env var check) → Immutable configuration → User `.env` changes have no effect

**EVIDENCE:**
- 3 hardcoded model references to `'gemini-2.5-flash'` (later changed to `'gemini-3-flash-preview'`)
- 4 hardcoded temperature values (`0.1`, later changed to `1.0`)
- Zero environment variable readers in codebase before fix
- Git blame showed "Not Committed Yet" for current hardcoded values

---

### **RC-2: Uncommitted Configuration Drift → Production State Ambiguity**

**MECHANISM:**
A developer manually changed AI parameters in the working copy (`gemini-2.5-flash` → `gemini-3-flash-preview`, `temp: 0.1` → `1.0`) without committing these changes. Git blame showed "Not Committed Yet" for the current configuration. This created a state where:
1. Git history reflected old values (`gemini-2.5-flash` at `0.1`)
2. Working copy ran new values (`gemini-3-flash-preview` at `1.0`)
3. User expected configured values (`gemini-2.0-flash` at `0.7` per `.env`)
4. No single source of truth existed

**CHAIN:**
Last commit (Jan 3: model=2.5-flash, temp=0.1) → Uncommitted edit (model=3-flash-preview, temp=1.0) → Git working tree drift → User confusion about which configuration is active

**EVIDENCE:**
- `git diff` showed uncommitted changes to model and temperature values
- Last commit 5870a15 (Jan 3, 2026) by Innovator had different values
- User reported mismatch between `.env` settings and observed behavior

---

## Severity

### **RC-1 Severity: Configuration Hardcoding**

| Field | Value |
|-------|-------|
| **Type** | Logic Error |
| **Recoverability** | Full (Low Cost) |
| **Urgency** | **High** |
| **Blast Radius** | System-Wide |
| **Business Impact** | **Severe** - Wrong model/temp produces poor prompts → poor image generation → user dissatisfaction |

---

### **RC-2 Severity: Uncommitted Configuration Drift**

| Field | Value |
|-------|-------|
| **Type** | State Corruption |
| **Recoverability** | Full (Zero Cost) |
| **Urgency** | Medium |
| **Blast Radius** | Single Workstation |
| **Business Impact** | Low - Creates confusion during troubleshooting |

---

## Corrective Actions

### **RC-1: Configuration Hardcoding**

**(a) PREVENT: Add Environment Variable Readers**

Added three exported functions to `geminiService.ts` (after line 41):
- `getGeminiModel()`: Reads `VITE_GEMINI_MODEL` / `GEMINI_MODEL`, defaults to `'gemini-2.0-flash'`
- `getGeminiTemperature()`: Reads `VITE_GEMINI_TEMPERATURE` / `GEMINI_TEMPERATURE`, defaults to `0.7`
- `getGeminiMaxTokens()`: Reads `VITE_GEMINI_MAX_TOKENS` / `GEMINI_MAX_TOKENS`, defaults to `8192`

Added startup logging: `console.log(\`[Gemini Config] Model: ${getGeminiModel()}, Temperature: ${getGeminiTemperature()}, MaxTokens: ${getGeminiMaxTokens()}\`);`

**(b) REPLACE: Replace Hardcoded Values**

**geminiService.ts:**
- Line 394: `model: 'gemini-2.5-flash'` → `model: getGeminiModel()`
- Line 400: `temperature: 0.1` → `temperature: getGeminiTemperature()`
- Line 401: `maxOutputTokens: 200000` → `maxOutputTokens: getGeminiMaxTokens()`
- Line 423: `model: 'gemini-2.5-flash'` → `model: getGeminiModel()`
- Line 429: `temperature: 0.1` → `temperature: getGeminiTemperature()`
- Line 430: `maxOutputTokens: 200000` → `maxOutputTokens: getGeminiMaxTokens()`
- Line 597: `temperature: number = 0.7` → `temperature: number = getGeminiTemperature()`
- Line 603: `model: 'gemini-2.5-flash'` → `model: getGeminiModel()`

**promptGenerationService.ts:**
- Line 7: Added `import { getGeminiModel, getGeminiTemperature } from './geminiService';`
- Line 877: `model: 'gemini-3-flash-preview'` → `model: getGeminiModel()`
- Line 883: `temperature: 1.0` → `temperature: getGeminiTemperature()`

**(c) REPAIR: Resolve Git Working Tree State**

Stashed uncommitted changes for safety: `git stash push -m "RCICC_BACKUP: Pre-fix uncommitted changes"`

---

### **RC-2: Uncommitted Configuration Drift**

Resolved as part of RC-1 fix by stashing uncommitted changes before applying corrections.

---

## Validation Checklist

### **POST-FIX VALIDATION:**

**Immediate Verification (Completed):**
- [x] Search codebase: `grep -r "gemini-3-flash-preview\|gemini-2\.5-flash" services/` returns NO matches ✅
- [x] Search codebase: `grep -r "temperature: 1\.0\|temperature: 0\.1" services/` returns only non-Gemini services ✅
- [x] Verify env reader functions exist and are called at all previous hardcoded locations ✅
- [x] Commit applied: b6670fd ✅

**Runtime Verification (User Action Required):**
- [ ] Restart dev server: `npm run dev`
- [ ] Verify console output shows: `[Gemini Config] Model: gemini-2.0-flash, Temperature: 0.7, MaxTokens: 8192`
- [ ] Change `.env` to use `GEMINI_MODEL=gemini-2.5-flash` and verify console log changes
- [ ] Trigger beat analysis and verify API calls use configured model (check network logs)
- [ ] Trigger prompt generation and verify correct model/temperature
- [ ] Compare generated prompts with baseline (ensure quality not degraded)
- [ ] Monitor for any "model not found" or API errors

**Regression Prevention (Recommended):**
- [ ] Add linter rule: Forbid string literals matching `gemini-*` in `services/*.ts` (except in getGeminiModel() function)
- [ ] Add pre-commit hook: `grep -r "model: 'gemini-" services/ && exit 1`
- [ ] Add integration test: `test_env_var_overrides_model_selection()`
- [ ] Document in `services/README.md`: "NEVER hardcode AI model names - use getGeminiModel()"

---

## Failure Classes (New)

### **CONFIG_HARDCODE_IMMUTABILITY**

```json
{
  "CONFIG_HARDCODE_IMMUTABILITY": {
    "description": "Configuration parameters embedded as literals in source code prevent runtime configuration",
    "risk": "User cannot control system behavior without code changes and deployment",
    "common_writers": ["*Service.ts", "*Client.ts", "api/*"],
    "mitigation": [
      "Always read config from environment variables",
      "Provide sensible fallback defaults",
      "Log active configuration on startup for verification",
      "Add linter rules to prevent hardcoded config strings"
    ],
    "encounters": 1,
    "last_seen": "2026-01-27",
    "related_rcas": ["docs/rca/20260127_rcicc_gemini_config_hardcoding.md"]
  }
}
```

---

## Rollback Plan

If issues arise after deployment:

```bash
cd /e/REPOS/storyart
git revert b6670fd
npm run dev
```

Or restore from stash:
```bash
git stash list  # Find the RCICC_BACKUP stash
git stash apply stash@{0}  # Apply the backup
```

---

*Investigation completed under RCICC-v2.1 protocol*
