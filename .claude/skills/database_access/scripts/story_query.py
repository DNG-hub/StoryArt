#!/usr/bin/env python3
"""
Story Query Tool for StoryTeller

General-purpose queries for narratives, roadmaps, characters, and locations.

Usage:
    # Stories
    python story_query.py stories                           # List all stories
    python story_query.py story <story_id>                  # Get story details

    # Narratives (generated scenes)
    python story_query.py scenes <episode>                  # List scenes for episode
    python story_query.py scene <episode> <scene>           # Get scene content
    python story_query.py narrative <episode>               # Get full episode narrative

    # Roadmaps (generation plans)
    python story_query.py roadmaps                          # List all roadmaps
    python story_query.py roadmap <episode>                 # Get episode roadmap
    python story_query.py beats <episode> <scene>           # Get scene beats from roadmap

    # Characters
    python story_query.py characters                        # List all characters
    python story_query.py character <name>                  # Get character details
    python story_query.py appearance <name>                 # Get character appearance context

    # Locations
    python story_query.py locations                         # List all locations
    python story_query.py location <name>                   # Get location details
"""
import sys
import json
import textwrap

# Database configuration
DB_CONFIG = {
    'host': 'localhost',
    'port': 5439,
    'database': 'storyteller_dev',
    'user': 'storyteller_user',
    'password': 'StoryTeller2024Dev!'
}

# Default story (Cat & Daniel)
DEFAULT_STORY_ID = "59f64b1e-726a-439d-a6bc-0dfefcababdb"


def get_connection():
    """Create PostgreSQL connection."""
    import psycopg2
    from psycopg2.extras import RealDictCursor
    return psycopg2.connect(**DB_CONFIG, cursor_factory=RealDictCursor)


def wrap_text(text, width=80, indent=2):
    """Wrap text with indentation."""
    if not text:
        return "  N/A"

    # Handle lists
    if isinstance(text, list):
        lines = []
        for item in text:
            lines.append(" " * indent + "- " + str(item))
        return "\n".join(lines)

    # Handle dicts
    if isinstance(text, dict):
        return " " * indent + json.dumps(text, indent=2).replace("\n", "\n" + " " * indent)

    wrapper = textwrap.TextWrapper(width=width, initial_indent=" " * indent,
                                   subsequent_indent=" " * indent)
    return wrapper.fill(str(text))


# =============================================================================
# STORIES
# =============================================================================

def list_stories():
    """List all stories."""
    print("=" * 80)
    print("STORIES")
    print("=" * 80)

    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT id, title, description, current_episode_number, created_at
        FROM stories
        ORDER BY created_at DESC
    """)

    stories = cur.fetchall()

    for s in stories:
        default = " [DEFAULT]" if str(s['id']) == DEFAULT_STORY_ID else ""
        print(f"\n{s['title']}{default}")
        print(f"  ID: {s['id']}")
        print(f"  Current Episode: {s['current_episode_number']}")
        if s['description']:
            print(f"  Description: {s['description'][:100]}...")

    print(f"\n[Found {len(stories)} story/stories]")
    conn.close()


def get_story(story_id):
    """Get story details."""
    print("=" * 80)
    print(f"STORY DETAILS")
    print("=" * 80)

    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT id, title, description, current_episode_number, created_at
        FROM stories WHERE id = %s
    """, (story_id,))

    story = cur.fetchone()
    if not story:
        print(f"Story {story_id} not found.")
        conn.close()
        return

    print(f"\nTitle: {story['title']}")
    print(f"ID: {story['id']}")
    print(f"Current Episode: {story['current_episode_number']}")
    print(f"Created: {story['created_at']}")

    if story['description']:
        print(f"\nDescription:")
        print(wrap_text(story['description']))

    # Count related data
    cur.execute("SELECT COUNT(*) FROM characters WHERE story_id = %s", (story_id,))
    char_count = cur.fetchone()['count']

    cur.execute("SELECT COUNT(*) FROM locations WHERE story_id = %s", (story_id,))
    loc_count = cur.fetchone()['count']

    cur.execute("SELECT COUNT(*) FROM scenes WHERE story_id = %s", (story_id,))
    scene_count = cur.fetchone()['count']

    cur.execute("SELECT COUNT(*) FROM roadmaps WHERE story_id = %s", (story_id,))
    roadmap_count = cur.fetchone()['count']

    print(f"\nRelated Data:")
    print(f"  Characters: {char_count}")
    print(f"  Locations: {loc_count}")
    print(f"  Scenes: {scene_count}")
    print(f"  Roadmaps: {roadmap_count}")

    conn.close()


