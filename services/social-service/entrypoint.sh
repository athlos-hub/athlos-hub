#!/bin/sh
echo "========================================="
echo "Social Service - Starting"
echo "========================================="

echo "🔍 Verificando migrations no JAR..."
unzip -l /app/app.jar | grep "db/migration" || echo "⚠️  AVISO: Migrations não encontradas no JAR!"

echo "⏳ Waiting for database at ${DATABASE_HOST:-postgres}:${DATABASE_PORT:-5432}..."
max_tries=30
count=0

while [ $count -lt $max_tries ]; do
    if nc -z ${DATABASE_HOST:-postgres} ${DATABASE_PORT:-5432} 2>/dev/null; then
        echo "✓ Database is up!"
        break
    fi
    count=$((count + 1))
    sleep 2
done

if [ $count -eq $max_tries ]; then
    echo "✗ ERROR: Database did not become available in time"
    exit 1
fi

echo "⏳ Waiting 5s for database to be fully ready..."
sleep 5

echo "🚀 Starting Social Service application..."
echo "📦 Flyway will run migrations automatically"
echo "========================================="

exec java $JAVA_OPTS \
    -Dlogging.level.org.flywaydb=DEBUG \
    -jar /app/app.jar