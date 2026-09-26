# syntax=docker/dockerfile:1
# Build from repository root so the admin SPA can be embedded:
#   docker build -f backend/Dockerfile -t ride-backend .
# Compose profile `full` uses this Dockerfile with context = repo root.

FROM node:22-alpine AS admin-build
WORKDIR /admin
COPY apps/admin-web/package.json apps/admin-web/package-lock.json* ./
RUN npm ci || npm install
COPY apps/admin-web/ ./
# Same-origin relative API/WS (served by Spring Boot)
RUN npm run build

FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /workspace
COPY backend/gradlew backend/settings.gradle.kts backend/build.gradle.kts backend/gradle.properties ./
COPY backend/gradle ./gradle
COPY backend/src ./src
COPY --from=admin-build /admin/dist ./src/main/resources/static
# Prefer direct wrapper invocation — avoids fragile shell quoting on Alpine ash.
RUN chmod +x gradlew \
  && java -Xmx64m -Xms64m -classpath gradle/wrapper/gradle-wrapper.jar org.gradle.wrapper.GradleWrapperMain bootJar --no-daemon -x test

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN addgroup -S ride && adduser -S ride -G ride
COPY --from=build /workspace/build/libs/*.jar /app/app.jar
USER ride
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
