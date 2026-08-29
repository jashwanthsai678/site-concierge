import hashlib
import hmac
import secrets

# PBKDF2-HMAC-SHA256 via the stdlib — no bcrypt/passlib dependency needed
# for an MVP with one password per business. Stored as "salt$hash", both
# hex-encoded, so verification never needs a second column.
_ITERATIONS = 260_000


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), _ITERATIONS)
    return f"{salt}${digest.hex()}"


def verify_password(password: str, hashed: str) -> bool:
    try:
        salt, expected_hex = hashed.split("$", 1)
    except ValueError:
        return False
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), _ITERATIONS)
    return hmac.compare_digest(digest.hex(), expected_hex)
