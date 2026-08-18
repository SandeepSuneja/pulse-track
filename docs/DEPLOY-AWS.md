# Deploy Pulse Track on AWS

Web SPA on S3 + CloudFront, FastAPI on App Runner, PostgreSQL on RDS. The same HTTPS API and database are what a later mobile app will use.

Region used throughout: **ap-south-1** (Mumbai). Swap the region in every command if you use another.

```
Browser ──► CloudFront ──► S3 (React build)
                │
                │  Authorization: Bearer <Firebase ID token>
                ▼
Mobile ──────► App Runner (FastAPI :8000) ──► RDS PostgreSQL
                │
                └── Firebase Admin (verify token)
```

## 0. Prerequisites

- AWS account. IAM user or role that can manage App Runner, ECR, RDS, S3, CloudFront, SSM, VPC, and IAM.
- [AWS CLI v2](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) configured:

```powershell
aws configure
# AWS Access Key ID / Secret, region: ap-south-1, output: json
```

- Docker Desktop running.
- Firebase project already used locally (same project the mobile app will use).
- This repo cloned; backend and frontend env files filled for local Firebase config.

Confirm identity and region:

```powershell
aws sts get-caller-identity
aws configure get region
```

Set helpers (PowerShell). Replace the account id if `get-caller-identity` printed a different one:

```powershell
$Region = "ap-south-1"
$AccountId = (aws sts get-caller-identity --query Account --output text)
$EcrUri = "$AccountId.dkr.ecr.$Region.amazonaws.com"
$ApiRepo = "pulse-track-api"
$WebBucket = "pulse-track-web-$AccountId"
```

S3 bucket names are global. If `$WebBucket` is taken, pick another unique name and use it in every S3/CloudFront step.

---

## 1. Network and database

### 1.1 VPC

Use the **default VPC** in `ap-south-1` (two or more subnets in different AZs). In the console: **VPC → Your VPCs**. Note the VPC ID and at least two **private or default subnet** IDs.

App Runner needs a **VPC connector** on those subnets so it can reach RDS. RDS should **not** be publicly accessible.

### 1.2 Security groups

Create two security groups in the same VPC:

| Name | Inbound |
|---|---|
| `pulse-track-apprunner-sg` | none required for RDS (App Runner egress is enough) |
| `pulse-track-rds-sg` | TCP **5432** from `pulse-track-apprunner-sg` only |

Console: **EC2 → Security Groups → Create**.

### 1.3 RDS PostgreSQL

Console: **RDS → Create database**.

| Setting | Value |
|---|---|
| Engine | PostgreSQL 16 |
| Template | Free tier if eligible, otherwise Dev/Test |
| Identifier | `pulse-track-db` |
| Instance | `db.t4g.micro` |
| Storage | 20 GiB gp3, autoscaling optional |
| Credentials | set a master username and a strong password; save them |
| VPC | default VPC |
| Public access | **No** |
| VPC security group | `pulse-track-rds-sg` (not the default SG) |
| Initial database name | `pulsetrack` |
| Backup retention | 7 days |

Wait until **Available**. Copy the endpoint, for example `pulse-track-db.xxxxx.ap-south-1.rds.amazonaws.com`.

Connection string (URL-encode any special characters in the password):

```
postgresql+psycopg2://MASTER_USER:PASSWORD@RDS_ENDPOINT:5432/pulsetrack
```

Tables are created on API startup (`Base.metadata.create_all`). You do not run a separate migration for a fresh database.

---

## 2. Secrets (SSM Parameter Store)

Do **not** put `backend/firebase-service-account.json` in the Docker image. Store secrets as SecureString parameters.

Firebase values come from **Project settings → Service accounts → Generate new private key**. The private key must keep `\n` sequences when stored as a single-line env value.

```powershell
aws ssm put-parameter --name /pulse-track/DATABASE_URL --type SecureString --overwrite --value "postgresql+psycopg2://USER:PASSWORD@RDS_ENDPOINT:5432/pulsetrack"

aws ssm put-parameter --name /pulse-track/FIREBASE_PROJECT_ID --type SecureString --overwrite --value "your-firebase-project-id"
aws ssm put-parameter --name /pulse-track/FIREBASE_PRIVATE_KEY_ID --type SecureString --overwrite --value "your-private-key-id"
aws ssm put-parameter --name /pulse-track/FIREBASE_PRIVATE_KEY --type SecureString --overwrite --value "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
aws ssm put-parameter --name /pulse-track/FIREBASE_CLIENT_EMAIL --type SecureString --overwrite --value "firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com"
aws ssm put-parameter --name /pulse-track/FIREBASE_CLIENT_ID --type SecureString --overwrite --value "your-client-id"
aws ssm put-parameter --name /pulse-track/FIREBASE_CLIENT_CERT_URL --type SecureString --overwrite --value "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40your-project.iam.gserviceaccount.com"
```

