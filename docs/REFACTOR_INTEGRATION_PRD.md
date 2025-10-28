# Refactor Integration PRD
## StoryArt Beat Analysis & SwarmUI Integration

### **Project Status & Context**
- **Current Repository:** StoryArt (this repo) - has refactor version with reuse logic
- **Vibe Platform:** Google AI Builder - has enhanced SwarmUI features (not yet pushed)
- **Integration Challenge:** Vibe can only push to GitHub, cannot pull changes

---

## **Problem Statement**

### **Current Issues Identified:**
1. **Beat #1 (Refactor Version - 4cf4a99):**
   - ✅ **Good:** 55 beats, 11-14 second dwell times, 64% reuse rate
   - ❌ **Bad:** Reuse criteria too aggressive (reusing when shouldn't)

2. **Beat #2 (Current Version - d3d78d6):**
   - ✅ **Good:** Enhanced SwarmUI integration, better UI/UX
   - ❌ **Bad:** Only 11 beats, 5.5 second dwell times, 0% reuse rate

### **Root Cause:**
The refactor version has the right granularity and reuse logic but needs stricter reuse criteria. The current version has better SwarmUI features but lost the reuse logic entirely.

---

## **Solution Requirements**

### **Target State:**
- **Beat Detection:** 55 beats (refactor granularity)
- **Dwell Times:** 11-14 seconds per image (comfortable viewing)
- **Reuse Rate:** 30-40% (stricter criteria than current 64%)
- **SwarmUI Integration:** Enhanced features from Vibe platform
- **User Experience:** Professional production pipeline feel

---

## **Technical Implementation Plan**

### **Phase 1: Restore Refactor Base (This Repository)**
1. **Restore refactor version (4cf4a99)** with reuse logic
2. **Modify reuse criteria** to be stricter:
   - Only reuse when characters are in same location
   - Only reuse when camera angle is similar
   - Only reuse when visual context is identical
   - Reduce reuse rate from 64% to 30-40%

### **Phase 2: Integrate Vibe Enhancements**
1. **Wait for Vibe push** to see new SwarmUI improvements
2. **Manually integrate** key Vibe features:
   - Enhanced SwarmUI prompt generation
   - Improved UI/UX components
   - Better progress tracking
   - Style configuration

### **Phase 3: Testing & Validation**
1. **Test beat analysis** with sample scripts
2. **Validate reuse logic** produces 30-40% reuse rate
3. **Verify dwell times** are 11-14 seconds per image
4. **Confirm SwarmUI integration** works properly

---

## **Key Files to Modify**

### **Core Logic Files:**
- `services/geminiService.ts` - Reuse logic with stricter criteria
- `types.ts` - ImageDecision types for reuse tracking
- `utils.ts` - compactEpisodeContext function

### **UI/UX Files (from Vibe):**
- `components/OutputPanel.tsx` - SwarmUI prompt display
- `components/InputPanel.tsx` - Style configuration
- `App.tsx` - Two-stage processing workflow
- `services/promptGenerationService.ts` - SwarmUI integration

---

## **Success Criteria**

### **Functional Requirements:**
- [ ] Beat detection creates 50-60 beats per scene
- [ ] Reuse rate is 30-40% (not 64% or 0%)
- [ ] Dwell times are 11-14 seconds per new image
- [ ] SwarmUI prompts generate for NEW_IMAGE beats only
- [ ] Progress tracking shows analysis steps

### **User Experience Requirements:**
- [ ] Comfortable viewing pace (not rushed)
- [ ] Professional production pipeline feel
- [ ] Clear reuse decisions with reasoning
- [ ] Easy prompt copying and management

---

## **Next Steps**

### **Immediate Actions:**
1. **Wait for Vibe push** to see new SwarmUI improvements
2. **Restore refactor version** in this repository
3. **Modify reuse criteria** to be stricter
4. **Test with sample scripts** to validate approach

### **Integration Strategy:**
1. **Use this repository** as source of truth for refactor logic
2. **Manually copy** working files to Vibe project
3. **Test integration** in Vibe environment
4. **Deploy** from Vibe platform

---

## **Risk Mitigation**

### **Potential Issues:**
- **Vibe limitations:** Cannot pull changes, only push
- **Manual integration:** Risk of missing files or conflicts
- **Testing complexity:** Need to validate in both environments

### **Mitigation Strategies:**
- **Document all changes** in this PRD
- **Create file checklist** for manual integration
- **Test thoroughly** before final deployment
- **Maintain backup** of working versions

---

## **Notes for Next Session**

### **Context to Remember:**
- Repository has refactor version (4cf4a99) with reuse logic
- Vibe platform has enhanced SwarmUI features (not yet pushed)
- Need to combine best of both: refactor granularity + Vibe enhancements
- Target: 30-40% reuse rate with 11-14 second dwell times

### **Files to Focus On:**
- `services/geminiService.ts` - Core reuse logic
- `types.ts` - ImageDecision types
- `utils.ts` - compactEpisodeContext
- Vibe SwarmUI integration files (after push)

### **Key Metrics:**
- **Beats:** 50-60 per scene (not 11)
- **Reuse Rate:** 30-40% (not 64% or 0%)
- **Dwell Time:** 11-14 seconds per image (not 5.5)
- **User Experience:** Professional, not rushed

---

*This PRD serves as the single source of truth for the refactor integration project. Update as needed when Vibe improvements are pushed and integration progresses.*
