
import type { Lora, CharacterTrigger } from './types';

export const AVAILABLE_LORAS: Lora[] = [
  { id: 'elara_elf', name: 'elara_elf' },
  { id: 'victorian_street', name: 'victorian_street' },
  { id: 'magical_glow', name: 'magical_glow' },
  { id: 'JRUMLV_character', name: 'JRUMLV_character' },
  { id: 'HSCEIA_character', name: 'HSCEIA_character' },
];

export const INITIAL_CHARACTER_TRIGGERS: CharacterTrigger[] = [
    { id: '1', name: 'Cat Mitchell, Catherine Mitchell, Cat character', trigger: 'JRUMLV woman' },
    { id: '2', name: 'Daniel O\'Brien, Dan character', trigger: 'HSCEIA man' },
];

export const DEFAULT_NARRATIVE = `In the rain-slicked, neon-drenched streets of Neo-Kyoto, Cat Mitchell, a rogue data-thief, sprints through a crowded market. She clutches a stolen data chip, her tech-augmented coat shimmering under the holographic ads. Daniel O'Brien, a corporate enforcer, is in hot pursuit, his face a mask of cold determination as he pushes through the throng, his hand reaching for the stun baton on his belt. The air is thick with the smell of sizzling street food and ozone.`;

export const DEFAULT_LOCATION_DATA = `{
  "name": "Neo-Kyoto Market",
  "weather": "heavy rain",
  "architecture": "cyberpunk, traditional Japanese fusion",
  "timeOfDay": "night",
  "atmosphere": "chaotic, vibrant, dangerous",
  "lighting": "neon signs, holographic ads, reflections on wet pavement"
}`;

export const DEFAULT_CHARACTER_DATA = `[
  {
    "name": "Cat Mitchell",
    "pose": "sprinting, looking back over her shoulder",
    "expression": "desperate, determined",
    "clothing": "sleek, dark, tech-augmented trench coat",
    "interaction": "fleeing from Daniel"
  },
  {
    "name": "Daniel O'Brien",
    "pose": "forcefully moving through a crowd, reaching for a weapon",
    "expression": "focused, angry",
    "clothing": "armored corporate security uniform",
    "interaction": "pursuing Cat"
  }
]`;