Plain env on App Runner (not SSM):

- `DEV_SKIP_AUTH=false`
- `CORS_ORIGINS=https://localhost` as a placeholder until CloudFront exists (step 5 updates this)

---

## 3. Container registry and API (ECR + App Runner)

### 3.1 ECR repository

```powershell
aws ecr create-repository --repository-name $ApiRepo --region $Region
```

### 3.2 Build and push

From the **repo root** (`pulse-track/`):

```powershell
aws ecr get-login-password --region $Region | docker login --username AWS --password-stdin $EcrUri

docker build -t $ApiRepo ./backend
docker tag "${ApiRepo}:latest" "${EcrUri}/${ApiRepo}:latest"
docker push "${EcrUri}/${ApiRepo}:latest"
```

### 3.3 App Runner VPC connector

Console: **App Runner → VPC connectors → Create**.

- Name: `pulse-track-vpc`
- VPC: same as RDS
- Subnets: the subnets RDS uses (at least two AZs)
- Security group: `pulse-track-apprunner-sg`

### 3.4 App Runner service

Console: **App Runner → Create service**.

| Setting | Value |
|---|---|
| Source | Amazon ECR, image `${EcrUri}/${ApiRepo}:latest` |
| Deployment | Manual (or Automatic if you want every push to go live) |
| Port | `8000` |
| Health check | Protocol HTTP, path `/api/health` |
| VPC connector | `pulse-track-vpc` |
| `DEV_SKIP_AUTH` | `false` |
| `CORS_ORIGINS` | placeholder `https://localhost` (replace in step 5) |

Add environment variables from SSM (App Runner → Configuration → Environment variables → **Reference a secret or parameter**):

| App env name | SSM parameter |
|---|---|
| `DATABASE_URL` | `/pulse-track/DATABASE_URL` |
| `FIREBASE_PROJECT_ID` | `/pulse-track/FIREBASE_PROJECT_ID` |
| `FIREBASE_PRIVATE_KEY_ID` | `/pulse-track/FIREBASE_PRIVATE_KEY_ID` |
| `FIREBASE_PRIVATE_KEY` | `/pulse-track/FIREBASE_PRIVATE_KEY` |
| `FIREBASE_CLIENT_EMAIL` | `/pulse-track/FIREBASE_CLIENT_EMAIL` |
| `FIREBASE_CLIENT_ID` | `/pulse-track/FIREBASE_CLIENT_ID` |
| `FIREBASE_CLIENT_CERT_URL` | `/pulse-track/FIREBASE_CLIENT_CERT_URL` |

Create an instance role if the console asks for one, with `ssm:GetParameters` on `arn:aws:ssm:ap-south-1:ACCOUNT_ID:parameter/pulse-track/*`.

When the service is running, copy the default URL:

```
https://xxxx.ap-south-1.awsapprunner.com
```

That origin is the API base URL for the **web app and the future mobile app**.

```powershell
$ApiUrl = "https://xxxx.ap-south-1.awsapprunner.com"
curl.exe "$ApiUrl/api/health"
```

Expect `{"status":"ok","service":"pulse-track"}`. If this fails, check App Runner logs (RDS SG, VPC connector subnets, SSM values).

---

## 4. Frontend build and S3

### 4.1 Bucket

```powershell
aws s3 mb "s3://$WebBucket" --region $Region
aws s3api put-public-access-block --bucket $WebBucket --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
```

Keep the bucket **private**. CloudFront will read it through Origin Access Control (OAC).

### 4.2 Build

`VITE_API_URL` is compiled into the JS bundle. Rebuild if the App Runner URL changes.

Use the same Firebase web config as local `frontend/.env` (`VITE_FIREBASE_*`).

```powershell
cd frontend
npm ci
$env:VITE_API_URL = $ApiUrl
npm run build
aws s3 sync dist/ "s3://$WebBucket/" --delete
cd ..
```

---

## 5. CloudFront

### 5.1 Origin Access Control

Console: **CloudFront → Origin access → Create control setting** (or during distribution create).

- Name: `pulse-track-oac`
- Sign requests: **Yes**
- Origin type: **S3**

### 5.2 Distribution

Console: **CloudFront → Create distribution**.

| Setting | Value |
|---|---|
| Origin domain | the S3 bucket (`pulse-track-web-ACCOUNT.s3.ap-south-1.amazonaws.com`) |
| Origin access | OAC created above |
| Viewer protocol | Redirect HTTP to HTTPS |
| Allowed HTTP methods | GET, HEAD, OPTIONS |
| Default root object | `index.html` |
| Alternate domain | none (optional later) |