# =============================================================================
# NARRATIVES (Generated Scenes)
# =============================================================================

def list_scenes(episode_number, story_id=DEFAULT_STORY_ID):
    """List scenes for an episode."""
    print("=" * 80)
    print(f"SCENES FOR EPISODE {episode_number}")
    print("=" * 80)

    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT scene_number, title, status,
               LENGTH(content) as content_length,
               updated_at
        FROM scenes
        WHERE story_id = %s AND episode_number = %s
        ORDER BY scene_number
    """, (story_id, episode_number))

    scenes = cur.fetchall()

    if not scenes:
        print(f"No scenes found for Episode {episode_number}")
        conn.close()
        return

    for s in scenes:
        print(f"\nScene {s['scene_number']}: {s['title']}")
        print(f"  Status: {s['status']}")
        print(f"  Content: {s['content_length']} chars")
        print(f"  Updated: {s['updated_at']}")

    print(f"\n[Found {len(scenes)} scene(s)]")
    conn.close()


def get_scene(episode_number, scene_number, story_id=DEFAULT_STORY_ID):
    """Get full scene content."""
    print("=" * 80)
    print(f"SCENE: Episode {episode_number}, Scene {scene_number}")
    print("=" * 80)

    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT id, title, content, status, entry_state, exit_state,
               character_state_updates, context_tags, updated_at
        FROM scenes
        WHERE story_id = %s AND episode_number = %s AND scene_number = %s
    """, (story_id, episode_number, scene_number))

    scene = cur.fetchone()

    if not scene:
        print(f"Scene not found.")
        conn.close()
        return

    print(f"\nTitle: {scene['title']}")
    print(f"ID: {scene['id']}")
    print(f"Status: {scene['status']}")
    print(f"Updated: {scene['updated_at']}")

    if scene['context_tags']:
        print(f"Tags: {', '.join(scene['context_tags'])}")

    print(f"\n--- Entry State ---")
    print(wrap_text(scene['entry_state'] or 'N/A'))

    print(f"\n--- Content ({len(scene['content'] or '')} chars) ---")
    content = scene['content'] or ''
    # Show first 2000 chars
    if len(content) > 2000:
        print(wrap_text(content[:2000]))
        print(f"\n  ... [{len(content) - 2000} more characters]")
    else:
        print(wrap_text(content))

    print(f"\n--- Exit State ---")
    print(wrap_text(scene['exit_state'] or 'N/A'))

    if scene['character_state_updates']:
        print(f"\n--- Character State Updates ---")
        updates = scene['character_state_updates']
        if isinstance(updates, str):
            updates = json.loads(updates)
        print(json.dumps(updates, indent=2)[:500])

    conn.close()


def get_full_narrative(episode_number, story_id=DEFAULT_STORY_ID):
    """Get full episode narrative (all scenes concatenated)."""
    print("=" * 80)
    print(f"FULL NARRATIVE: Episode {episode_number}")
    print("=" * 80)

    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT scene_number, title, content
        FROM scenes
        WHERE story_id = %s AND episode_number = %s
        ORDER BY scene_number
    """, (story_id, episode_number))

    scenes = cur.fetchall()

    if not scenes:
        print(f"No scenes found for Episode {episode_number}")
        conn.close()
        return

    total_chars = 0
    for s in scenes:
        print(f"\n{'='*40}")
        print(f"SCENE {s['scene_number']}: {s['title']}")
        print(f"{'='*40}\n")
        content = s['content'] or ''
        print(content)
        total_chars += len(content)

    print(f"\n{'='*80}")
    print(f"Total: {len(scenes)} scenes, {total_chars} characters")
    conn.close()


# =============================================================================
# ROADMAPS (Generation Plans)
# =============================================================================

def list_roadmaps(story_id=DEFAULT_STORY_ID):
    """List all roadmaps for a story."""
    print("=" * 80)
    print("ROADMAPS")
    print("=" * 80)

    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT id, season_number, total_episodes, is_active, created_at
        FROM roadmaps
        WHERE story_id = %s
        ORDER BY season_number
    """, (story_id,))

    roadmaps = cur.fetchall()

    if not roadmaps:
        print("No roadmaps found.")
        conn.close()
        return

    for r in roadmaps:
        active = " [ACTIVE]" if r['is_active'] else ""
        print(f"\nSeason {r['season_number']}{active}")
        print(f"  ID: {r['id']}")
        print(f"  Episodes: {r['total_episodes']}")
        print(f"  Created: {r['created_at']}")

    print(f"\n[Found {len(roadmaps)} roadmap(s)]")
    conn.close()


