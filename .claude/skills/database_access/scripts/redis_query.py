#!/usr/bin/env python3
"""
Redis Query Tool for StoryTeller/StoryArt
Usage:
    python redis_query.py sessions              # List all StoryArt sessions
    python redis_query.py session <id>          # Get session details
    python redis_query.py beats <session_id>    # Get beats for a session
    python redis_query.py images <session_id>   # Get image batches for session
    python redis_query.py key <key_name>        # Get any Redis key
"""
import sys
import json
import redis

# Redis configuration (StoryArt uses port 6382)
REDIS_CONFIG = {
    'host': 'localhost',
    'port': 6382,
    'db': 0,
    'decode_responses': True
}


def get_redis_client():
    """Create Redis connection."""
    return redis.Redis(**REDIS_CONFIG)


def parse_session_data(data):
    """Parse the nested StoryArt session structure."""
    result = {
        'episode_number': None,
        'title': None,
        'story_uuid': None,
        'scenes': [],
        'total_beats': 0
    }

    # Get story UUID
    result['story_uuid'] = data.get('storyUuid')

    # Get episode info from analyzedEpisode
    ae = data.get('analyzedEpisode', {})
    result['episode_number'] = ae.get('episodeNumber')
    result['title'] = ae.get('title')

    # Get scenes and count beats
    scenes = ae.get('scenes', [])
    result['scenes'] = scenes
    for scene in scenes:
        result['total_beats'] += len(scene.get('beats', []))

    return result


def list_sessions(r):
    """List all StoryArt sessions."""
    print("=" * 70)
    print("STORYART SESSIONS")
    print("=" * 70)

    # Find session keys (stored as strings: storyart:session:{id})
    session_keys = [k for k in r.scan_iter("storyart:session:*") if k.count(':') == 2]

    if not session_keys:
        print("No sessions found.")
        print("\nTry: python redis_query.py key 'storyart:*'")
        return

    for key in sorted(session_keys, key=lambda x: int(x.split(":")[2]) if x.split(":")[2].isdigit() else 0):
        session_id = key.split(":")[2]

        # Get session data (stored as JSON string)
        data_raw = r.get(key)
        if not data_raw:
            continue

        try:
            data = json.loads(data_raw)
            parsed = parse_session_data(data)
        except json.JSONDecodeError:
            print(f"\nSession: {session_id} [invalid JSON]")
            continue

        print(f"\nSession: {session_id}")
        print(f"  Episode: {parsed['episode_number']} - {parsed['title'] or 'N/A'}")
        print(f"  Scenes: {len(parsed['scenes'])}")
        print(f"  Total Beats: {parsed['total_beats']}")

    print(f"\n[Found {len(session_keys)} session(s)]")


def get_session(r, session_id):
    """Get details for a specific session."""
    print("=" * 70)
    print(f"SESSION: {session_id}")
    print("=" * 70)

    # Get session data (stored as JSON string)
    session_key = f"storyart:session:{session_id}"
    data_raw = r.get(session_key)

    if not data_raw:
        print(f"Session {session_id} not found.")
        print("\nAvailable sessions:")
        list_sessions(r)
        return

    try:
        data = json.loads(data_raw)
        parsed = parse_session_data(data)
    except json.JSONDecodeError:
        print(f"Session {session_id} has invalid JSON data.")
        return

    # Extract metadata
    print("\nMetadata:")
    print(f"  Episode: {parsed['episode_number']} - {parsed['title'] or 'N/A'}")
    print(f"  Story UUID: {parsed['story_uuid'] or 'N/A'}")
    print(f"  Scenes: {len(parsed['scenes'])}")
    print(f"  Total Beats: {parsed['total_beats']}")

    # Show scene breakdown
    if parsed['scenes']:
        print("\nScene Breakdown:")
        for scene in parsed['scenes']:
            scene_num = scene.get('sceneNumber', '?')
            scene_title = scene.get('title', 'Untitled')
            beat_count = len(scene.get('beats', []))
            print(f"  Scene {scene_num}: {scene_title} ({beat_count} beats)")

    # Show first few beats from first scene
    if parsed['scenes'] and parsed['scenes'][0].get('beats'):
        print("\nFirst 5 Beats (Scene 1):")
        for beat in parsed['scenes'][0]['beats'][:5]:
            beat_id = beat.get('beatId', 'unknown')
            beat_title = beat.get('beat_title', '')
            if beat_title and len(beat_title) > 50:
                beat_title = beat_title[:50] + "..."
            print(f"  {beat_id}: {beat_title or 'N/A'}")


