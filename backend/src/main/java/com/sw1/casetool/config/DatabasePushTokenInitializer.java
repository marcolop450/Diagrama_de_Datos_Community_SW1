package com.sw1.casetool.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@Order(1)
@RequiredArgsConstructor
public class DatabasePushTokenInitializer implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) {
        try {
            log.info("Verificando existencia de tabla user_push_tokens (CU18)...");
            jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS user_push_tokens (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
                    push_token VARCHAR(255) NOT NULL,
                    device_type VARCHAR(50) DEFAULT 'android',
                    device_name VARCHAR(100),
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    CONSTRAINT uq_user_device_token UNIQUE (user_id, push_token)
                );
            """);

            jdbcTemplate.execute("""
                CREATE INDEX IF NOT EXISTS idx_user_push_tokens_user_id ON user_push_tokens(user_id);
            """);

            log.info("Tabla user_push_tokens verificada e inicializada correctamente en PostgreSQL 17.");
        } catch (Exception e) {
            log.error("Aviso al inicializar tabla user_push_tokens: {}", e.getMessage());
        }
    }
}