def get_episode_roadmap(episode_number, story_id=DEFAULT_STORY_ID):
    """Get roadmap data for an episode."""
    print("=" * 80)
    print(f"ROADMAP FOR EPISODE {episode_number}")
    print("=" * 80)

    conn = get_connection()
    cur = conn.cursor()

    # Get episode from roadmap
    cur.execute("""
        SELECT re.id, re.episode_number, re.episode_title, re.episode_summary,
               re.plot_arcs_advanced, re.status, re.scene_count,
               r.season_number
        FROM roadmap_episodes re
        JOIN roadmaps r ON re.roadmap_id = r.id
        WHERE r.story_id = %s AND re.episode_number = %s
        LIMIT 1
    """, (story_id, episode_number))

    episode = cur.fetchone()

    if not episode:
        print(f"Episode {episode_number} not found in roadmap.")
        conn.close()
        return

    print(f"\nEpisode {episode['episode_number']}: {episode['episode_title']}")
    print(f"Season: {episode['season_number']}")
    print(f"ID: {episode['id']}")
    print(f"Status: {episode['status']}")

    if episode['episode_summary']:
        print(f"\nSummary:")
        print(wrap_text(episode['episode_summary']))

    if episode['plot_arcs_advanced']:
        print(f"\nPlot Arcs Advanced:")
        arcs = episode['plot_arcs_advanced']
        if isinstance(arcs, list):
            for arc in arcs[:5]:
                print(f"  - {arc}")
        else:
            print(wrap_text(str(arcs)[:300]))

    # Get scenes
    cur.execute("""
        SELECT scene_number, scene_title, location_name, characters_present,
               mood, purpose
        FROM roadmap_scenes
        WHERE episode_id = %s
        ORDER BY scene_number
    """, (str(episode['id']),))

    scenes = cur.fetchall()
    print(f"\nRoadmap Scenes: {len(scenes)}")

    if scenes:
        print(f"\nScene Overview:")
        for s in scenes:
            chars = ', '.join(s['characters_present'][:3]) if s['characters_present'] else 'N/A'
            if s['characters_present'] and len(s['characters_present']) > 3:
                chars += f" +{len(s['characters_present']) - 3} more"
            print(f"\n  Scene {s['scene_number']}: {s['scene_title']}")
            print(f"    Location: {s['location_name'] or 'N/A'}")
            print(f"    Mood: {s['mood'] or 'N/A'}")
            print(f"    Characters: {chars}")
            if s['purpose']:
                print(f"    Purpose: {s['purpose'][:60]}...")

    conn.close()


