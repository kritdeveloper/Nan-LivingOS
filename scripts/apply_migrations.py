from __future__ import annotations

import asyncio
import os
from pathlib import Path

import asyncpg
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]


async def main() -> None:
    load_dotenv(ROOT / ".env")
    database_url = os.environ["NAN_DATABASE_URL"]
    connection = await asyncpg.connect(database_url, timeout=15)
    try:
        for migration in sorted((ROOT / "migrations").glob("*.sql")):
            await connection.execute(migration.read_text())
            print(f"Applied {migration.name}")
    finally:
        await connection.close()


if __name__ == "__main__":
    asyncio.run(main())
