/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CAT_DANIEL_STORY_ID: string
  readonly VITE_DATABASE_URL: string
  readonly VITE_GEMINI_API_KEY: string
  readonly VITE_GROQ_API_KEY: string
  readonly VITE_OPENAI_API_KEY: string
  readonly VITE_ANTHROPIC_API_KEY: string
  readonly VITE_SWARMUI_API_URL: string
  readonly VITE_SWARMUI_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}