#!/usr/bin/env python3
"""
Image Review Query Tool for StoryTeller

Common queries for the image review workflow spanning PostgreSQL and Redis.

Usage:
    python image_review_query.py sessions                    # List all review sessions
    python image_review_query.py session <session_id>        # Get session details
    python image_review_query.py episode <episode_number>    # Find session for episode
    python image_review_query.py verify <session_id>         # Verify session matches current DB
    python image_review_query.py beats <session_id>          # Get beats for session
    python image_review_query.py exported <session_id>       # Check export status
    python image_review_query.py scene <episode> <scene>     # Get scene content
"""
import sys
import asyncio
import json
from datetime import datetime

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


def list_sessions():
    """List all image review sessions."""
    print("=" * 80)
    print("IMAGE REVIEW SESSIONS")
    print("=" * 80)

    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT id, episode_number, story_name, total_images, total_prompts,
               image_folder_path, created_at
        FROM image_review_sessions
        ORDER BY created_at DESC
    """)

    sessions = cur.fetchall()

    if not sessions:
        print("No image review sessions found.")
        conn.close()
        return

    for s in sessions:
        print(f"\nSession: {s['id']}")
        print(f"  Episode: {s['episode_number']}")
        print(f"  Story: {s['story_name']}")
        print(f"  Images: {s['total_images']}")
        print(f"  Prompts: {s['total_prompts']}")
        print(f"  Created: {s['created_at']}")

        # Check if exported to DaVinci
        cur.execute("""
            SELECT COUNT(*) as exported
            FROM image_review_items
            WHERE session_id = %s AND image_path LIKE '%%DaVinci_Projects%%'
        """, (str(s['id']),))
        exported = cur.fetchone()['exported']
        if exported > 0:
            print(f"  Exported: {exported} images to DaVinci")

    print(f"\n[Found {len(sessions)} session(s)]")
    conn.close()


def get_session(session_id):
    """Get detailed session information."""
    print("=" * 80)
    print(f"SESSION: {session_id}")
    print("=" * 80)

    conn = get_connection()
    cur = conn.cursor()

    # Get session
    cur.execute("""
        SELECT id, episode_number, story_id, story_name, total_images,
               total_prompts, image_folder_path, created_at
        FROM image_review_sessions
        WHERE id = %s
    """, (session_id,))

    session = cur.fetchone()

    if not session:
        print(f"Session {session_id} not found.")
        list_sessions()
        conn.close()
        return

    print(f"\nMetadata:")
    print(f"  Episode: {session['episode_number']}")
    print(f"  Story: {session['story_name']}")
    print(f"  Story ID: {session['story_id']}")
    print(f"  Total Images: {session['total_images']}")
    print(f"  Total Prompts: {session['total_prompts']}")
    print(f"  Image Folder: {session['image_folder_path']}")
    print(f"  Created: {session['created_at']}")

    # Get beat counts by scene
    cur.execute("""
        SELECT scene_number, COUNT(DISTINCT beat_id) as beat_count,
               COUNT(*) as image_count
        FROM image_review_items
        WHERE session_id = %s
        GROUP BY scene_number
        ORDER BY scene_number
    """, (session_id,))

    scenes = cur.fetchall()
    print(f"\nScene Breakdown:")
    for s in scenes:
        print(f"  Scene {s['scene_number']}: {s['beat_count']} beats, {s['image_count']} images")

    # Check export status
    cur.execute("""
        SELECT
            COUNT(*) FILTER (WHERE image_path LIKE '%%DaVinci_Projects%%') as exported,
            COUNT(*) FILTER (WHERE image_path NOT LIKE '%%DaVinci_Projects%%') as not_exported
        FROM image_review_items
        WHERE session_id = %s
    """, (session_id,))

    export_status = cur.fetchone()
    print(f"\nExport Status:")
    print(f"  Exported to DaVinci: {export_status['exported']}")
    print(f"  Still in SwarmUI: {export_status['not_exported']}")

    conn.close()


def find_session_for_episode(episode_number, story_id=DEFAULT_STORY_ID):
    """Find the most recent session for an episode."""
    print("=" * 80)
    print(f"FINDING SESSION FOR EPISODE {episode_number}")
    print("=" * 80)

    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT id, episode_number, story_name, total_images, created_at
        FROM image_review_sessions
        WHERE story_id = %s AND episode_number = %s
        ORDER BY created_at DESC
    """, (story_id, episode_number))

    sessions = cur.fetchall()

    if not sessions:
        print(f"No sessions found for Episode {episode_number}")
        conn.close()
        return

    print(f"\nFound {len(sessions)} session(s):\n")

    for i, s in enumerate(sessions):
        marker = "[LATEST]" if i == 0 else ""
        print(f"Session: {s['id']} {marker}")
        print(f"  Images: {s['total_images']}")
        print(f"  Created: {s['created_at']}")
        print()

    # Recommend the latest
    latest = sessions[0]
    print(f"Recommended: {latest['id']}")
    print(f"\nTo verify this session matches current DB content:")
    print(f"  python image_review_query.py verify {latest['id']}")

    conn.close()


