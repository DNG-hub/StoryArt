
import React from 'react';
import type { CharacterTrigger, Lora } from '../types';
import { AddIcon, DeleteIcon, GenerateIcon } from './icons';

interface InputPanelProps {
  narrative: string;
  setNarrative: (value: string) => void;
  locationData: string;
  setLocationData: (value: string) => void;
  characterData: string;
  setCharacterData: (value: string) => void;
  characterTriggers: CharacterTrigger[];
  setCharacterTriggers: (triggers: CharacterTrigger[]) => void;
  availableLoras: Lora[];
  selectedLoras: string[];
  setSelectedLoras: (loras: string[]) => void;
  onGenerate: () => void;
  isLoading: boolean;
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="bg-gray-800/50 p-6 rounded-lg shadow-lg">
    <h2 className="text-2xl font-semibold mb-4 text-brand-purple">{title}</h2>
    {children}
  </div>
);

const LabeledTextarea: React.FC<{ label: string; value: string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void; rows: number, placeholder?: string }> = ({ label, value, onChange, rows, placeholder }) => (
    <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
        <textarea
            value={value}
            onChange={onChange}
            rows={rows}
            placeholder={placeholder}
            className="w-full bg-gray-900 border border-gray-700 rounded-md p-3 text-gray-200 focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition duration-200"
        />
    </div>
);

export const InputPanel: React.FC<InputPanelProps> = ({
  narrative, setNarrative,
  locationData, setLocationData,
  characterData, setCharacterData,
  characterTriggers, setCharacterTriggers,
  availableLoras, selectedLoras, setSelectedLoras,
  onGenerate, isLoading
}) => {

  const handleTriggerChange = (id: string, field: 'name' | 'trigger', value: string) => {
    setCharacterTriggers(characterTriggers.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const addTrigger = () => {
    setCharacterTriggers([...characterTriggers, { id: Date.now().toString(), name: '', trigger: '' }]);
  };

  const removeTrigger = (id: string) => {
    setCharacterTriggers(characterTriggers.filter(t => t.id !== id));
  };

  const handleLoraToggle = (loraId: string) => {
    setSelectedLoras(
      selectedLoras.includes(loraId)
        ? selectedLoras.filter(id => id !== loraId)
        : [...selectedLoras, loraId]
    );
  };

  return (
    <div className="space-y-8 flex flex-col">
      <Section title="1. Narrative & Context">
        <div className="space-y-4">
            <LabeledTextarea label="Episode Narrative" value={narrative} onChange={(e) => setNarrative(e.target.value)} rows={8} placeholder="Enter the story scene..."/>
            <LabeledTextarea label="Location Data (JSON)" value={locationData} onChange={(e) => setLocationData(e.target.value)} rows={6} />
            <LabeledTextarea label="Character Data (JSON)" value={characterData} onChange={(e) => setCharacterData(e.target.value)} rows={6} />
        </div>
      </Section>
      
      <Section title="2. Prompt Configuration">
         <div>
            <h3 className="text-lg font-medium text-gray-300 mb-3">Character Triggers</h3>
            <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                {characterTriggers.map(trigger => (
                    <div key={trigger.id} className="flex items-center gap-2">
                        <input
                            type="text"
                            placeholder="Character Name/Alias"
                            value={trigger.name}
                            onChange={(e) => handleTriggerChange(trigger.id, 'name', e.target.value)}
                            className="flex-grow bg-gray-900 border border-gray-700 rounded-md p-2 text-sm text-gray-200 focus:ring-1 focus:ring-brand-blue"
                        />
                        <input
                            type="text"
                            placeholder="Trigger Phrase"
                            value={trigger.trigger}
                            onChange={(e) => handleTriggerChange(trigger.id, 'trigger', e.target.value)}
                            className="flex-grow bg-gray-900 border border-gray-700 rounded-md p-2 text-sm text-gray-200 focus:ring-1 focus:ring-brand-blue"
                        />
                        <button onClick={() => removeTrigger(trigger.id)} className="p-2 text-red-400 hover:text-red-300 transition-colors" aria-label="Remove trigger"><DeleteIcon /></button>
                    </div>
                ))}
            </div>
            <button onClick={addTrigger} className="mt-3 flex items-center gap-2 text-sm text-brand-blue hover:text-blue-400 transition-colors">
                <AddIcon /> Add Trigger
            </button>
        </div>
        <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-300 mb-3">Available LoRAs</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {availableLoras.map(lora => (
                    <label key={lora.id} className="flex items-center space-x-2 bg-gray-900 p-2 rounded-md border border-gray-700 hover:border-brand-blue cursor-pointer transition-colors">
                        <input
                            type="checkbox"
                            checked={selectedLoras.includes(lora.id)}
                            onChange={() => handleLoraToggle(lora.id)}
                            className="form-checkbox h-4 w-4 rounded bg-gray-800 border-gray-600 text-brand-purple focus:ring-brand-purple"
                        />
                        <span className="text-sm text-gray-300">{lora.name}</span>
                    </label>
                ))}
            </div>
        </div>
      </Section>

      <div className="sticky bottom-0 py-4 bg-gray-900">
        <button
          onClick={onGenerate}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-brand-blue to-brand-purple text-white font-bold py-3 px-4 rounded-lg shadow-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
        >
          {isLoading ? (
            <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating...
            </>
          ) : (
            <>
                <GenerateIcon />
                Architect Prompt
            </>
          )}
        </button>
      </div>
    </div>
  );
};
