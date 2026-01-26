// constants.ts
// These are empty templates - ALL data must be supplied through the Episode Context JSON
// In Manual mode: User pastes complete Episode Context JSON
// In Database mode: System assembles Episode Context from PostgreSQL tables

export const DEFAULT_EPISODE_CONTEXT = `{
  "episode": {
    "episode_number": 0,
    "episode_title": "",
    "episode_summary": "",
    "characters": [],
    "scenes": []
  }
}`;

export const DEFAULT_SCRIPT = ``;
