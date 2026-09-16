package com.sw1.casetool.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Habilita el broker simple en memoria para suscripciones de sala
        config.enableSimpleBroker("/topic", "/queue");
        // Prefijo para mensajes dirigidos a controladores @MessageMapping
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Endpoint con soporte SockJS para fallback
        registry.addEndpoint("/ws-case")
                .setAllowedOriginPatterns("*")
                .withSockJS();

        // Endpoint WebSocket nativo sin SockJS (para clientes STOMP directos ultrarrápidos < 50ms)
        registry.addEndpoint("/ws-case")
                .setAllowedOriginPatterns("*");
    }
}
