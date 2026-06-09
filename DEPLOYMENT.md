# Deployment Guide — Two Repos, Docker + Jenkins + AKS

The app is split across **two Git repositories**:

| Repo               | Contains                                                        |
|--------------------|-----------------------------------------------------------------|
| `product-api`      | .NET 8 backend + Dockerfile + Jenkinsfile + k8s (MySQL + API)   |
| `product-frontend` | Angular 21 frontend + Dockerfile + Jenkinsfile + k8s (frontend) |

The backend repo owns the database, so its `k8s/` carries both MySQL and the API.
The frontend repo carries only its own manifest.

```
push to product-api      → Jenkins "product-api"      → build → ACR → apply+rollout (mysql+api)
push to product-frontend → Jenkins "product-frontend" → build → ACR → apply+rollout (frontend)
```

Replace `anishfullstackacr` with your own globally unique ACR name everywhere.
This file lives outside both repos — keep it handy, or drop a copy in each repo.

====================================================================
## PHASE 0 — Push both repos to GitHub (one-time)
====================================================================

Create two empty GitHub repos (no README): `product-api`, `product-frontend`.

```bash
# product-api
cd product-api
git init && git add . && git commit -m "Initial commit"
git remote add origin https://github.com/<you>/product-api.git
git branch -M main && git push -u origin main
cd ..

# product-frontend
cd product-frontend
git init && git add . && git commit -m "Initial commit"
git remote add origin https://github.com/<you>/product-frontend.git
git branch -M main && git push -u origin main
cd ..
```

====================================================================
## PHASE 1 — App onto AKS by hand (one-time)
====================================================================

### Step 1 — Install tools
```bash
brew install azure-cli
az aks install-cli        # kubectl
az login
```
Docker Desktop running. Verify: az --version, kubectl version --client, docker --version.

### Step 2 — Variables (re-run in each new terminal)
```bash
RG=fullstack-rg
LOCATION=centralindia
ACR=anishfullstackacr
AKS=fullstack-aks
```

### Step 3 — Registry
```bash
az group create -n $RG -l $LOCATION
az acr create -n $ACR -g $RG --sku Basic
az acr login -n $ACR
```

### Step 4 — Build & push both images
From the product-api repo folder:
```bash
docker build --platform linux/amd64 -t $ACR.azurecr.io/product-api:latest .
docker push $ACR.azurecr.io/product-api:latest
```
From the product-frontend repo folder:
```bash
docker build --platform linux/amd64 -t $ACR.azurecr.io/product-frontend:latest .
docker push $ACR.azurecr.io/product-frontend:latest
```
Confirm: az acr repository list -n $ACR -o table

### Step 5 — AKS cluster
```bash
az aks create -n $AKS -g $RG --node-count 2 --attach-acr $ACR --generate-ssh-keys
az aks get-credentials -n $AKS -g $RG
kubectl get nodes
```


<!-- az aks create -n $AKS -g $RG \
  --node-count 1 \
  --node-vm-size Standard_B2s_v2 \
  --attach-acr $ACR \
  --generate-ssh-keys -->


### Step 6 — Deploy the BACKEND first (creates MySQL + API)
From the product-api repo folder:
```bash
sed -i '' "s/<ACR_NAME>/$ACR/g" k8s/02-api.yaml      # Linux: drop the ''
kubectl apply -f k8s/01-mysql.yaml
kubectl apply -f k8s/02-api.yaml
git add k8s/ && git commit -m "Set ACR name" && git push
```

### Step 7 — Deploy the FRONTEND
From the product-frontend repo folder:
```bash
sed -i '' "s/<ACR_NAME>/$ACR/g" k8s/03-frontend.yaml
kubectl apply -f k8s/03-frontend.yaml
git add k8s/ && git commit -m "Set ACR name" && git push
```

### Step 8 — Wait for pods + get the public IP
```bash
kubectl get pods -w                       # all Running / 1/1
kubectl get svc product-frontend -w       # wait for EXTERNAL-IP
```
Open the EXTERNAL-IP. Two seeded products = success. **App is live.**

====================================================================
## PHASE 2 — Jenkins automation (one-time)
====================================================================

### Step 9 — Tools reachable by Jenkins
`which az kubectl docker` as the Jenkins user. Empty = PATH fix in Jenkinsfile.

### Step 10 — Service principal
```bash
SUB_ID=$(az account show --query id -o tsv)
az ad sp create-for-rbac --name jenkins-aks-sp --role Contributor \
  --scopes /subscriptions/$SUB_ID/resourceGroups/$RG
```
Copy appId, password, tenant.

### Step 11 — Jenkins credentials (Secret text, exact IDs)
azure-client-id = appId · azure-client-secret = password · azure-tenant-id = tenant

### Step 12 — Two Jenkins jobs
- product-api: New Item → Pipeline → Pipeline script from SCM → Git → product-api repo → Script Path `Jenkinsfile`
- product-frontend: same, pointing at the product-frontend repo
Check ACR/RG/AKS names at the top of each Jenkinsfile.

### Step 13 — Build Now on each. Watch Console Output.

### Step 14 — Auto-build
Each job → Configure → Build Triggers → Poll SCM → `H/2 * * * *`.

====================================================================
## The repeating loop
====================================================================
- Backend change  → push product-api      → its job redeploys MySQL+API
- Frontend change → push product-frontend  → its job redeploys frontend
Each push triggers only its own pipeline.

====================================================================
## Troubleshooting
====================================================================
| Symptom | Fix |
|---------|-----|
| ImagePullBackOff | <ACR_NAME> left in manifest, or run: az aks update -n $AKS -g $RG --attach-acr $ACR |
| API CrashLoopBackOff | Started before MySQL ready; kubectl logs <pod>; wait a minute |
| exec format error | Built without --platform linux/amd64; rebuild + push |
| Jenkins az: command not found | PATH issue (Step 9); set PATH in Jenkinsfile environment |
| EXTERNAL-IP <pending> | Load balancer provisioning; wait 1-3 min |

## Tear down
az group delete -n $RG --yes --no-wait