def get_scene_beats(episode_number, scene_number, story_id=DEFAULT_STORY_ID):
    """Get roadmap details for a specific scene."""
    print("=" * 80)
    print(f"ROADMAP SCENE: Episode {episode_number}, Scene {scene_number}")
    print("=" * 80)

    conn = get_connection()
    cur = conn.cursor()

    # Get scene from roadmap
    cur.execute("""
        SELECT rs.id, rs.scene_number, rs.scene_title, rs.scene_summary,
               rs.location_name, rs.characters_present, rs.key_revelations_or_actions,
               rs.ad_break_cliffhanger, rs.mood, rs.pacing, rs.purpose,
               rs.entry_state, rs.exit_state, rs.gear_context,
               rs.is_suit_up, rs.suit_up_gear_state
        FROM roadmap_scenes rs
        JOIN roadmap_episodes re ON rs.episode_id = re.id
        JOIN roadmaps r ON re.roadmap_id = r.id
        WHERE r.story_id = %s AND re.episode_number = %s AND rs.scene_number = %s
        LIMIT 1
    """, (story_id, episode_number, scene_number))

    scene = cur.fetchone()

    if not scene:
        print(f"Scene not found in roadmap.")
        conn.close()
        return

    print(f"\nScene {scene['scene_number']}: {scene['scene_title']}")
    print(f"ID: {scene['id']}")
    print(f"Is Suit-Up Scene: {scene['is_suit_up']}")

    print(f"\nLocation: {scene['location_name'] or 'N/A'}")
    print(f"Mood: {scene['mood'] or 'N/A'}")
    print(f"Pacing: {scene['pacing'] or 'N/A'}")

    if scene['scene_summary']:
        print(f"\nSummary:")
        print(wrap_text(scene['scene_summary']))

    if scene['characters_present']:
        print(f"\nCharacters Present:")
        for char in scene['characters_present']:
            print(f"  - {char}")

    if scene['purpose']:
        print(f"\nPurpose:")
        print(wrap_text(scene['purpose']))

    if scene['key_revelations_or_actions']:
        print(f"\nKey Revelations/Actions:")
        print(wrap_text(scene['key_revelations_or_actions']))

    if scene['ad_break_cliffhanger']:
        print(f"\nAd Break Cliffhanger:")
        print(wrap_text(scene['ad_break_cliffhanger']))

    if scene['entry_state']:
        print(f"\nEntry State:")
        print(wrap_text(scene['entry_state']))

    if scene['exit_state']:
        print(f"\nExit State:")
        print(wrap_text(scene['exit_state']))

    if scene['gear_context']:
        print(f"\nGear Context:")
        gear = scene['gear_context']
        if isinstance(gear, dict):
            print(json.dumps(gear, indent=2)[:500])
        else:
            print(wrap_text(str(gear)[:300]))

    if scene['suit_up_gear_state']:
        print(f"\nSuit-Up Gear State:")
        print(wrap_text(str(scene['suit_up_gear_state'])[:300]))

    conn.close()


# =============================================================================
# CHARACTERS
# =============================================================================

def list_characters(story_id=DEFAULT_STORY_ID):
    """List all characters for a story."""
    print("=" * 80)
    print("CHARACTERS")
    print("=" * 80)

    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT id, name, role, description, rendering_model
        FROM characters
        WHERE story_id = %s
        ORDER BY name
    """, (story_id,))

    characters = cur.fetchall()

    if not characters:
        print("No characters found.")
        conn.close()
        return

    for c in characters:
        model = f" [{c['rendering_model']}]" if c.get('rendering_model') else ""
        print(f"\n{c['name']}{model}")
        print(f"  ID: {c['id']}")
        print(f"  Role: {c['role'] or 'N/A'}")
        if c['description']:
            print(f"  Description: {c['description'][:80]}...")

    print(f"\n[Found {len(characters)} character(s)]")
    conn.close()


def get_character(name, story_id=DEFAULT_STORY_ID):
    """Get character details."""
    print("=" * 80)
    print(f"CHARACTER: {name}")
    print("=" * 80)

    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT id, name, role, description, backstory, personality_traits,
               goals, relationships, rendering_model
        FROM characters
        WHERE story_id = %s AND name ILIKE %s
    """, (story_id, f"%{name}%"))

    char = cur.fetchone()

    if not char:
        print(f"Character '{name}' not found.")
        list_characters(story_id)
        conn.close()
        return

    print(f"\nName: {char['name']}")
    print(f"ID: {char['id']}")
    print(f"Role: {char['role'] or 'N/A'}")
    if char['rendering_model']:
        print(f"Rendering Model: {char['rendering_model']}")

    if char['description']:
        print(f"\nDescription:")
        print(wrap_text(char['description']))

    if char['backstory']:
        print(f"\nBackstory:")
        print(wrap_text(char['backstory']))

    if char['personality_traits']:
        print(f"\nPersonality Traits:")
        traits = char['personality_traits']
        if isinstance(traits, list):
            for t in traits:
                print(f"  - {t}")
        else:
            print(wrap_text(str(traits)))

    if char['goals']:
        print(f"\nGoals:")
        print(wrap_text(char['goals'] if isinstance(char['goals'], str) else str(char['goals'])))

    if char['relationships']:
        print(f"\nRelationships:")
        rels = char['relationships']
        if isinstance(rels, dict):
            for k, v in rels.items():
                print(f"  {k}: {v}")
        else:
            print(wrap_text(str(rels)))

    conn.close()


