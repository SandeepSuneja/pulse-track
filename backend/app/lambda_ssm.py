"""Load /pulse-track/* SSM parameters into the process environment (Lambda)."""

from __future__ import annotations

import os

_PARAM_ENV = {
    "/pulse-track/DATABASE_URL": "DATABASE_URL",
    "/pulse-track/FIREBASE_PROJECT_ID": "FIREBASE_PROJECT_ID",
    "/pulse-track/FIREBASE_PRIVATE_KEY_ID": "FIREBASE_PRIVATE_KEY_ID",
    "/pulse-track/FIREBASE_PRIVATE_KEY": "FIREBASE_PRIVATE_KEY",
    "/pulse-track/FIREBASE_CLIENT_EMAIL": "FIREBASE_CLIENT_EMAIL",
    "/pulse-track/FIREBASE_CLIENT_ID": "FIREBASE_CLIENT_ID",
    "/pulse-track/FIREBASE_CLIENT_CERT_URL": "FIREBASE_CLIENT_CERT_URL",
}


def load_ssm_into_environ() -> None:
    """Fill env vars from SSM when running on Lambda and they are not already set."""
    if not os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
        return
    missing = [name for name in _PARAM_ENV if not os.environ.get(_PARAM_ENV[name])]
    if not missing:
        return

    import boto3

    ssm = boto3.client("ssm")
    resp = ssm.get_parameters(Names=list(_PARAM_ENV.keys()), WithDecryption=True)
    found = {p["Name"] for p in resp.get("Parameters", [])}
    invalid = resp.get("InvalidParameters") or []
    if invalid or found != set(_PARAM_ENV):
        raise RuntimeError(f"Missing SSM parameters: {sorted(set(_PARAM_ENV) - found)}")
    for param in resp["Parameters"]:
        key = _PARAM_ENV[param["Name"]]
        if not os.environ.get(key):
            os.environ[key] = param["Value"]
