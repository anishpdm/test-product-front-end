# product-frontend

Angular 21 SPA served by nginx. Calls the API at relative `/api`,
which nginx proxies to the `product-api` Kubernetes Service.

```
k8s/03-frontend.yaml   Deployment + LoadBalancer (public IP)
Dockerfile             builds the nginx image
Jenkinsfile            build → ACR → apply manifest → rollout
```

## Local test
Needs the backend reachable as `product-api` on a shared network:
```bash
docker network create app-net
# start product-api on app-net first (see product-api repo)
docker build --platform linux/amd64 -t product-frontend .
docker run --network app-net -p 8081:80 product-frontend
```
http://localhost:8081

Deploy the **product-api** repo first (it creates MySQL + the API).
Full setup: see **DEPLOYMENT.md**. Pairs with the **product-api** repo.
