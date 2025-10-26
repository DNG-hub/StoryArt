
import React, { useState } from 'react';
import type { SwarmUIPromptOutput } from '../types';
import { CopyIcon, CheckIcon, LightbulbIcon } from './icons';

interface OutputPanelProps {
  output: SwarmUIPromptOutput | null;
  isLoading: boolean;
  error: string | null;
}

const OutputSection: React.FC<{ title: string; children: React.ReactNode, extraClasses?: string }> = ({ title, children, extraClasses = '' }) => (
    <div className={`bg-gray-800/50 p-6 rounded-lg shadow-lg ${extraClasses}`}>
        <h2 className="text-xl font-semibold mb-4 text-brand-blue">{title}</h2>
        {children}
    </div>
);

const CodeBlock: React.FC<{ content: string }> = ({ content }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="relative bg-gray-900 p-4 rounded-md border border-gray-700">
            <pre className="text-sm text-gray-300 whitespace-pre-wrap break-words font-mono">
                <code>{content}</code>
            </pre>
            <button
                onClick={handleCopy}
                className="absolute top-2 right-2 p-1.5 bg-gray-700 hover:bg-gray-600 rounded-md text-gray-300 transition-colors"
                aria-label="Copy to clipboard"
            >
                {copied ? <CheckIcon /> : <CopyIcon />}
            </button>
        </div>
    );
};


export const OutputPanel: React.FC<OutputPanelProps> = ({ output, isLoading, error }) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-800/50 rounded-lg p-6 min-h-[500px]">
        <div className="text-center">
            <svg className="animate-spin mx-auto h-12 w-12 text-brand-purple" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="mt-4 text-lg text-gray-300">Architecting your vision...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/50 border border-red-700 text-red-200 p-6 rounded-lg">
        <h2 className="text-2xl font-bold mb-2">Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!output) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-800/50 rounded-lg p-6 min-h-[500px]">
        <div className="text-center text-gray-500">
          <h2 className="text-2xl font-semibold">Your Prompt Awaits</h2>
          <p className="mt-2">Fill in the details and click "Architect Prompt" to begin.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
        <OutputSection title="SwarmUI Flux Prompt">
            <p className="bg-gray-900 p-4 rounded-md border border-gray-700 text-gray-200 text-base leading-relaxed">
                {output.swarmUIPrompt}
            </p>
        </OutputSection>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <OutputSection title="LoRA Triggers Used">
                 <ul className="space-y-2">
                    {output.loraTriggersUsed.map((lora, index) => (
                        <li key={index} className="flex items-center justify-between bg-gray-900 p-2 rounded-md">
                            <span className="text-gray-400 text-sm">{lora.type}:</span>
                            <code className="text-brand-blue text-sm">{lora.value}</code>
                        </li>
                    ))}
                </ul>
            </OutputSection>
            
            <OutputSection title="Refinement Prep">
                <ul className="space-y-3">
                    {output.refinementSuggestions.map((suggestion, index) => (
                        <li key={index} className="flex items-start gap-3">
                            <span className="text-brand-purple mt-1"><LightbulbIcon /></span>
                            <span className="text-gray-300 text-sm">{suggestion}</span>
                        </li>
                    ))}
                </ul>
            </OutputSection>
        </div>
        
        <OutputSection title="SwarmUI Parameters">
            <CodeBlock content={JSON.stringify(output.swarmUIParameters, null, 2)} />
        </OutputSection>
    </div>
  );
};
