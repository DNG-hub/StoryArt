# Prompt Modification Policy

**Effective:** January 27, 2026
**Owner:** Dave Gargan

## Purpose
Prevent unauthorized or excessive modifications to AI system prompts that drastically alter system behavior without explicit approval.

## Incident That Triggered This Policy

**Date:** October 28, 2025
**Commit:** a7be2b4f
**Author:** Innovator <innovator@avanticomplex.com>
**Problem:** System prompts were changed from "10-15 beats per scene" to "25-40 beats with EXTREME GRANULARITY", causing 30x beat explosion (4,228 beats instead of 140).

**Language added without authorization:**
- "EXTREMELY MANY distinct narrative beats"
- "EXTREME GRANULARITY"
- "ULTRA-GRANULAR instructions"
- "EVERY single dialogue line, action, pause, reaction = separate beat"

**Impact:**
- Generation time: 2 min → 15+ min
- Beat count: 140 → 4,228 (30x increase)
- Prompt cost: Proportional increase
- User never instructed or approved this behavior

---

## Policy Rules

### 1. **Baseline Prompt Parameters**

**Current Approved Defaults:**
```
Beats per scene: 15-20 (target: 18)
Minimum beats: 12
Maximum beats: 25
Language: Professional, measured
```

**Forbidden Language:**
- "EXTREMELY", "ULTRA", "MAXIMUM", "ALL CAPS EMPHASIS"
- Superlatives without quantification
- Vague intensifiers that AI models interpret literally at low temperature

### 2. **Change Control Process**

**Any prompt modification MUST:**
1. Create a git branch: `prompt/description-of-change`
2. Document in commit message:
   - What parameter changed
   - Expected behavioral impact
   - Justification for change
3. Get explicit approval before merging to main
4. Test on single scene before full episode

**Emergency rollback:**
```bash
git revert <commit-hash>
git push origin main
```

### 3. **Prompt Review Checklist**

Before committing prompt changes, verify:
- [ ] No ALL CAPS emphasis added
- [ ] No vague intensifiers (EXTREMELY, ULTRA, MAXIMUM)
- [ ] Numeric ranges are reasonable (not 2x+ increase)
- [ ] Language is measured and professional
- [ ] Expected output size is calculated
- [ ] Test run on single scene completed

### 4. **Temperature & Literal Interpretation**

**Remember:** At `temperature: 0.1`, AI models interpret instructions LITERALLY.

**Bad Example:**
```
"Generate EXTREMELY MANY beats with ULTRA-GRANULAR detail"
```
Result: Model generates 1,000+ beats because "EXTREMELY MANY" has no bound.

**Good Example:**
```
"Generate 15-20 beats per scene, targeting 18 beats"
```
Result: Model generates 16-19 beats consistently.

### 5. **Who Can Modify Prompts**

**Authorized:**
- Dave Gargan (explicit approval required)

**Requires Review:**
- AI assistants (Claude, etc.) - must propose changes, not commit directly
- Team members - must follow change control process

**Forbidden:**
- Automated systems
- Unreviewed AI suggestions

---

## Rollback Instructions

**If unauthorized prompt changes are discovered:**

1. **Identify the commit:**
   ```bash
   git log -p --all -S "EXTREMELY" -- services/
   ```

2. **Revert the commit:**
   ```bash
   git revert <commit-hash>
   git commit -m "revert: unauthorized prompt modifications from <commit>"
   ```

3. **Test the revert:**
   ```bash
   npm run dev
   # Run single scene analysis
   ```

4. **Document in this file:**
   Add incident to "Incidents Log" section below

---

## Incidents Log

### Incident 1: Ultra-Aggressive Beat Generation
- **Date Introduced:** Oct 28, 2025 (commit a7be2b4f)
- **Date Discovered:** Jan 27, 2026
- **Impact:** 30x beat explosion (140 → 4,228 beats)
- **Status:** Pending revert after current run completes
- **Lesson:** ALL CAPS and vague intensifiers cause literal interpretation

---

## Approved Prompt Templates

### Beat Analysis System Prompt (Approved Baseline)

```typescript
const systemInstruction = `You are an expert AI Narrative Pacing Architect for episodic visual storytelling.

**Beat Generation Target:** Generate 15-20 beats per scene (target: 18 beats).

**Beat Definition:** A beat is a complete narrative unit (45-90 seconds) that:
- Advances plot, character, or theme
- Can be represented by a single key image
- Contains 2-4 sentences of script text

**Process:**
1. Read the scene carefully
2. Identify 15-20 distinct narrative beats
3. Break down major dialogue exchanges, action sequences, and character moments
4. Each beat should capture a complete thought or action

**Image Distribution:**
- Target: 11-15 NEW_IMAGE beats per scene
- Maximum: 8 REUSE_IMAGE beats per scene
`;
```

---

## Contact

Questions about this policy: Dave Gargan (dngargan@avantihealthcare.org)