def get_character_appearance(name, story_id=DEFAULT_STORY_ID):
    """Get character appearance context (used for image generation)."""
    print("=" * 80)
    print(f"CHARACTER APPEARANCE CONTEXT: {name}")
    print("=" * 80)

    conn = get_connection()
    cur = conn.cursor()

    # Get character base data
    cur.execute("""
        SELECT id, name, description, rendering_model
        FROM characters
        WHERE story_id = %s AND name ILIKE %s
    """, (story_id, f"%{name}%"))

    char = cur.fetchone()

    if not char:
        print(f"Character '{name}' not found.")
        conn.close()
        return

    char_id = char['id']
    print(f"\nCharacter: {char['name']}")
    print(f"ID: {char_id}")
    print(f"Rendering Model: {char['rendering_model'] or 'default'}")

    if char['description']:
        print(f"\nBase Description:")
        print(wrap_text(char['description']))

    # Get appearance contexts from character_location_contexts
    cur.execute("""
        SELECT clc.id, clc.physical_description, clc.clothing_description,
               clc.hair_description, clc.demeanor_description,
               clc.swarmui_prompt_override, clc.temporal_context
        FROM character_location_contexts clc
        WHERE clc.character_id = %s
        ORDER BY clc.created_at DESC
    """, (str(char_id),))

    contexts = cur.fetchall()

    if contexts:
        print(f"\n--- Appearance Contexts ({len(contexts)}) ---")
        for ctx in contexts:
            temporal = ctx['temporal_context'] or 'General'
            print(f"\n[{temporal}]")

            if ctx['physical_description']:
                print(f"  Physical: {ctx['physical_description'][:100]}...")

            if ctx['clothing_description']:
                print(f"  Clothing: {ctx['clothing_description'][:100]}...")

            if ctx['hair_description']:
                print(f"  Hair: {ctx['hair_description'][:80]}...")

            if ctx['demeanor_description']:
                print(f"  Demeanor: {ctx['demeanor_description'][:80]}...")

            if ctx['swarmui_prompt_override']:
                print(f"\n  SwarmUI Prompt Override:")
                print(wrap_text(ctx['swarmui_prompt_override'][:300], indent=4))
    else:
        print(f"\nNo appearance contexts found.")

    conn.close()


# =============================================================================
# LOCATIONS
# =============================================================================

def list_locations(story_id=DEFAULT_STORY_ID):
    """List all locations for a story."""
    print("=" * 80)
    print("LOCATIONS")
    print("=" * 80)

    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT id, name, description, location_type
        FROM locations
        WHERE story_id = %s
        ORDER BY name
    """, (story_id,))

    locations = cur.fetchall()

    if not locations:
        print("No locations found.")
        conn.close()
        return

    for loc in locations:
        loc_type = f" [{loc['location_type']}]" if loc.get('location_type') else ""
        print(f"\n{loc['name']}{loc_type}")
        print(f"  ID: {loc['id']}")
        if loc['description']:
            print(f"  Description: {loc['description'][:80]}...")

    print(f"\n[Found {len(locations)} location(s)]")
    conn.close()


def get_location(name, story_id=DEFAULT_STORY_ID):
    """Get location details."""
    print("=" * 80)
    print(f"LOCATION: {name}")
    print("=" * 80)

    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT id, name, description, location_type, atmosphere,
               visual_details, narrative_importance
        FROM locations
        WHERE story_id = %s AND name ILIKE %s
    """, (story_id, f"%{name}%"))

    loc = cur.fetchone()

    if not loc:
        print(f"Location '{name}' not found.")
        list_locations(story_id)
        conn.close()
        return

    print(f"\nName: {loc['name']}")
    print(f"ID: {loc['id']}")
    if loc['location_type']:
        print(f"Type: {loc['location_type']}")

    if loc['description']:
        print(f"\nDescription:")
        print(wrap_text(loc['description']))

    if loc['atmosphere']:
        print(f"\nAtmosphere:")
        print(wrap_text(loc['atmosphere']))

    if loc['visual_details']:
        print(f"\nVisual Details:")
        details = loc['visual_details']
        if isinstance(details, dict):
            print(json.dumps(details, indent=2))
        else:
            print(wrap_text(str(details)))

    if loc['narrative_importance']:
        print(f"\nNarrative Importance:")
        print(wrap_text(loc['narrative_importance']))

    # Note: character_location_contexts uses location_arc_id, not location_id
    # For now, we skip this lookup as it requires joining through location_arcs

    conn.close()


