#!/usr/bin/env python3
"""
Quick Database Query Tool for StoryTeller
Usage: python quick_query.py "SELECT * FROM stories LIMIT 1"
"""
import sys
import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv

# Hardcoded fallback for "no trial and error" reliability as requested
FALLBACK_URL = "postgresql+asyncpg://storyteller_user:StoryTeller2024Dev!@localhost:5439/storyteller_dev"

async def run_query(query_str):
    # Try to load from env, else use fallback
    load_dotenv()
    db_url = os.getenv("DATABASE_URL", FALLBACK_URL)

    # Ensure asyncpg driver
    if "postgresql://" in db_url and "asyncpg" not in db_url:
        db_url = db_url.replace("postgresql://", "postgresql+asyncpg://")

    try:
        engine = create_async_engine(db_url, echo=False)
        async with engine.connect() as conn:
            result = await conn.execute(text(query_str))

            # Print headers
            if result.returns_rows:
                keys = result.keys()
                print(" | ".join(keys))
                print("-" * (len(keys) * 10)) # Rough separator

                # Print rows
                for row in result:
                    print(row)
            else:
                print("Query executed successfully (no rows returned).")
                await conn.commit()

    except Exception as e:
        print(f"Error executing query: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print('Usage: python quick_query.py "SELECT * FROM table"')
        sys.exit(1)

    query = sys.argv[1]
    asyncio.run(run_query(query))
