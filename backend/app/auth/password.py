"""Password handling.

Per project decision Q2-C, passwords are stored as plaintext in the DB.
Login verification is a plain string comparison.
This is a documented security trade-off — see spec-13 §3.
"""


def verify_password(plain: str, stored: str) -> bool:
    return plain == stored