def verify_session(session_id):
    """Verify session content matches current database scenes."""
    print("=" * 80)
    print(f"VERIFYING SESSION: {session_id}")
    print("=" * 80)

    conn = get_connection()
    cur = conn.cursor()

    # Get session info
    cur.execute("""
        SELECT id, episode_number, story_id, created_at
        FROM image_review_sessions
        WHERE id = %s
    """, (session_id,))

    session = cur.fetchone()
    if not session:
        print(f"Session {session_id} not found.")
        conn.close()
        return

    episode_num = session['episode_number']
    story_id = session['story_id']
    session_created = session['created_at']

    print(f"\nSession created: {session_created}")

    # Check if scenes were updated after session was created
    cur.execute("""
        SELECT scene_number, title, updated_at
        FROM scenes
        WHERE story_id = %s AND episode_number = %s
        ORDER BY scene_number
    """, (str(story_id), episode_num))

    scenes = cur.fetchall()

    print(f"\nScene Update Status:")
    has_stale = False
    for scene in scenes:
        updated = scene['updated_at']
        status = "OK"
        if updated and updated > session_created:
            status = "STALE - Scene updated after session created!"
            has_stale = True
        print(f"  Scene {scene['scene_number']}: {scene['title']}")
        print(f"    Updated: {updated}")
        print(f"    Status: {status}")

    # Compare first beat narrative text
    print(f"\nFirst Beat (s1-b1) Comparison:")

    # Get from image_review_items
    cur.execute("""
        SELECT narrative_metadata
        FROM image_review_items
        WHERE session_id = %s AND beat_id = 's1-b1'
        LIMIT 1
    """, (session_id,))

    item = cur.fetchone()
    if item and item['narrative_metadata']:
        metadata = item['narrative_metadata']
        if isinstance(metadata, str):
            metadata = json.loads(metadata)
        session_text = metadata.get('narrative_text', '')[:100]
        print(f"  Session text: {session_text}...")
    else:
        session_text = None
        print(f"  Session text: NOT FOUND")

    # Get current scene content
    cur.execute("""
        SELECT LEFT(content, 200) as preview
        FROM scenes
        WHERE story_id = %s AND episode_number = %s AND scene_number = 1
    """, (str(story_id), episode_num))

    scene = cur.fetchone()
    if scene:
        db_text = scene['preview'][:100] if scene['preview'] else ''
        print(f"  Current DB: {db_text}...")
    else:
        db_text = None
        print(f"  Current DB: NOT FOUND")

    # Summary
    print(f"\n" + "=" * 80)
    if has_stale:
        print("WARNING: Session may have stale data!")
        print("Scenes were updated after this session was created.")
        print("\nOptions:")
        print("  1. Delete session and recreate from current data")
        print("  2. Use session as-is (if prompts are still valid)")
    else:
        print("OK: Session appears to be current.")

    conn.close()


