#!/usr/bin/env python3
"""
Narrative Bible Exporter
Exports story universe data + roadmap instructions + tactical execution continuity.
Usage: python export_narrative_bible.py "Cat & Daniel"
"""
import sys
import asyncio
import os
import json
from datetime import datetime
from typing import Dict, Any, List
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv

# Reusing the robust connection string logic
FALLBACK_URL = "postgresql+asyncpg://storyteller_user:StoryTeller2024Dev!@localhost:5439/storyteller_dev"

class BibleExporter:
    def __init__(self, connection_string: str):
        self.engine = create_async_engine(connection_string, echo=False)
        self.story_id = None
        self.story_title = None

    async def get_story_id(self, title_query: str):
        async with self.engine.connect() as conn:
            # Find the most relevant story
            result = await conn.execute(text(
                "SELECT id, title FROM stories WHERE title ILIKE :q LIMIT 1"
            ), {"q": f"%{title_query}%"})
            row = result.fetchone()
            if row:
                self.story_id = row[0]
                self.story_title = row[1]
                return True
            return False

    async def fetch_rows(self, query: str, params: Dict = None) -> List[Any]:
        async with self.engine.connect() as conn:
            result = await conn.execute(text(query), params or {})
            # Return mappings for easier access by column name
            return result.mappings().all()

    def format_json_field(self, data: Any) -> str:
        """Helper to format JSON fields nicely for Markdown"""
        if not data:
            return "_None_"
        if isinstance(data, list):
            return "\n".join([f"- {item}" for item in data])
        if isinstance(data, dict):
            return "\n".join([f"- **{k}:** {v}" for k, v in data.items()])
        return str(data)

    async def generate_markdown(self) -> str:
        if not self.story_id:
            return "Error: No story selected."

        md_output = []
        md_output.append(f"# Story Bible & Execution Status: {self.story_title}")
        md_output.append(f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M')}\n")

        # 1. CORE CONTEXT
        md_output.append("## 1. Strategic Context (The Plan)")
        stories = await self.fetch_rows(
            "SELECT story_context, narrative_tone, core_themes, planned_ending FROM stories WHERE id = :id",
            {"id": self.story_id}
        )
        for s in stories:
            md_output.append(f"**Tone:** {s['narrative_tone']}\n")
            md_output.append(f"**Themes:** {s['core_themes']}\n")
            md_output.append(f"### Context summary\n{s['story_context']}\n")
            md_output.append(f"### Planned Ending\n{s['planned_ending']}\n")

        # 2. CHARACTERS
        md_output.append("## 2. Character Constellation")
        chars = await self.fetch_rows(
            "SELECT name, role, description, backstory FROM characters WHERE story_id = :id ORDER BY role, name",
            {"id": self.story_id}
        )
        for c in chars:
            md_output.append(f"### {c['name']} ({c['role']})")
            md_output.append(f"**Description:** {c['description']}\n")
            md_output.append(f"**Backstory:** {c['backstory']}\n")

        # 3. PLOT ARCHITECTURE
        md_output.append("## 3. Plot Architecture")
        arcs = await self.fetch_rows(
            "SELECT title, type, description, resolution_goal FROM plot_arcs WHERE story_id = :id ORDER BY arc_number",
            {"id": self.story_id}
        )
        for a in arcs:
            md_output.append(f"### {a['title']} ({a['type']})")
            md_output.append(f"{a['description']}\n")
            md_output.append(f"**Goal:** {a['resolution_goal']}\n")

        # 4. TACTICAL EXECUTION (The Reality)
        md_output.append("## 4. Tactical Execution State (Continuity)")
        md_output.append("> This section reflects the *actual* state of the story as generated, which may diverge from the initial roadmap.\n")

        # Join episodes with continuity notes
        execution_data = await self.fetch_rows(
            """
            SELECT
                e.episode_number,
                e.episode_title,
                e.status as execution_status,
                cn.continuity_summary,
                cn.key_plot_points,
                cn.unresolved_tensions,
                cn.character_states
            FROM episodes e
            LEFT JOIN episode_continuity_notes cn ON e.id = cn.episode_id
            WHERE e.story_id = :id
            ORDER BY e.episode_number
            """,
            {"id": self.story_id}
        )

        if execution_data:
            for ex in execution_data:
                status_icon = "✅" if ex['execution_status'] in ['completed', 'approved', 'reviewed'] else "🔄" if ex['execution_status'] in ['generating', 'in_progress'] else "📅"
                md_output.append(f"### Ep {ex['episode_number']}: {ex['episode_title']} {status_icon}")
                md_output.append(f"**Status:** `{ex['execution_status']}`")

                if ex['continuity_summary']:
                    md_output.append(f"\n**Continuity Summary:**\n{ex['continuity_summary']}\n")

                    if ex['unresolved_tensions']:
                        md_output.append("**⚠️ Unresolved Tensions:**")
                        md_output.append(self.format_json_field(ex['unresolved_tensions']))
                        md_output.append("")

                    if ex['character_states']:
                        md_output.append("**👤 Character States:**")
                        md_output.append(self.format_json_field(ex['character_states']))
                        md_output.append("")
                else:
                    md_output.append("\n_No continuity snapshot generated yet._\n")
        else:
            md_output.append("_No episodes found in execution tables._\n")

        # 5. ROADMAP (The Future Plans)
        md_output.append("## 5. Master Roadmap (Looking Ahead)")

        # Get active roadmap
        roadmap = await self.fetch_rows(
            "SELECT id, season_number, season_title FROM roadmaps WHERE story_id = :id AND is_active = true LIMIT 1",
            {"id": self.story_id}
        )

        if roadmap:
            rm_id = roadmap[0]['id']
            md_output.append(f"**Season {roadmap[0]['season_number']}:** {roadmap[0]['season_title']}\n")

            # Get Episodes
            episodes = await self.fetch_rows(
                "SELECT id, episode_number, episode_title, episode_summary FROM roadmap_episodes WHERE roadmap_id = :rid ORDER BY episode_number",
                {"rid": rm_id}
            )

            for ep in episodes:
                md_output.append(f"### {ep['episode_number']}. {ep['episode_title']}")
                md_output.append(f"_{ep['episode_summary']}_\n")

                # Get Scenes for this Episode
                scenes = await self.fetch_rows(
                    """
                    SELECT scene_number, scene_title, scene_summary, key_revelations_or_actions, characters_present
                    FROM roadmap_scenes
                    WHERE episode_id = :eid
                    ORDER BY scene_number
                    """,
                    {"eid": ep['id']}
                )

                if scenes:
                    md_output.append("<details>")
                    md_output.append("<summary>Scene Breakdown</summary>\n")
                    md_output.append("| Scene | Title | Key Beats | Characters |")
                    md_output.append("| :--- | :--- | :--- | :--- |")
                    for sc in scenes:
                        beats = "<br>".join(sc['key_revelations_or_actions'] or [])
                        chars = ", ".join(sc['characters_present'] or [])
                        md_output.append(f"| {sc['scene_number']} | **{sc['scene_title']}**<br>{sc['scene_summary']} | {beats} | {chars} |")
                    md_output.append("\n</details>\n")

                md_output.append("\n") # Spacing between episodes

        return "\n".join(md_output)

async def main():
    if len(sys.argv) < 2:
        print('Usage: python export_narrative_bible.py "Story Title Fragment"')
        sys.exit(1)

    query = sys.argv[1]

    # Setup Connection
    load_dotenv()
    db_url = os.getenv("DATABASE_URL", FALLBACK_URL)
    if "postgresql://" in db_url and "asyncpg" not in db_url:
        db_url = db_url.replace("postgresql://", "postgresql+asyncpg://")

    exporter = BibleExporter(db_url)

    print(f"Searching for story matching: '{query}'...")
    if await exporter.get_story_id(query):
        print(f"Found: {exporter.story_title}")
        print("Generating Bible & Execution Report...")
        data = await exporter.generate_markdown()

        # Make filename Windows-safe (remove colons, replace spaces)
        safe_title = exporter.story_title.replace(':', '').replace(' ', '_')
        filename = f"{safe_title}_Bible_Export.md"
        with open(filename, "w", encoding="utf-8") as f:
            f.write(data)

        print(f"Success! Exported to: {filename}")
    else:
        print("Story not found.")

if __name__ == "__main__":
    asyncio.run(main())
