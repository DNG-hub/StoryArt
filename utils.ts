// utils.ts

export function parseEpisodeNumber(scriptText: string): number | null {
  const match = scriptText.match(/^EPISODE:\s*(\d+)/im);
  if (match && match[1]) {
    const episodeNumber = parseInt(match[1], 10);
    return isNaN(episodeNumber) ? null : episodeNumber;
  }
  return null;
}
