#!/usr/bin/env python3
"""
Raw Database Dump for 'Collapse Protocol' (Single Story Strict)
Exports specific tables for a single story ID into a raw Markdown format using Pandas.
"""
import pandas as pd
from sqlalchemy import create_engine, text

try:
    from tabulate import tabulate
except ImportError:
    tabulate = None

# --- CONFIGURATION ---
DB_CONNECTION_STR = "postgresql://storyteller_user:StoryTeller2024Dev!@localhost:5439/storyteller_dev"
# Sanitized filename from "Cat & Daniel: Collapse Protocol_sigle"
OUTPUT_FILE = "Cat_and_Daniel_Collapse_Protocol_single.md"
TARGET_STORY_ID = "59f64b1e-726a-439d-a6bc-0dfefcababdb"

TARGET_TABLES = [
    # --- LEVEL 1: THE CORE CONTEXT ---
    "stories",
    "characters",
    "character_relationships",
    "plot_arcs",
    "plot_points",
    "arc_connections",

    # --- LEVEL 2: LOCATION CONTEXT ---
    "location_arcs",
    "location_artifacts",
    "character_location_contexts",
    "scene_location_associations",
    "ai_location_suggestions",

    # --- LEVEL 3: THE ACTIVE PLAN ---
    "roadmaps",
    "roadmap_episodes",
    "roadmap_scenes",
    "episodes",

    # --- LEVEL 4: CONTINUITY ---
    "narrative_facts",
    "episode_continuity_notes"
]

def dump_db_to_markdown():
    try:
        engine = create_engine(DB_CONNECTION_STR)
    except Exception as e:
        print(f"Connection Failed: {e}")
        return

    try:
        with engine.connect() as connection:
            # 1. FIND STORY ID
            print(f"Finding Story for ID '{TARGET_STORY_ID}'...")
            try:
                story_df = pd.read_sql(
                    text("SELECT id, title FROM stories WHERE id = :story_id LIMIT 1"),
                    connection,
                    params={"story_id": TARGET_STORY_ID}
                )
                if story_df.empty:
                    print("Story not found.")
                    return

                story_id = story_df.iloc[0]['id']
                story_title = story_df.iloc[0]['title']
                print(f"Targeting Story: {story_title}")
                print(f"ID: {story_id}")

            except Exception as e:
                print(f"Error querying stories: {e}")
                return

            with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
                f.write(f"# Raw Database Dump: {story_title}\n")
                f.write(f"**Filename:** `{OUTPUT_FILE}`\n")
                f.write(f"**Date:** {pd.Timestamp.now()}\n\n")

                for table in TARGET_TABLES:
                    print(f"Processing table: {table}...")

                    try:
                        # Dynamic Filtering Logic
                        # We build the WHERE clause based on how the table relates to the Story

                        # Check column names
                        columns_query = text(
                            "SELECT column_name FROM information_schema.columns "
                            "WHERE table_name = :table AND table_schema = 'public'"
                        )
                        cols = pd.read_sql(columns_query, connection, params={"table": table})[
                            'column_name'
                        ].tolist()

                        base_query = f"SELECT * FROM {table}"
                        where_clause = ""

                        if 'story_id' in cols:
                            where_clause = f" WHERE story_id = '{story_id}'"

                        elif 'roadmap_id' in cols:
                            # Table -> Roadmap -> Story
                            where_clause = (
                                " WHERE roadmap_id IN (SELECT id FROM roadmaps "
                                f"WHERE story_id = '{story_id}')"
                            )

                        elif 'episode_id' in cols:
                            # Table -> Episode -> Story
                            # Note: Need to check if it's 'episodes' (app) or 'roadmap_episodes' (planning)
                            # roadmap_scenes has episode_id which links to roadmap_episodes
                            if table == 'roadmap_scenes':
                                where_clause = (
                                    " WHERE episode_id IN (SELECT id FROM roadmap_episodes "
                                    "WHERE roadmap_id IN (SELECT id FROM roadmaps "
                                    f"WHERE story_id = '{story_id}'))"
                                )
                            else:
                                # Assume links to app 'episodes' table
                                where_clause = (
                                    " WHERE episode_id IN (SELECT id FROM episodes "
                                    f"WHERE story_id = '{story_id}')"
                                )

                        elif 'character_a_id' in cols:
                            # Table -> Characters -> Story
                            where_clause = (
                                " WHERE character_a_id IN (SELECT id FROM characters "
                                f"WHERE story_id = '{story_id}')"
                            )

                        elif 'location_id' in cols:
                            # Table -> Locations -> Story
                            where_clause = (
                                " WHERE location_id IN (SELECT id FROM locations "
                                f"WHERE story_id = '{story_id}')"
                            )

                        if where_clause:
                            query = base_query + where_clause
                        else:
                            print(
                                f"  [Info] No standard filter found for {table}. Checking special cases..."
                            )
                            if table == 'arc_connections':
                                # connects two arcs. Check if parent_arc_id or child_arc_id is in story
                                query = (
                                    base_query
                                    + " WHERE parent_arc_id IN (SELECT id FROM plot_arcs "
                                    f"WHERE story_id = '{story_id}')"
                                    + " OR child_arc_id IN (SELECT id FROM plot_arcs "
                                    f"WHERE story_id = '{story_id}')"
                                )
                            elif table == 'plot_points':
                                query = (
                                    base_query
                                    + " WHERE plot_arc_id IN (SELECT id FROM plot_arcs "
                                    f"WHERE story_id = '{story_id}')"
                                )
                            else:
                                print(
                                    f"  [Warning] Dumping FULL table for {table} (Could not filter)."
                                )
                                query = base_query

                        df = pd.read_sql(query, connection)

                        f.write(f"## Table: `{table}`\n")

                        if df.empty:
                            f.write("_Table is empty for this story._\n\n---\n\n")
                            continue

                        # Clean up ID columns for readability? (User said "Raw Dump", so keeping IDs might be better for integrity)
                        # We will drop just the creation/update timestamps to save space/noise
                        drops = ['created_at', 'updated_at']
                        df = df.drop(columns=[c for c in drops if c in df.columns], errors='ignore')

                        if tabulate is None:
                            csv_table = df.to_csv(index=False)
                            f.write("```csv\n")
                            f.write(csv_table)
                            f.write("```\n\n---\n\n")
                        else:
                            markdown_table = df.to_markdown(index=False, tablefmt="pipe")
                            f.write(markdown_table)
                            f.write("\n\n---\n\n")

                    except Exception as e:
                        print(f"  Warning: Issue with table '{table}': {e}")
                        f.write(f"**Error reading table: {table}**\n\n---\n\n")

            print(f"Done. Saved to: {OUTPUT_FILE}")
    finally:
        engine.dispose()

if __name__ == "__main__":
    dump_db_to_markdown()
