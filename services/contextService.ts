// services/contextService.ts
import { getToken } from './authService';

// Support both Vite (browser) and Node.js environments
const BASE_URL = (typeof process !== 'undefined' && process.env?.VITE_STORYTELLER_API_URL)
  || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_STORYTELLER_API_URL)
  || "http://localhost:8000";

// Types for episode list and script responses
export interface EpisodeListItem {
  episode_id: string;
  episode_number: number;
  episode_title: string;
  scene_count?: number;
  status?: string;
}

export interface EpisodeScriptResponse {
  success: boolean;
  episode_id: string;
  episode_number: number;
  standardized_script: string;
  metadata?: {
    generated_at: string;
    scene_count: number;
  };
}

/**
 * Fetches the list of episodes for a given story from the StoryTeller API
 * Uses the V2 StoryArt endpoint which queries roadmap_episodes (canonical table)
 */
export async function getEpisodeList(storyId: string): Promise<EpisodeListItem[]> {
  let token: string;
  try {
    token = await getToken();
  } catch (error) {
    if (error instanceof Error && error.message.includes('Backend server unavailable')) {
      throw new Error('Cannot fetch episode list: Backend server is not running. Please start the StoryTeller API server.');
    }
    throw error;
  }

  // Use V2 StoryArt endpoint - queries roadmap_episodes (canonical table)
  const url = `${BASE_URL}/api/v2/storyart/episodes/${storyId}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const errorMessage = errorBody.detail || errorBody.error || `HTTP Error: ${response.status}`;
      throw new Error(`Failed to fetch episode list. ${errorMessage}`);
    }

    const result = await response.json();

    // Response format: { success, story_id, total_episodes, episodes: [...] }
    if (result.success && result.episodes && Array.isArray(result.episodes)) {
      return result.episodes.map((ep: any) => ({
        episode_id: ep.episode_id,
        episode_number: ep.episode_number,
        episode_title: ep.episode_title,
        scene_count: 4, // Standard 4 scenes per episode
        status: 'active',
      }));
    }

    return [];
  } catch (error) {
    console.error("Episode list request failed:", error);
    throw error;
  }
}

/**
 * Fetches the standardized script for a specific episode from the StoryTeller API (V2)
 */
export async function getEpisodeScript(storyId: string, episodeNumber: number): Promise<EpisodeScriptResponse> {
  let token: string;
  try {
    token = await getToken();
  } catch (error) {
    if (error instanceof Error && error.message.includes('Backend server unavailable')) {
      throw new Error('Cannot fetch episode script: Backend server is not running. Please start the StoryTeller API server.');
    }
    throw error;
  }

  // Use V2 script endpoint which generates script from V2 scene content
  const url = `${BASE_URL}/api/v2/stories/${storyId}/episodes/${episodeNumber}/standardized-script`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const errorMessage = errorBody.detail || errorBody.error || `HTTP Error: ${response.status}`;
      throw new Error(`Failed to fetch episode script. ${errorMessage}`);
    }

    const result = await response.json();

    // V2 response format: { success, episode_id, episode_number, standardized_script, metadata }
    if (result.success) {
      return result;
    } else {
      throw new Error(`Failed to fetch script: ${result.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.error("Episode script request failed:", error);
    throw error;
  }
}

export async function getEpisodeContext(storyId: string, episodeNumber: number): Promise<any> {
  let token: string;
  try {
    token = await getToken();
  } catch (error) {
    // If token fetch fails (e.g., backend not running), provide a helpful error
    if (error instanceof Error && error.message.includes('Backend server unavailable')) {
      throw new Error('Cannot fetch episode context: Backend server is not running. Please start the StoryTeller API server.');
    }
    throw error;
  }

  // Use V2 StoryArt-specific endpoint (reads from canonical tables)
  const url = `${BASE_URL}/api/v2/storyart/episode-context/${storyId}/${episodeNumber}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const errorMessage = errorBody.detail || errorBody.error || `HTTP Error: ${response.status}`;
      throw new Error(`Failed to fetch episode context. ${errorMessage}`);
    }

    const result = await response.json();

    // V2 StoryArt response format: { success, context: { episode: {...} } }
    if (result.success && result.context) {
      // Enhanced logging for location override debugging
      const episode = result.context.episode;
      console.log('StoryTeller API Response Structure:', {
        hasEpisode: !!episode,
        episodeKeys: episode ? Object.keys(episode) : [],
        hasScenes: !!episode?.scenes,
        sceneCount: episode?.scenes?.length || 0,
        hasCharacters: !!episode?.characters,
        characterCount: episode?.characters?.length || 0
      });

      // Analyze location overrides in response
      if (episode?.scenes) {
        console.log('\nLOCATION OVERRIDE ANALYSIS:');
        episode.scenes.forEach((scene: any, idx: number) => {
          const sceneChars = scene.characters || [];
          const sceneApps = scene.character_appearances || [];
          const totalChars = sceneChars.length + sceneApps.length;
          let overrideCount = 0;

          [...sceneChars, ...sceneApps].forEach((char: any) => {
            const locCtx = char.location_context || char;
            if (locCtx?.swarmui_prompt_override) {
              overrideCount++;
              console.log(`   OK Scene ${scene.scene_number}: ${char.name || char.character_name} has override`);
              const preview = locCtx.swarmui_prompt_override.substring(0, 60) + '...';
              console.log(`      "${preview}"`);
            }
          });

          if (totalChars > 0 && overrideCount === 0) {
            console.log(`   WARN Scene ${scene.scene_number}: ${totalChars} character(s) but NO overrides found`);
          }
        });
        console.log('');
      }

      return result.context;
    } else {
      throw new Error(`API Error: ${result.error || 'Unknown error occurred while fetching context.'}`);
    }
  } catch (error) {
    console.error("Context request failed:", error);
    throw error;
  }
}
