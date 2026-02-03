FROM maven:3.9-eclipse-temurin-21-alpine AS builder
WORKDIR /app

COPY pom.xml .
RUN mvn dependency:go-offline -B

COPY src ./src

RUN echo "=== Verificando migrations ===" && \
    ls -la src/main/resources/db/migration/ || echo "AVISO: Pasta de migrations não encontrada!"
    
RUN mvn clean package -DskipTests -B

RUN echo "=== Verificando JAR ===" && \
    JAR_FILE=$(find target -name "*.jar" -type f | head -n 1) && \
    unzip -l "$JAR_FILE" | grep "db/migration" || echo "AVISO: Migrations não encontradas no JAR!"

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

RUN apk add --no-cache curl netcat-openbsd

RUN addgroup -S spring && adduser -S spring -G spring

COPY --from=builder /app/target/*.jar app.jar

COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh && chown spring:spring /app/entrypoint.sh

RUN echo "=== Conteúdo do JAR - db/migration ===" && \
    unzip -l app.jar | grep -E "(db/migration|V1__)" || echo "Migrations não encontradas no JAR"

USER spring:spring

EXPOSE 8083

ENV SPRING_PROFILES_ACTIVE=prod \
    JAVA_OPTS="-Xmx384m -Xms192m -XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0"

HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=40s \
    CMD curl -f http://localhost:8083/actuator/health || exit 1

ENTRYPOINT ["/app/entrypoint.sh"]