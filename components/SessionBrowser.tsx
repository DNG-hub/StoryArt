import React, { useState, useEffect } from 'react';
import type { SessionListItem } from '../services/redisService';
import { getSessionList } from '../services/redisService';

interface SessionBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  onRestoreSession: (timestamp: number) => Promise<void>;
}

export const SessionBrowser: React.FC<SessionBrowserProps> = ({
  isOpen,
  onClose,
  onRestoreSession,
}) => {
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimestamp, setSelectedTimestamp] = useState<number | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSessions();
      // Auto-select the latest session (first in the list)
      setSelectedTimestamp(null); // Reset selection first
    }
  }, [isOpen]);

  // Auto-select latest session when sessions are loaded
  useEffect(() => {
    if (sessions.length > 0 && !selectedTimestamp) {
      setSelectedTimestamp(sessions[0].timestamp);
    }
  }, [sessions]);

  const loadSessions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getSessionList();
      if (response.success && response.sessions) {
        setSessions(response.sessions);
      } else {
        setError(response.error || 'Failed to load sessions');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!selectedTimestamp) return;

    setIsRestoring(true);
    try {
      await onRestoreSession(selectedTimestamp);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore session');
    } finally {
      setIsRestoring(false);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getPreviewText = (text: string, maxLength: number = 100) => {
    if (!text) return 'No script text';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const getEpisodeInfo = (session: SessionListItem) => {
    if (session.analyzedEpisode?.episodeNumber && session.analyzedEpisode?.title) {
      return `Episode ${session.analyzedEpisode.episodeNumber}: ${session.analyzedEpisode.title}`;
    }
    if (session.analyzedEpisode?.episodeNumber) {
      return `Episode ${session.analyzedEpisode.episodeNumber}`;
    }
    return 'No episode info';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-gray-700">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-brand-blue">Session Browser</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <svg className="animate-spin h-8 w-8 text-brand-blue" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="ml-3 text-gray-400">Loading sessions...</span>
            </div>
          ) : error ? (
            <div className="bg-red-900/20 border border-red-700 text-red-200 p-4 rounded-md">
              <p>{error}</p>
              <button
                onClick={loadSessions}
                className="mt-3 px-4 py-2 bg-red-800 hover:bg-red-700 rounded-md transition-colors"
              >
                Retry
              </button>
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">No saved sessions found.</p>
              <p className="text-sm mt-2">Sessions will appear here after you run analysis.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => {
                const isSelected = selectedTimestamp === session.timestamp;
                const isLatest = sessions.indexOf(session) === 0;

                return (
                  <div
                    key={session.timestamp}
                    onClick={() => setSelectedTimestamp(session.timestamp)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-brand-blue bg-brand-blue/10'
                        : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-200">
                          {formatDate(session.timestamp)}
                        </h3>
                        {isLatest && (
                          <span className="px-2 py-0.5 text-xs bg-green-800 text-green-200 rounded-full">
                            Latest
                          </span>
                        )}
                      </div>
                      {isSelected && (
                        <svg className="w-5 h-5 text-brand-blue" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div className="space-y-1 text-sm">
                      <p className="text-gray-400">
                        <span className="font-semibold">Episode:</span> {getEpisodeInfo(session)}
                      </p>
                      <p className="text-gray-400">
                        <span className="font-semibold">Story UUID:</span> {session.storyUuid.substring(0, 8)}...
                      </p>
                      <p className="text-gray-500 text-xs mt-2 italic">
                        {getPreviewText(session.scriptText)}
                      </p>
                      {session.analyzedEpisode?.scenes && (
                        <p className="text-gray-400 text-xs mt-1">
                          <span className="font-semibold">Scenes:</span> {session.analyzedEpisode.scenes.length}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
            disabled={isRestoring}
          >
            Cancel
          </button>
          <button
            onClick={handleRestore}
            disabled={!selectedTimestamp || isRestoring}
            className="px-4 py-2 bg-brand-blue hover:bg-brand-purple rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isRestoring ? (
              <>
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Restoring...
              </>
            ) : (
              'Restore Selected Session'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