def get_beats(r, session_id):
    """Get all beats for a session."""
    session_key = f"storyart:session:{session_id}"
    data_raw = r.get(session_key)

    if not data_raw:
        print(f"Session {session_id} not found")
        return

    try:
        data = json.loads(data_raw)
        parsed = parse_session_data(data)
    except json.JSONDecodeError:
        print(f"Session {session_id} has invalid JSON data")
        return

    if not parsed['scenes']:
        print(f"No scenes/beats found for session {session_id}")
        return

    print("=" * 70)
    print(f"BEATS FOR SESSION: {session_id}")
    print(f"Episode {parsed['episode_number']}: {parsed['title']}")
    print("=" * 70)
    print(f"Total: {parsed['total_beats']} beats across {len(parsed['scenes'])} scenes\n")

    for scene in parsed['scenes']:
        scene_num = scene.get('sceneNumber', '?')
        scene_title = scene.get('title', 'Untitled')
        beats = scene.get('beats', [])

        print(f"Scene {scene_num}: {scene_title} ({len(beats)} beats)")

        for beat in beats[:5]:  # Show first 5 per scene
            beat_id = beat.get('beatId', 'unknown')
            beat_title = beat.get('beat_title', beat.get('core_action', ''))
            if beat_title and len(beat_title) > 50:
                beat_title = beat_title[:50] + "..."
            print(f"  {beat_id}: {beat_title or 'N/A'}")

        if len(beats) > 5:
            print(f"  ... and {len(beats) - 5} more")
        print()


def get_images(r, session_id):
    """Get image prompts for a session (prompts are stored within beats)."""
    session_key = f"storyart:session:{session_id}"
    data_raw = r.get(session_key)

    if not data_raw:
        print(f"Session {session_id} not found")
        return

    try:
        data = json.loads(data_raw)
        parsed = parse_session_data(data)
    except json.JSONDecodeError:
        print(f"Session {session_id} has invalid JSON data")
        return

    print("=" * 70)
    print(f"IMAGE PROMPTS FOR SESSION: {session_id}")
    print(f"Episode {parsed['episode_number']}: {parsed['title']}")
    print("=" * 70)

    total_prompts = 0
    beats_with_prompts = 0

    for scene in parsed['scenes']:
        scene_num = scene.get('sceneNumber', '?')
        scene_title = scene.get('title', 'Untitled')
        beats = scene.get('beats', [])

        scene_prompts = 0
        for beat in beats:
            prompts = beat.get('prompts', [])
            if prompts:
                scene_prompts += len(prompts)
                beats_with_prompts += 1

        total_prompts += scene_prompts
        print(f"\nScene {scene_num}: {scene_title}")
        print(f"  Beats with prompts: {sum(1 for b in beats if b.get('prompts'))}/{len(beats)}")
        print(f"  Total prompts: {scene_prompts}")

        # Show sample prompts from first beat with prompts
        for beat in beats[:3]:
            prompts = beat.get('prompts', [])
            if prompts:
                beat_id = beat.get('beatId', 'unknown')
                print(f"\n  {beat_id}:")
                for p in prompts[:2]:
                    prompt_text = p if isinstance(p, str) else p.get('prompt', str(p))
                    if len(prompt_text) > 70:
                        prompt_text = prompt_text[:70] + "..."
                    print(f"    - {prompt_text}")
                if len(prompts) > 2:
                    print(f"    ... and {len(prompts) - 2} more")
                break  # Only show first beat with prompts per scene

    print(f"\n" + "=" * 70)
    print(f"SUMMARY")
    print(f"  Scenes: {len(parsed['scenes'])}")
    print(f"  Beats with prompts: {beats_with_prompts}")
    print(f"  Total prompts: {total_prompts}")


