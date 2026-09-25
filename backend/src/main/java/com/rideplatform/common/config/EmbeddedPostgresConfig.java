package com.rideplatform.common.config;

import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.AutoConfigureBefore;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;

import javax.sql.DataSource;
import java.io.IOException;

/**
 * Boots an embedded PostgreSQL for local Phase 1 when Docker/WSL is not ready.
 * Disable with DB_EMBEDDED=false and point DATABASE_URL at PostGIS (Compose).
 */
@Configuration
@Profile("local")
@AutoConfigureBefore(DataSourceAutoConfiguration.class)
@ConditionalOnProperty(name = "rideplatform.db.embedded", havingValue = "true", matchIfMissing = true)
public class EmbeddedPostgresConfig {

    private static final Logger log = LoggerFactory.getLogger(EmbeddedPostgresConfig.class);

    @Bean(destroyMethod = "close")
    EmbeddedPostgres embeddedPostgres() throws IOException {
        int port = Integer.parseInt(System.getenv().getOrDefault("EMBEDDED_PG_PORT", "54329"));
        log.warn("Starting embedded PostgreSQL on port {} (set DB_EMBEDDED=false to use external DB)", port);
        return EmbeddedPostgres.builder()
                .setPort(port)
                .start();
    }

    @Bean
    @Primary
    DataSource dataSource(EmbeddedPostgres embeddedPostgres) {
        return embeddedPostgres.getPostgresDatabase();
    }
}