After create, CloudFront shows a bucket policy snippet. Attach it:

```powershell
# Paste the policy JSON CloudFront displays, then:
aws s3api put-bucket-policy --bucket $WebBucket --policy file://cloudfront-bucket-policy.json
```

### 5.3 SPA routing (required)

`BrowserRouter` needs unknown paths to serve `index.html`.

Console: **Distribution → Error pages → Create custom error response** (twice):

| HTTP error | Response page | Response code |
|---|---|---|
| 403 | `/index.html` | 200 |
| 404 | `/index.html` | 200 |

Wait until the distribution status is **Enabled**. Copy the domain:

```
https://dxxxx.cloudfront.net
```

```powershell
$WebUrl = "https://dxxxx.cloudfront.net"
```

### 5.4 Point API CORS and Firebase at CloudFront

App Runner → service → **Configuration → Environment variables** → set:

```
CORS_ORIGINS=https://dxxxx.cloudfront.net
```

Deploy / restart the App Runner service so the new value loads.

Firebase Console → **Authentication → Settings → Authorized domains** → add:

- `dxxxx.cloudfront.net`

Do not add `http://` or a path.

---

## 6. Verify

1. Health: `curl.exe "$ApiUrl/api/health"` → `{"status":"ok","service":"pulse-track"}`.
2. Open `$WebUrl`, sign in with Google or email.
3. Create a Board task. It should persist after refresh.
4. Optional RDS check (from a bastion or temporary public access you remove afterward):

```sql
SELECT id, email FROM users;
SELECT id, title FROM tasks;
```

5. Mobile-path smoke test (replace the token with a real Firebase ID token from the browser: DevTools → Application / Network request header):

```powershell
curl.exe -H "Authorization: Bearer YOUR_FIREBASE_ID_TOKEN" "$ApiUrl/api/users/me"
```

---

## 7. Mobile app contract

No extra AWS services are required for a native app.

| Item | Value |
|---|---|
| Base URL | App Runner HTTPS origin (`$ApiUrl`) |
| Paths | `/api/users`, `/api/tasks`, `/api/activities`, `/api/goals`, `/api/analytics` |
| Auth | `Authorization: Bearer <Firebase ID token>` from the **same** Firebase project |
| CORS | Ignored by native iOS/Android. Add a webview origin to `CORS_ORIGINS` only if you ship one |

Keep `DEV_SKIP_AUTH=false`. Ship the API URL as a mobile config value (not hardcoded to localhost).

Optional later (not required for first deploy): custom domains `api.yourdomain.com` and `app.yourdomain.com` with ACM certificates and Route 53.

---

## Updating after the first deploy

**API**

```powershell
aws ecr get-login-password --region $Region | docker login --username AWS --password-stdin $EcrUri
docker build -t $ApiRepo ./backend
docker tag "${ApiRepo}:latest" "${EcrUri}/${ApiRepo}:latest"
docker push "${EcrUri}/${ApiRepo}:latest"
```

Then **App Runner → Deploy** (or rely on automatic deployments).

**Web**

```powershell
cd frontend
$env:VITE_API_URL = $ApiUrl
npm ci
npm run build
aws s3 sync dist/ "s3://$WebBucket/" --delete
aws cloudfront create-invalidation --distribution-id EXXXXXXXXXXXXX --paths "/*"
```

---

## Troubleshooting

| Symptom | Check |
|---|---|
| App Runner health check fails | Logs: RDS unreachable (SG 5432, VPC connector subnets), bad `DATABASE_URL`, Firebase init error |
| `Firebase Auth is not configured` | SSM `FIREBASE_*` names match env names; private key includes `\n` |
| Browser CORS error | `CORS_ORIGINS` is exactly `https://dxxxx.cloudfront.net` (no trailing slash); App Runner restarted |
| Google sign-in blocked | CloudFront domain in Firebase authorized domains |
| `/board` CloudFront 403/404 | Custom error pages 403/404 → `/index.html` 200 |
| Frontend still calls localhost | Rebuild with `$env:VITE_API_URL` set; `VITE_*` is compile-time |
| RDS timeout from App Runner | VPC connector on RDS subnets; RDS SG allows the connector SG on 5432; public access off is expected |

---

## Cost (ballpark, ap-south-1)

- App Runner: idle + request-based; often a few dollars to ~$15/month for light use
- RDS `db.t4g.micro`: roughly $12–20/month depending on free-tier eligibility
- S3 + CloudFront: cents at low traffic
- ECR: cents for one small image

Stop App Runner and delete RDS if you are only testing and want to avoid idle charges.
