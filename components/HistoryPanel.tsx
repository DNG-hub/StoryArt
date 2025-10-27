import React from 'react';
import type { HistoryEntry } from '../types';
import { HistoryIcon, LoadIcon, DeleteIcon } from './icons';

interface HistoryPanelProps {
  history: HistoryEntry[];
  selectedId: string | null;
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
}

const HistoryItem: React.FC<{
    entry: HistoryEntry;
    isSelected: boolean;
    onLoad: (id: string) => void;
    onDelete: (id: string) => void;
}> = ({ entry, isSelected, onLoad, onDelete }) => {
    const formattedDate = new Date(entry.timestamp).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
    
    const title = entry.output.scenes[0]?.title || 'Analysis';

    return (
        <div className={`p-3 rounded-lg transition-all ${isSelected ? 'bg-brand-blue/30 border-brand-blue' : 'bg-gray-900/70 border-gray-700 hover:border-gray-600'} border`}>
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-xs text-gray-400">{formattedDate}</p>
                    <p className="text-sm font-semibold text-gray-200 mt-1 line-clamp-1" title={`Scene 1: ${title}`}>
                        {`Ep ${entry.output.episodeNumber}: ${entry.output.title}`}
                    </p>
                     <p className="text-xs text-gray-400 mt-1 line-clamp-1" title={entry.inputs.scriptText}>
                        {entry.inputs.scriptText.substring(0, 50)}...
                    </p>
                </div>
                <div className="flex gap-1.5 flex-shrink-0 ml-2 mt-2">
                    <button 
                        onClick={() => onLoad(entry.id)} 
                        className="p-1.5 text-blue-400 hover:text-blue-300 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors" 
                        aria-label="Load history item"
                        title="Load"
                    >
                        <LoadIcon />
                    </button>
                    <button 
                        onClick={() => onDelete(entry.id)} 
                        className="p-1.5 text-red-400 hover:text-red-300 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors" 
                        aria-label="Delete history item"
                        title="Delete"
                    >
                        <DeleteIcon />
                    </button>
                </div>
            </div>
        </div>
    );
};


export const HistoryPanel: React.FC<HistoryPanelProps> = ({ history, selectedId, onLoad, onDelete, onClear }) => {
  return (
    <div className="bg-gray-800/50 p-6 rounded-lg shadow-lg h-full flex flex-col">
      <h2 className="text-2xl font-semibold mb-4 text-brand-purple flex items-center gap-2">
        <HistoryIcon />
        Analysis History
      </h2>
      
      {history.length === 0 ? (
        <div className="flex-grow flex items-center justify-center text-center text-gray-500">
            <p>Analyze a script to see its history here.</p>
        </div>
      ) : (
        <div className="flex-grow overflow-y-auto space-y-3 pr-2 -mr-2">
            {history.map(entry => (
                <HistoryItem 
                    key={entry.id}
                    entry={entry}
                    isSelected={selectedId === entry.id}
                    onLoad={onLoad}
                    onDelete={onDelete}
                />
            ))}
        </div>
      )}

      {history.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-700">
            <button
                onClick={onClear}
                className="w-full text-sm text-red-400 hover:text-red-300 bg-red-900/50 hover:bg-red-900/80 py-2 px-3 rounded-md transition-colors"
            >
                Clear All History
            </button>
        </div>
      )}
    </div>
  );
};