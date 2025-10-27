// services/contextService.ts
import { getToken } from './authService';

const BASE_URL = "http://localhost:8000";

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
      return result.data;
    } else {
      throw new Error(`API Error: ${result.error || 'Unknown error occurred while fetching context.'}`);
    }
  } catch (error) {
    console.error("Context request failed:", error);
    throw error;
  }
}
