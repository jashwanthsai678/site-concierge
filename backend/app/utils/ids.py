import uuid


def new_session_token() -> str:
    return uuid.uuid4().hex
