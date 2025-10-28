// services/contextService.ts
import { getToken } from './authService';

const BASE_URL = import.meta.env.VITE_STORYTELLER_API_URL || "http://localhost:8000";

export async function getEpisodeContext(storyId: string, episodeNumber: number): Promise<any> {
  const token = await getToken();
  const url = `${BASE_URL}/api/v1/scene-context/extract-episode-context`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        story_id: storyId,
        episode_number: episodeNumber,
      }),
    });

    if (!response.ok) {
        const errorBody = await response.json();
        const errorMessage = errorBody.error || `HTTP Error: ${response.status}`;
        throw new Error(`Failed to fetch episode context. ${errorMessage}`);
    }

    const result = await response.json();
    if (result.success && result.data) {
      console.log('StoryTeller API Response Structure:', {
        hasEpisode: !!result.data.episode,
        episodeKeys: result.data.episode ? Object.keys(result.data.episode) : [],
        hasScenes: !!result.data.episode?.scenes,
        sceneCount: result.data.episode?.scenes?.length || 0,
        hasCharacters: !!result.data.episode?.characters,
        characterCount: result.data.episode?.characters?.length || 0
      });
      return result.data;
    } else {
      throw new Error(`API Error: ${result.error || 'Unknown error occurred while fetching context.'}`);
    }
  } catch (error) {
    console.error("Context request failed:", error);
    throw error;
  }
}
