from app.utils.security import hash_password, verify_password


def test_verify_password_accepts_the_correct_password():
    hashed = hash_password("correct-horse-battery-staple")
    assert verify_password("correct-horse-battery-staple", hashed) is True


def test_verify_password_rejects_the_wrong_password():
    hashed = hash_password("correct-horse-battery-staple")
    assert verify_password("something-else", hashed) is False


def test_hash_password_salts_differently_each_time():
    a = hash_password("same-password")
    b = hash_password("same-password")
    assert a != b
    assert verify_password("same-password", a) is True
    assert verify_password("same-password", b) is True


def test_verify_password_rejects_malformed_hash():
    assert verify_password("anything", "not-a-valid-hash-format") is False
