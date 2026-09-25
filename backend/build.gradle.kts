plugins {
    java
    id("org.springframework.boot") version "3.4.4"
    id("io.spring.dependency-management") version "1.1.7"
}

group = "com.rideplatform"
version = "0.1.0-SNAPSHOT"

java {
    toolchain {
        languageVersion.set(JavaLanguageVersion.of(21))
    }
}

repositories {
    mavenCentral()
}

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-data-redis")
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    implementation("org.springframework.boot:spring-boot-starter-websocket")

    implementation("org.flywaydb:flyway-core")
    implementation("org.flywaydb:flyway-database-postgresql")
    implementation("org.postgresql:postgresql")
    implementation("org.hibernate.orm:hibernate-spatial")
    implementation("org.locationtech.jts:jts-core:1.20.0")

    implementation("io.jsonwebtoken:jjwt-api:0.12.6")
    runtimeOnly("io.jsonwebtoken:jjwt-impl:0.12.6")
    runtimeOnly("io.jsonwebtoken:jjwt-jackson:0.12.6")

    implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:2.8.5")

    // Local/dev fallback when Docker/PostGIS host DB is unavailable
    implementation("io.zonky.test:embedded-postgres:2.0.7")

    compileOnly("org.projectlombok:lombok")
    annotationProcessor("org.projectlombok:lombok")

    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.springframework.security:spring-security-test")
    testImplementation("org.testcontainers:junit-jupiter")
    testImplementation("org.testcontainers:postgresql")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.withType<Test> {
    useJUnitPlatform()
}

// OneDrive/cloud reparse points under build/ can break Gradle file snapshots.
// Keep resources untracked; force non-incremental test compile instead of doNotTrackState
// (doNotTrackState on compileTestJava fails with "Changes are not tracked").
tasks.named<ProcessResources>("processResources") {
    doNotTrackState("Avoid OneDrive reparse-point snapshot failures on resources")
}
tasks.named<ProcessResources>("processTestResources") {
    doNotTrackState("Avoid OneDrive reparse-point snapshot failures on test resources")
}
tasks.named<JavaCompile>("compileTestJava") {
    options.isIncremental = false
}
tasks.named<JavaCompile>("compileJava") {
    options.isIncremental = false
}