def get_key(r, pattern):
    """Get any Redis key (supports wildcards)."""
    if '*' in pattern:
        # Pattern search
        keys = list(r.scan_iter(pattern))
        print(f"Keys matching '{pattern}':")
        for key in sorted(keys)[:50]:
            key_type = r.type(key)
            print(f"  [{key_type}] {key}")
        if len(keys) > 50:
            print(f"  ... and {len(keys) - 50} more")
        print(f"\nTotal: {len(keys)} keys")
    else:
        # Direct key lookup
        key_type = r.type(pattern)
        print(f"Key: {pattern}")
        print(f"Type: {key_type}")

        if key_type == 'string':
            value = r.get(pattern)
            print(f"Value: {value[:500] if value else 'N/A'}...")
        elif key_type == 'hash':
            value = r.hgetall(pattern)
            print("Value:")
            for k, v in value.items():
                print(f"  {k}: {str(v)[:100]}")
        elif key_type == 'list':
            length = r.llen(pattern)
            print(f"Length: {length}")
            print("First 3 items:")
            for item in r.lrange(pattern, 0, 2):
                print(f"  {str(item)[:100]}...")
        elif key_type == 'set':
            members = r.smembers(pattern)
            print(f"Members ({len(members)}):")
            for m in list(members)[:10]:
                print(f"  {m}")
        elif key_type == 'none':
            print("Key does not exist")


def print_usage():
    """Print usage information."""
    print("""
Redis Query Tool for StoryTeller/StoryArt

Usage:
    python redis_query.py sessions              List all StoryArt sessions
    python redis_query.py session <id>          Get session details
    python redis_query.py beats <session_id>    Get beats for a session
    python redis_query.py images <session_id>   Get image batches
    python redis_query.py key <key_name>        Get any Redis key
    python redis_query.py key 'pattern*'        Search keys by pattern

Examples:
    python redis_query.py sessions
    python redis_query.py session 1769321342004
    python redis_query.py beats 1769321342004
    python redis_query.py key 'storyart:*'

Redis Config:
    Host: localhost
    Port: 6382
    DB: 0
""")


def main():
    if len(sys.argv) < 2:
        print_usage()
        sys.exit(1)

    command = sys.argv[1].lower()

    try:
        r = get_redis_client()
        r.ping()  # Test connection
    except redis.ConnectionError:
        print("ERROR: Cannot connect to Redis")
        print(f"  Host: {REDIS_CONFIG['host']}")
        print(f"  Port: {REDIS_CONFIG['port']}")
        print("\nIs Redis running? Check with: redis-cli -p 6382 ping")
        sys.exit(1)

    if command == 'sessions':
        list_sessions(r)
    elif command == 'session':
        if len(sys.argv) < 3:
            print("Usage: python redis_query.py session <session_id>")
            sys.exit(1)
        get_session(r, sys.argv[2])
    elif command == 'beats':
        if len(sys.argv) < 3:
            print("Usage: python redis_query.py beats <session_id>")
            sys.exit(1)
        get_beats(r, sys.argv[2])
    elif command == 'images':
        if len(sys.argv) < 3:
            print("Usage: python redis_query.py images <session_id>")
            sys.exit(1)
        get_images(r, sys.argv[2])
    elif command == 'key':
        if len(sys.argv) < 3:
            print("Usage: python redis_query.py key <key_name>")
            sys.exit(1)
        get_key(r, sys.argv[2])
    else:
        print(f"Unknown command: {command}")
        print_usage()
        sys.exit(1)


if __name__ == "__main__":
    main()