def get_beats(session_id):
    """Get all beats for a session."""
    print("=" * 80)
    print(f"BEATS FOR SESSION: {session_id}")
    print("=" * 80)

    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT scene_number, beat_id, LEFT(original_prompt, 60) as prompt_preview,
               image_path
        FROM image_review_items
        WHERE session_id = %s
        ORDER BY scene_number, beat_id
    """, (session_id,))

    items = cur.fetchall()

    if not items:
        print(f"No items found for session {session_id}")
        conn.close()
        return

    # Group by scene
    scenes = {}
    for item in items:
        scene_num = item['scene_number']
        if scene_num not in scenes:
            scenes[scene_num] = []
        scenes[scene_num].append(item)

    for scene_num in sorted(scenes.keys()):
        scene_items = scenes[scene_num]
        # Get unique beats
        beats = {}
        for item in scene_items:
            bid = item['beat_id']
            if bid not in beats:
                beats[bid] = {'count': 0, 'prompt': item['prompt_preview']}
            beats[bid]['count'] += 1

        print(f"\nScene {scene_num}: {len(beats)} beats, {len(scene_items)} images")
        for bid in sorted(beats.keys(), key=lambda x: int(x.split('-b')[1]) if '-b' in x else 0)[:5]:
            info = beats[bid]
            print(f"  {bid}: {info['count']} images - {info['prompt']}...")

        if len(beats) > 5:
            print(f"  ... and {len(beats) - 5} more beats")

    print(f"\nTotal: {len(items)} images across {len(scenes)} scenes")
    conn.close()


def check_exported(session_id):
    """Check export status for a session."""
    print("=" * 80)
    print(f"EXPORT STATUS FOR SESSION: {session_id}")
    print("=" * 80)

    conn = get_connection()
    cur = conn.cursor()

    # Get counts
    cur.execute("""
        SELECT
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE image_path LIKE '%%DaVinci_Projects%%') as exported,
            COUNT(*) FILTER (WHERE image_path LIKE '%%SwarmUI%%' OR image_path LIKE '%%Output%%') as swarmui
        FROM image_review_items
        WHERE session_id = %s
    """, (session_id,))

    status = cur.fetchone()

    print(f"\nTotal Images: {status['total']}")
    print(f"Exported to DaVinci: {status['exported']}")
    print(f"Still in SwarmUI: {status['swarmui']}")

    if status['exported'] > 0:
        # Get sample exported paths
        cur.execute("""
            SELECT DISTINCT beat_id, image_path
            FROM image_review_items
            WHERE session_id = %s AND image_path LIKE '%%DaVinci_Projects%%'
            LIMIT 5
        """, (session_id,))

        samples = cur.fetchall()
        print(f"\nSample Exported Paths:")
        for s in samples:
            print(f"  {s['beat_id']}: {s['image_path'][:70]}...")

    if status['swarmui'] > 0 and status['exported'] == 0:
        print(f"\nTo export to DaVinci:")
        print(f"  python scripts/export_images_to_davinci.py --session-id {session_id}")

    conn.close()


def get_scene_content(episode_number, scene_number, story_id=DEFAULT_STORY_ID):
    """Get scene content from database."""
    print("=" * 80)
    print(f"SCENE CONTENT: Episode {episode_number}, Scene {scene_number}")
    print("=" * 80)

    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT id, title, content, updated_at,
               entry_state, exit_state
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
    print(f"Updated: {scene['updated_at']}")

    print(f"\nEntry State:")
    print(f"  {scene['entry_state'][:200] if scene['entry_state'] else 'N/A'}...")

    print(f"\nContent Preview (first 500 chars):")
    content = scene['content'] or ''
    print(f"  {content[:500]}...")

    print(f"\nExit State:")
    print(f"  {scene['exit_state'][:200] if scene['exit_state'] else 'N/A'}...")

    conn.close()


def print_usage():
    """Print usage information."""
    print("""
Image Review Query Tool for StoryTeller

Usage:
    python image_review_query.py sessions                    List all review sessions
    python image_review_query.py session <session_id>        Get session details
    python image_review_query.py episode <episode_number>    Find session for episode
    python image_review_query.py verify <session_id>         Verify session matches current DB
    python image_review_query.py beats <session_id>          Get beats for session
    python image_review_query.py exported <session_id>       Check export status
    python image_review_query.py scene <episode> <scene>     Get scene content

Examples:
    python image_review_query.py sessions
    python image_review_query.py episode 2
    python image_review_query.py verify 72cc5fe3-4ff2-480e-92d4-f01245670995
    python image_review_query.py scene 2 1

Database: PostgreSQL on localhost:5439
Default Story: Cat & Daniel (59f64b1e-726a-439d-a6bc-0dfefcababdb)
""")


def main():
    if len(sys.argv) < 2:
        print_usage()
        sys.exit(1)

    command = sys.argv[1].lower()

    try:
        if command == 'sessions':
            list_sessions()
        elif command == 'session':
            if len(sys.argv) < 3:
                print("Usage: python image_review_query.py session <session_id>")
                sys.exit(1)
            get_session(sys.argv[2])
        elif command == 'episode':
            if len(sys.argv) < 3:
                print("Usage: python image_review_query.py episode <episode_number>")
                sys.exit(1)
            find_session_for_episode(int(sys.argv[2]))
        elif command == 'verify':
            if len(sys.argv) < 3:
                print("Usage: python image_review_query.py verify <session_id>")
                sys.exit(1)
            verify_session(sys.argv[2])
        elif command == 'beats':
            if len(sys.argv) < 3:
                print("Usage: python image_review_query.py beats <session_id>")
                sys.exit(1)
            get_beats(sys.argv[2])
        elif command == 'exported':
            if len(sys.argv) < 3:
                print("Usage: python image_review_query.py exported <session_id>")
                sys.exit(1)
            check_exported(sys.argv[2])
        elif command == 'scene':
            if len(sys.argv) < 4:
                print("Usage: python image_review_query.py scene <episode> <scene>")
                sys.exit(1)
            get_scene_content(int(sys.argv[2]), int(sys.argv[3]))
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
