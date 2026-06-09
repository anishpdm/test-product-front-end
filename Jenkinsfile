pipeline {
    agent any

    environment {
        ACR     = 'anishfullstackacr'          // your ACR name (no .azurecr.io)
        RG      = 'fullstack-rg'
        AKS     = 'fullstack-aks'
        IMAGE   = 'product-frontend'
        AZ_CLIENT_ID     = credentials('azure-client-id')
        AZ_CLIENT_SECRET = credentials('azure-client-secret')
        AZ_TENANT_ID     = credentials('azure-tenant-id')
    }

    stages {
        stage('Checkout') {
            steps { checkout scm }
        }

        stage('Build image') {
            steps {
                sh 'docker build --platform linux/amd64 -t ${ACR}.azurecr.io/${IMAGE}:${BUILD_NUMBER} -t ${ACR}.azurecr.io/${IMAGE}:latest .'
            }
        }

        stage('Login to Azure') {
            steps {
                sh '''
                    az login --service-principal \
                        -u $AZ_CLIENT_ID -p $AZ_CLIENT_SECRET --tenant $AZ_TENANT_ID
                    az acr login -n ${ACR}
                '''
            }
        }

        stage('Push to ACR') {
            steps {
                sh '''
                    docker push ${ACR}.azurecr.io/${IMAGE}:${BUILD_NUMBER}
                    docker push ${ACR}.azurecr.io/${IMAGE}:latest
                '''
            }
        }

        stage('Deploy to AKS') {
            steps {
                sh '''
                    az aks get-credentials -n ${AKS} -g ${RG} --overwrite-existing

                    # Apply the frontend manifest (idempotent). Substitute ACR name.
                    sed "s/<ACR_NAME>/${ACR}/g" k8s/03-frontend.yaml > /tmp/03-frontend.yaml
                    kubectl apply -f /tmp/03-frontend.yaml

                    # Roll the frontend to the freshly built tag.
                    kubectl set image deployment/product-frontend \
                        product-frontend=${ACR}.azurecr.io/${IMAGE}:${BUILD_NUMBER}
                    kubectl rollout status deployment/product-frontend --timeout=120s
                '''
            }
        }
    }

    post {
        success { echo "product-frontend ${BUILD_NUMBER} deployed to AKS." }
        failure { echo 'product-frontend pipeline failed.' }
        always  { sh 'az logout || true' }
    }
}
