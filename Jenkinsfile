// Pipeline de despliegue (HU-19).
// Jenkins corre en la misma EC2 donde se despliega la aplicación, así que
// "desplegar" es ejecutar Docker Compose en el propio servidor.
//
// Las variables de entorno (.env) NO están aquí: viven en Jenkins como una
// credencial de tipo "Secret file" con el id 'cmp-env' (ver docs/Infraestructura.md).

pipeline {
    // Corre en el propio nodo de Jenkins (la EC2).
    agent any

    options {
        // Evita dos despliegues al mismo tiempo (por ejemplo, dos pushes seguidos).
        disableConcurrentBuilds()
        // Si algo se queda colgado, el build se cancela a los 30 minutos.
        timeout(time: 30, unit: 'MINUTES')
        // Guarda solo los últimos 10 builds para no llenar el disco.
        buildDiscarder(logRotator(numToKeepStr: '10'))
        // El checkout lo hacemos nosotros en la primera etapa.
        skipDefaultCheckout(true)
    }

    // Se ejecuta cuando GitHub avisa de un push por el webhook.
    triggers {
        githubPush()
    }

    environment {
        // Comando base de Docker Compose para producción.
        COMPOSE = 'docker compose -f docker-compose.prod.yml'
        // Imagen temporal que solo se usa para correr lint y pruebas.
        CI_IMAGE = 'cmp-backend-ci'
        // Nginx publica el puerto 80 de la EC2 y reenvía /api a la API.
        HEALTH_URL = 'http://127.0.0.1/api/health'
    }

    stages {
        stage('Checkout') {
            steps {
                // Descarga el código de la rama configurada en el job.
                checkout scm
            }
        }

        stage('Preparar entorno') {
            steps {
                // Copia el .env guardado en Jenkins al workspace.
                // Docker Compose lo necesita para leer las variables.
                withCredentials([file(credentialsId: 'cmp-env', variable: 'ENV_FILE')]) {
                    sh 'install -m 600 "$ENV_FILE" .env'
                }
            }
        }

        stage('Instalar dependencias') {
            steps {
                // Construye la etapa "development" del Dockerfile:
                // ejecuta "npm ci" con todas las dependencias (incluidas las de desarrollo).
                sh 'docker build --target development -t $CI_IMAGE ./backend'
            }
        }

        stage('Calidad') {
            steps {
                // Si lint o las pruebas fallan, el pipeline se detiene aquí
                // y NO se toca la versión que está corriendo.
                sh 'docker run --rm $CI_IMAGE npm run lint'
                sh 'docker run --rm $CI_IMAGE npm test'
            }
        }

        stage('Build') {
            steps {
                // Construye las imágenes de producción (API y frontend con Nginx).
                // Los contenedores que están corriendo siguen intactos.
                sh '$COMPOSE build'
            }
        }

        stage('Migraciones') {
            steps {
                // Aplica las migraciones con la imagen nueva, ANTES de reemplazar
                // los contenedores. Si una migración falla, el pipeline se detiene.
                // Es seguro repetirlas: la API vuelve a ejecutarlas al arrancar
                // y no encuentra nada pendiente.
                sh '$COMPOSE run --rm --no-deps api node ./node_modules/typeorm/cli.js migration:run --dataSource dist/config/data-source.js'
            }
        }

        stage('Desplegar') {
            steps {
                // Reemplaza solo los contenedores cuya imagen cambió.
                sh '$COMPOSE up -d --remove-orphans'
            }
        }

        stage('Verificar') {
            steps {
                // Espera hasta 2 minutos a que /api/health responda 200.
                // "curl -f" falla si la respuesta es 4xx o 5xx.
                sh '''
                    for i in $(seq 1 24); do
                        if curl -fsS "$HEALTH_URL"; then
                            echo
                            echo "Despliegue verificado: /api/health respondió 200"
                            exit 0
                        fi
                        echo "Esperando a la API... intento $i de 24"
                        sleep 5
                    done
                    echo "La API no respondió a tiempo. Últimos logs:"
                    $COMPOSE logs --tail=50 api
                    exit 1
                '''
            }
        }
    }

    post {
        always {
            // El .env ya no hace falta en el workspace: no dejamos secretos en disco.
            sh 'rm -f .env'
        }
        success {
            // Borra las imágenes sin etiqueta que dejan los builds anteriores.
            sh 'docker image prune -f'
        }
    }
}