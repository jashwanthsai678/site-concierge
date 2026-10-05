"""Creates (or updates the password of) an internal Qualeadio team account.

There is deliberately no public /api/team/auth/register endpoint — a staff
account grants access to every client business (list, edit, suspend,
impersonate), so provisioning one is a deliberate CLI action, not
self-service signup.

Usage (from backend/, with the venv active):
    python -m scripts.create_staff_user owner@qualeadio.com "Jane Doe"

Prompts for a password interactively rather than taking it as an argv
(which would land in shell history / process listings).
"""

import asyncio
import getpass
import sys

from sqlalchemy import select

from app.database.engine import create_all_tables
from app.database.session import async_session_factory
from app.models.staff_user import StaffUser
from app.utils.security import hash_password


async def main(email: str, name: str) -> None:
    password = getpass.getpass("Password (min 8 chars): ")
    if len(password) < 8:
        print("Password must be at least 8 characters.", file=sys.stderr)
        raise SystemExit(1)
    if password != getpass.getpass("Confirm password: "):
        print("Passwords did not match.", file=sys.stderr)
        raise SystemExit(1)

    await create_all_tables()

    async with async_session_factory() as db:
        existing = (
            await db.execute(select(StaffUser).where(StaffUser.email == email))
        ).scalar_one_or_none()

        if existing is not None:
            existing.hashed_password = hash_password(password)
            existing.name = name
            existing.is_active = True
            await db.commit()
            print(f"Updated existing staff account: {email}")
            return

        db.add(StaffUser(email=email, name=name, hashed_password=hash_password(password), is_active=True))
        await db.commit()
        print(f"Created staff account: {email}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print('Usage: python -m scripts.create_staff_user <email> "<full name>"', file=sys.stderr)
        raise SystemExit(1)
    asyncio.run(main(sys.argv[1], sys.argv[2]))
