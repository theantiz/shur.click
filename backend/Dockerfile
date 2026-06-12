FROM maven:3.9.9-eclipse-temurin-17 AS builder

WORKDIR /app

COPY pom.xml .
COPY .mvn .mvn
COPY mvnw .

RUN chmod +x mvnw

# Cache dependencies
RUN ./mvnw -q -DskipTests dependency:go-offline

COPY src src

RUN ./mvnw -q -DskipTests clean package

FROM eclipse-temurin:17-jre

WORKDIR /app

RUN useradd -r -u 1001 appuser

COPY --from=builder /app/target/*.jar app.jar

EXPOSE 8080

USER appuser

ENTRYPOINT ["java","-jar","app.jar"]