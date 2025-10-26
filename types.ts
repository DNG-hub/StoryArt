
export interface CharacterTrigger {
  id: string;
  name: string;
  trigger: string;
}

export interface Lora {
  id: string;
  name: string;
}

export interface SwarmUIPromptOutput {
  swarmUIPrompt: string;
  loraTriggersUsed: Array<{
    type: 'Character' | 'Style';
    value: string;
  }>;
  swarmUIParameters: {
    model: string;
    aspectratio: string;
    steps: number;
    cfgscale: number;
    sampler: string;
    scheduler: string;
    seed: number;
  };
  refinementSuggestions: string[];
}
