# On-demand API (Lambda + API Gateway) on existing RDS

FastAPI runs on **Lambda** behind **HTTP API Gateway**. The same **RDS PostgreSQL** (`pulse-track-db`) is used — data is not copied or wiped.

This layout **does not** use ECS, ALB, NAT Gateway, or RDS Proxy. Those were the hourly charges from October.

Region: **us-east-1**.

```text
Browser / Mobile
       │
       ▼
API Gateway (HTTP API)  ──►  Lambda (zip, not in a VPC)
       │                           │
       │                           ├──► RDS PostgreSQL (public SSL)
       │                           └──► Firebase (Lambda internet, no NAT)
CloudFront + S3 (web)
```

**Live endpoint (created 2026-10-28):**

`https://d896tye5ji.execute-api.us-east-1.amazonaws.com`

Health: `GET /api/health` → `{"status":"ok","service":"pulse-track"}`.

---

## Cost (what stays hourly)

| Piece | Billing |
|---|---|
| Lambda + API Gateway | Per request (near $0 at light use) |
| RDS `db.t4g.micro` | **Hourly while available** (~$10–12/month). Must stay running for the API. |
| Public IPv4 on RDS | ~$3.65/month |
| NAT / ALB / ECS / Proxy | **Do not recreate** |

RDS cannot pause per request. Stopping it makes the API fail until you start it again (several minutes). AWS also **restarts a stopped instance after 7 days**.

---

## Why RDS is public (no NAT)

Lambda **outside a VPC** can reach Firebase and RDS over the internet. Lambda **inside a VPC** needs a NAT Gateway for Firebase (~$45+/month), which is what blew the October bill.

RDS security group `pulse-track-rds-sg` allows **5432** from `0.0.0.0/0`. The app uses **SSL** (`sslmode=require`). Keep a strong master password. Do not add a regional NAT or RDS Proxy unless you accept that bill.

---

## Repo behavior

| File | Purpose |
|------|---------|
| `backend/app/lambda_handler.py` | Mangum handler |
| `backend/app/lambda_ssm.py` | Loads `/pulse-track/*` SSM into env on cold start |
| `backend/app/database.py` | `NullPool` + SSL on Lambda |
| `.github/workflows/deploy-lambda.yml` | Zip deploy on `master` when `LAMBDA_FUNCTION_NAME` is set |

Lambda **does not** run DDL on cold start. Schema changes: `python scripts/run_postgres_migrations.py` against RDS.

---

## AWS resources (already created)

| Resource | Name / id |
|---|---|
| IAM role | `pulse-track-lambda-role` |
| Lambda | `pulse-track-api` (Python 3.12 zip, 512 MB, 30 s) |
| HTTP API | `pulse-track-http` (`d896tye5ji`) |
| RDS | `pulse-track-db` (same data) |
| SSM | `/pulse-track/DATABASE_URL` and `FIREBASE_*` |

Redeploy code (from a Linux/CI environment, or a Linux-wheel zip):

```powershell
aws lambda update-function-code --function-name pulse-track-api --zip-file fileb://lambda.zip --region us-east-1
```

---

## Point web and mobile at the new API

1. GitHub variable `VITE_API_URL` = `https://d896tye5ji.execute-api.us-east-1.amazonaws.com` (no trailing slash).
2. Rebuild/sync the frontend (or set `LAMBDA_FUNCTION_NAME=pulse-track-api` and keep S3 deploy).
3. Mobile: `--dart-define=DEPLOYED_API_BASE_URL=https://d896tye5ji.execute-api.us-east-1.amazonaws.com`
4. Lambda env `CORS_ORIGINS` is `https://d1an7n363nv3up.cloudfront.net`.
5. **Disable** the old **Deploy** (ECS) GitHub workflow so it cannot recreate Fargate/ALB.

GitHub **Deploy Lambda API** needs variable `LAMBDA_FUNCTION_NAME=pulse-track-api` and IAM `lambda:UpdateFunctionCode`.

---

## Do not recreate

- NAT Gateway (regional or otherwise)
- ECS Express / ALB
- RDS Proxy
- Lambda **in a VPC** (unless you add NAT and accept the cost)
