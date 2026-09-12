spring:
  application:
    name: ${artifactId}
  profiles:
    active: dev

---
# Perfil de Desarrollo Local (Ejecución Inmediata en Memoria con H2)
spring:
  config:
    activate:
      on-profile: dev
  datasource:
    url: jdbc:h2:mem:${artifactId}_db;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE
    driver-class-name: org.h2.Driver
    username: sa
    password: 
  h2:
    console:
      enabled: true
      path: /h2-console
  jpa:
    hibernate:
      ddl-auto: update
    show-sql: true
    open-in-view: false
    properties:
      hibernate:
        format_sql: true

server:
  port: ${"$"}{SERVER_PORT:8081}

<#if includeSwagger!true>
springdoc:
  api-docs:
    path: /v3/api-docs
  swagger-ui:
    path: /swagger-ui.html
</#if>

---
# Perfil de Producción (PostgreSQL 17 / Supabase)
spring:
  config:
    activate:
      on-profile: prod
  datasource:
    url: ${"$"}{SPRING_DATASOURCE_URL:jdbc:postgresql://localhost:5432/${artifactId}_db}
    username: ${"$"}{SPRING_DATASOURCE_USERNAME:postgres}
    password: ${"$"}{SPRING_DATASOURCE_PASSWORD:postgres}
    driver-class-name: org.postgresql.Driver
  jpa:
    hibernate:
      ddl-auto: update
    show-sql: false
    open-in-view: false
    properties:
      hibernate:
        format_sql: true
        jdbc:
          lob:
            non_contextual_creation: true

server:
  port: ${"$"}{SERVER_PORT:8081}