# =============================================================================
# MAIN
# =============================================================================

def print_usage():
    """Print usage information."""
    print("""
Story Query Tool for StoryTeller

Usage:
    # Stories
    python story_query.py stories                           List all stories
    python story_query.py story <story_id>                  Get story details

    # Narratives (generated scenes)
    python story_query.py scenes <episode>                  List scenes for episode
    python story_query.py scene <episode> <scene>           Get scene content
    python story_query.py narrative <episode>               Get full episode narrative

    # Roadmaps (generation plans)
    python story_query.py roadmaps                          List all roadmaps
    python story_query.py roadmap <episode>                 Get episode roadmap
    python story_query.py beats <episode> <scene>           Get scene beats from roadmap

    # Characters
    python story_query.py characters                        List all characters
    python story_query.py character <name>                  Get character details
    python story_query.py appearance <name>                 Get character appearance context

    # Locations
    python story_query.py locations                         List all locations
    python story_query.py location <name>                   Get location details

Examples:
    python story_query.py scenes 2
    python story_query.py scene 2 1
    python story_query.py roadmap 2
    python story_query.py character Cat
    python story_query.py appearance Daniel
    python story_query.py location "Mobile Medical Base"

Database: PostgreSQL on localhost:5439
Default Story: Cat & Daniel (59f64b1e-726a-439d-a6bc-0dfefcababdb)
""")


def main():
    if len(sys.argv) < 2:
        print_usage()
        sys.exit(1)

    command = sys.argv[1].lower()

    try:
        # Stories
        if command == 'stories':
            list_stories()
        elif command == 'story':
            if len(sys.argv) < 3:
                print("Usage: python story_query.py story <story_id>")
                sys.exit(1)
            get_story(sys.argv[2])

        # Narratives
        elif command == 'scenes':
            if len(sys.argv) < 3:
                print("Usage: python story_query.py scenes <episode>")
                sys.exit(1)
            list_scenes(int(sys.argv[2]))
        elif command == 'scene':
            if len(sys.argv) < 4:
                print("Usage: python story_query.py scene <episode> <scene>")
                sys.exit(1)
            get_scene(int(sys.argv[2]), int(sys.argv[3]))
        elif command == 'narrative':
            if len(sys.argv) < 3:
                print("Usage: python story_query.py narrative <episode>")
                sys.exit(1)
            get_full_narrative(int(sys.argv[2]))

        # Roadmaps
        elif command == 'roadmaps':
            list_roadmaps()
        elif command == 'roadmap':
            if len(sys.argv) < 3:
                print("Usage: python story_query.py roadmap <episode>")
                sys.exit(1)
            get_episode_roadmap(int(sys.argv[2]))
        elif command == 'beats':
            if len(sys.argv) < 4:
                print("Usage: python story_query.py beats <episode> <scene>")
                sys.exit(1)
            get_scene_beats(int(sys.argv[2]), int(sys.argv[3]))

        # Characters
        elif command == 'characters':
            list_characters()
        elif command == 'character':
            if len(sys.argv) < 3:
                print("Usage: python story_query.py character <name>")
                sys.exit(1)
            get_character(sys.argv[2])
        elif command == 'appearance':
            if len(sys.argv) < 3:
                print("Usage: python story_query.py appearance <name>")
                sys.exit(1)
            get_character_appearance(sys.argv[2])

        # Locations
        elif command == 'locations':
            list_locations()
        elif command == 'location':
            if len(sys.argv) < 3:
                print("Usage: python story_query.py location <name>")
                sys.exit(1)
            get_location(' '.join(sys.argv[2:]))  # Handle multi-word names

        else:
            print(f"Unknown command: {command}")
            print_usage()
            sys.exit(1)

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
