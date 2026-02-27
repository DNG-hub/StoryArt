/**
 * Skill Parser Service
 *
 * Parses markdown skill files into structured rule objects.
 * Extracts vocabulary, constraints, and guidelines from .md content.
 */

interface FluxVocabularyCatalog {
  shotTypes: Record<string, { term: string; reliability: 'HIGH' | 'MEDIUM-HIGH' | 'MEDIUM'; use: string }>;
  cameraAngles: Record<string, { term: string; effect: string }>;
  poses: Record<string, { pose: string; bestFor: string }>;
  expressions: Record<string, { term: string; description: string }>;
  lighting: Record<string, { term: string; effect: string }>;
  avoidTerms: string[];
}

interface SkillRulesCatalog {
  tokenBudgets: Record<string, { min: number; max: number; description: string }>;
  characterDescriptionRules: string[];
  segmentTagFormat: string;
  compilationOrder: string[];
  loraRules: string[];
  helmetRules: string[];
  constraintSummary: string;
}

interface CinematographerRulesCatalog {
  compositionGuidelines: string;
  actionRules: string;
  expressionRules: string;
  systemInstructionSnippets: string[];
}

class SkillParserService {
  /**
   * Parse FLUX_VOCABULARY.md into structured catalog
   */
  parseFluxVocabulary(content: string): FluxVocabularyCatalog {
    const catalog: FluxVocabularyCatalog = {
      shotTypes: {},
      cameraAngles: {},
      poses: {},
      expressions: {},
      lighting: {},
      avoidTerms: [],
    };

    // Extract SHOT TYPES section
    const shotTypesMatch = content.match(/## SHOT TYPES.*?(?=##|$)/s);
    if (shotTypesMatch) {
      const tableMatches = shotTypesMatch[0].match(/\| `([^`]+)`.*?\| ([^|]+) \|/g);
      if (tableMatches) {
        tableMatches.forEach(match => {
          const [, term, desc] = match.match(/\| `([^`]+)`.*?\| ([^|]+) \|/) || [];
          if (term && desc) {
            catalog.shotTypes[term] = {
              term,
              reliability: 'HIGH',
              use: desc.trim(),
            };
          }
        });
      }
    }

    // Extract CAMERA ANGLES section
    const anglesMatch = content.match(/## CAMERA ANGLES.*?(?=##|$)/s);
    if (anglesMatch) {
      const tableMatches = anglesMatch[0].match(/\| `([^`]+)`.*?\| ([^|]+) \|/g);
      if (tableMatches) {
        tableMatches.forEach(match => {
          const [, term, effect] = match.match(/\| `([^`]+)`.*?\| ([^|]+) \|/) || [];
          if (term && effect) {
            catalog.cameraAngles[term] = {
              term,
              effect: effect.trim(),
            };
          }
        });
      }
    }

    // Extract POSE DESCRIPTIONS section
    const posesMatch = content.match(/## POSE DESCRIPTIONS.*?(?=##|$)/s);
    if (posesMatch) {
      const tableMatches = posesMatch[0].match(/\| `([^`]+)`.*?\| ([^|]+) \|/g);
      if (tableMatches) {
        tableMatches.forEach(match => {
          const [, pose, bestFor] = match.match(/\| `([^`]+)`.*?\| ([^|]+) \|/) || [];
          if (pose && bestFor) {
            catalog.poses[pose] = {
              pose,
              bestFor: bestFor.trim(),
            };
          }
        });
      }
    }

    // Extract EXPRESSION KEYWORDS section
    const expressionsMatch = content.match(/## EXPRESSION KEYWORDS.*?(?=##|$)/s);
    if (expressionsMatch) {
      const lines = expressionsMatch[0].split('\n');
      lines.forEach(line => {
        const match = line.match(/\| `([^`]+)`/);
        if (match) {
          catalog.expressions[match[1]] = {
            term: match[1],
            description: line,
          };
        }
      });
    }

    // Extract LIGHTING section
    const lightingMatch = content.match(/## LIGHTING.*?(?=##|$)/s);
    if (lightingMatch) {
      const tableMatches = lightingMatch[0].match(/\| `([^`]+)`.*?\| ([^|]+) \|/g);
      if (tableMatches) {
        tableMatches.forEach(match => {
          const [, term, effect] = match.match(/\| `([^`]+)`.*?\| ([^|]+) \|/) || [];
          if (term && effect) {
            catalog.lighting[term] = {
              term,
              effect: effect.trim(),
            };
          }
        });
      }
    }

    // Extract AVOID TERMS section
    const avoidMatch = content.match(/## TERMS TO AVOID.*?(?=##|$)/s);
    if (avoidMatch) {
      const tableMatches = avoidMatch[0].match(/\| `([^`]+)`/g);
      if (tableMatches) {
        catalog.avoidTerms = tableMatches.map(m => m.replace(/\| `|`/g, ''));
      }
    }

    return catalog;
  }

  /**
   * Parse SKILL.md into structured rules
   */
  parseSkillRules(content: string): SkillRulesCatalog {
    const catalog: SkillRulesCatalog = {
      tokenBudgets: {},
      characterDescriptionRules: [],
      segmentTagFormat: '',
      compilationOrder: [],
      loraRules: [],
      helmetRules: [],
      constraintSummary: '',
    };

    // Extract token budget info
    const budgetMatch = content.match(/token.*?budget.*?\d+.*?\d+/i);
    if (budgetMatch) {
      catalog.tokenBudgets['default'] = {
        min: 140,
        max: 182,
        description: 'Target token range for dual-character scenes',
      };
      catalog.tokenBudgets['single-character'] = {
        min: 100,
        max: 150,
        description: 'Single character scene token range',
      };
    }

    // Extract segment tag format
    const segmentMatch = content.match(/segment:yolo-face[^\n]+/);
    if (segmentMatch) {
      catalog.segmentTagFormat = segmentMatch[0];
    }

    // Extract LoRA trigger rules
    const loraMatch = content.match(/LoRA.*?trigger.*?(?=\n\n|##)/is);
    if (loraMatch) {
      catalog.loraRules.push(loraMatch[0]);
    }

    // Extract helmet rules
    const helmetMatch = content.match(/helmet.*?(?=\n\n|##)/is);
    if (helmetMatch) {
      catalog.helmetRules.push(helmetMatch[0]);
    }

    // Extract compilation order
    const orderMatch = content.match(/strict.*?order.*?\n.*?(?=\n\n|##)/is);
    if (orderMatch) {
      catalog.compilationOrder = orderMatch[0]
        .split('\n')
        .filter(line => line.trim().startsWith('['))
        .map(line => line.trim());
    }

    // Extract character description rules
    const charMatch = content.match(/character.*?description.*?(?=\n\n|##)/is);
    if (charMatch) {
      const rules = charMatch[0].split('\n').filter(line => line.includes('-'));
      catalog.characterDescriptionRules = rules.map(r => r.replace(/^-\s*/, '').trim());
    }

    return catalog;
  }

  /**
   * Parse CINEMATOGRAPHER_RULES.md
   */
  parseCinematographerRules(content: string): CinematographerRulesCatalog {
    const catalog: CinematographerRulesCatalog = {
      compositionGuidelines: '',
      actionRules: '',
      expressionRules: '',
      systemInstructionSnippets: [],
    };

    // Extract composition guidelines
    const compMatch = content.match(/composition.*?(?=\n\n|##)/is);
    if (compMatch) {
      catalog.compositionGuidelines = compMatch[0];
    }

    // Extract action rules
    const actionMatch = content.match(/action.*?(?=\n\n|##)/is);
    if (actionMatch) {
      catalog.actionRules = actionMatch[0];
    }

    // Extract expression rules
    const exprMatch = content.match(/expression.*?(?=\n\n|##)/is);
    if (exprMatch) {
      catalog.expressionRules = exprMatch[0];
    }

    // Extract key instruction snippets
    const snippets = content.match(/RULES:.*?\n\n/s);
    if (snippets) {
      catalog.systemInstructionSnippets.push(snippets[0]);
    }

    return catalog;
  }

  /**
   * Validate a term against FLUX vocabulary
   */
  isValidFluxTerm(
    term: string,
    catalog: FluxVocabularyCatalog,
    type: 'shot' | 'angle' | 'pose' | 'expression' | 'lighting'
  ): boolean {
    const normalized = term.toLowerCase();

    switch (type) {
      case 'shot':
        return Object.keys(catalog.shotTypes).some(
          key => key.toLowerCase().includes(normalized) || normalized.includes(key.toLowerCase())
        );
      case 'angle':
        return Object.keys(catalog.cameraAngles).some(
          key => key.toLowerCase().includes(normalized) || normalized.includes(key.toLowerCase())
        );
      case 'pose':
        return Object.keys(catalog.poses).some(
          key => key.toLowerCase().includes(normalized) || normalized.includes(key.toLowerCase())
        );
      case 'expression':
        return Object.keys(catalog.expressions).some(
          key => key.toLowerCase().includes(normalized) || normalized.includes(key.toLowerCase())
        );
      case 'lighting':
        return Object.keys(catalog.lighting).some(
          key => key.toLowerCase().includes(normalized) || normalized.includes(key.toLowerCase())
        );
      default:
        return false;
    }
  }

  /**
   * Check if term is in avoid list
   */
  isAvoidedTerm(term: string, avoidTerms: string[]): boolean {
    const normalized = term.toLowerCase();
    return avoidTerms.some(avoid => avoid.toLowerCase().includes(normalized));
  }
}

export const skillParserService = new SkillParserService();
export type { FluxVocabularyCatalog, SkillRulesCatalog, CinematographerRulesCatalog };
