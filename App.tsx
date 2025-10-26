
import React, { useState } from 'react';
import { InputPanel } from './components/InputPanel';
import { OutputPanel } from './components/OutputPanel';
import { generateSwarmUIPrompt } from './services/geminiService';
import type { SwarmUIPromptOutput, CharacterTrigger, Lora } from './types';
import { AVAILABLE_LORAS, INITIAL_CHARACTER_TRIGGERS, DEFAULT_NARRATIVE, DEFAULT_LOCATION_DATA, DEFAULT_CHARACTER_DATA } from './constants';
import { GithubIcon } from './components/icons';

function App() {
  const [narrative, setNarrative] = useState<string>(DEFAULT_NARRATIVE);
  const [locationData, setLocationData] = useState<string>(DEFAULT_LOCATION_DATA);
  const [characterData, setCharacterData] = useState<string>(DEFAULT_CHARACTER_DATA);
  const [characterTriggers, setCharacterTriggers] = useState<CharacterTrigger[]>(INITIAL_CHARACTER_TRIGGERS);
  const [selectedLoras, setSelectedLoras] = useState<string[]>(['JRUMLV_character', 'HSCEIA_character', 'victorian_street']);

  const [output, setOutput] = useState<SwarmUIPromptOutput | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    setOutput(null);

    try {
      // Validate JSON inputs before sending to API
      JSON.parse(locationData);
      JSON.parse(characterData);
    } catch (e) {
      setError('Invalid JSON in Location or Character data. Please check the syntax.');
      setIsLoading(false);
      return;
    }
    
    try {
      const result = await generateSwarmUIPrompt({
        narrative,
        locationData,
        characterData,
        characterTriggers,
        availableLoras: AVAILABLE_LORAS.filter(lora => selectedLoras.includes(lora.id)),
      });
      setOutput(result);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-screen-2xl mx-auto flex flex-col min-h-screen">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-brand-purple">
            StoryTeller SwarmUI Prompt Architect
          </h1>
          <p className="text-gray-400 mt-2 text-lg">
            Transform narratives into powerful, optimized image generation prompts.
          </p>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-grow">
          <InputPanel
            narrative={narrative}
            setNarrative={setNarrative}
            locationData={locationData}
            setLocationData={setLocationData}
            characterData={characterData}
            setCharacterData={setCharacterData}
            characterTriggers={characterTriggers}
            setCharacterTriggers={setCharacterTriggers}
            availableLoras={AVAILABLE_LORAS}
            selectedLoras={selectedLoras}
            setSelectedLoras={setSelectedLoras}
            onGenerate={handleGenerate}
            isLoading={isLoading}
          />
          <OutputPanel
            output={output}
            isLoading={isLoading}
            error={error}
          />
        </main>
        
        <footer className="text-center mt-12 py-4 border-t border-gray-800">
          <a
            href="https://github.com/DNG-hub/StoryArt"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-300 transition-colors"
          >
            <GithubIcon />
            View Project on GitHub
          </a>
        </footer>
      </div>
    </div>
  );
}

export default App;
