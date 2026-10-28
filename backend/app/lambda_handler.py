"""AWS Lambda entrypoint (container image or zip with Mangum)."""

from app.lambda_ssm import load_ssm_into_environ

load_ssm_into_environ()

from mangum import Mangum

from app.main import app

handler = Mangum(app, lifespan="auto")
