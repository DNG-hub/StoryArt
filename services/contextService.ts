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
      // Enhanced logging for location override debugging
      const episode = result.data.episode;
      console.log('📋 StoryTeller API Response Structure:', {
        hasEpisode: !!episode,
        episodeKeys: episode ? Object.keys(episode) : [],
        hasScenes: !!episode?.scenes,
        sceneCount: episode?.scenes?.length || 0,
        hasCharacters: !!episode?.characters,
        characterCount: episode?.characters?.length || 0
      });

      // Analyze location overrides in response
      if (episode?.scenes) {
        console.log('\n🔍 LOCATION OVERRIDE ANALYSIS:');
        episode.scenes.forEach((scene: any, idx: number) => {
          const sceneChars = scene.characters || [];
          const sceneApps = scene.character_appearances || [];
          const totalChars = sceneChars.length + sceneApps.length;
          let overrideCount = 0;

          [...sceneChars, ...sceneApps].forEach((char: any) => {
            const locCtx = char.location_context || char;
            if (locCtx?.swarmui_prompt_override) {
              overrideCount++;
              console.log(`   ✅ Scene ${scene.scene_number}: ${char.name || char.character_name} has override`);
              const preview = locCtx.swarmui_prompt_override.substring(0, 60) + '...';
              console.log(`      "${preview}"`);
            }
          });

          if (totalChars > 0 && overrideCount === 0) {
            console.log(`   ⚠️  Scene ${scene.scene_number}: ${totalChars} character(s) but NO overrides found`);
          }
        });
        console.log('');
      }

      return result.data;
    } else {
      throw new Error(`API Error: ${result.error || 'Unknown error occurred while fetching context.'}`);
    }
  } catch (error) {
    console.error("Context request failed:", error);
    throw error;
  }
}
