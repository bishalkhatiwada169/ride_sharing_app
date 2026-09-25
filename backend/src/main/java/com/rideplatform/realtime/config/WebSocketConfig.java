package com.rideplatform.realtime.config;

import com.rideplatform.auth.security.DatabaseUserDetailsService;
import com.rideplatform.auth.security.JwtService;
import com.rideplatform.auth.security.UserPrincipal;
import com.rideplatform.realtime.security.StompUserPrincipal;
import com.rideplatform.rides.infrastructure.RideRepository;
import com.rideplatform.users.domain.RoleCode;
import io.jsonwebtoken.Claims;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.lang.NonNull;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import java.util.UUID;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtService jwtService;
    private final DatabaseUserDetailsService userDetailsService;
    private final RideRepository rideRepository;

    public WebSocketConfig(
            JwtService jwtService,
            DatabaseUserDetailsService userDetailsService,
            RideRepository rideRepository
    ) {
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
        this.rideRepository = rideRepository;
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .addInterceptors(new QueryTokenHandshakeInterceptor())
                .setAllowedOriginPatterns("*")
                .withSockJS();
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic", "/queue");
        registry.setApplicationDestinationPrefixes("/app");
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(@NonNull Message<?> message, @NonNull MessageChannel channel) {
                StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
                if (accessor == null) {
                    return message;
                }

                if (StompCommand.CONNECT.equals(accessor.getCommand())) {
                    String token = extractToken(accessor);
                    if (token == null) {
                        throw new IllegalArgumentException("Missing access token for WebSocket CONNECT");
                    }
                    Claims claims = jwtService.parse(token);
                    UUID userId = UUID.fromString(claims.getSubject());
                    UserPrincipal principal = userDetailsService.loadById(userId);
                    accessor.setUser(new StompUserPrincipal(principal));
                }

                if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
                    authorizeSubscribe(accessor);
                }

                return message;
            }
        });
    }

    private String extractToken(StompHeaderAccessor accessor) {
        String auth = accessor.getFirstNativeHeader(HttpHeaders.AUTHORIZATION);
        if (auth != null && auth.startsWith("Bearer ")) {
            return auth.substring(7);
        }
        String alt = accessor.getFirstNativeHeader("access_token");
        if (alt != null && !alt.isBlank()) {
            return alt;
        }
        var sessionAttrs = accessor.getSessionAttributes();
        if (sessionAttrs != null) {
            Object q = sessionAttrs.get("access_token");
            if (q instanceof String s && !s.isBlank()) {
                return s;
            }
        }
        return null;
    }

    private void authorizeSubscribe(StompHeaderAccessor accessor) {
        if (!(accessor.getUser() instanceof StompUserPrincipal stompUser)) {
            throw new IllegalArgumentException("Unauthenticated subscription");
        }
        String dest = accessor.getDestination();
        if (dest == null) {
            return;
        }

        UserPrincipal user = stompUser.getUser();
        boolean staff = user.getRoles().contains(RoleCode.ADMIN)
                || user.getRoles().contains(RoleCode.SUPER_ADMIN)
                || user.getRoles().contains(RoleCode.SUPPORT);

        if (dest.equals("/topic/admin.live")) {
            if (!staff) {
                throw new IllegalArgumentException("Forbidden: admin.live");
            }
            return;
        }

        if (dest.startsWith("/topic/ride.")) {
            String idPart = dest.substring("/topic/ride.".length());
            UUID rideId;
            try {
                rideId = UUID.fromString(idPart);
            } catch (IllegalArgumentException ex) {
                throw new IllegalArgumentException("Invalid ride topic");
            }
            if (staff) {
                return;
            }
            var ride = rideRepository.findById(rideId)
                    .orElseThrow(() -> new IllegalArgumentException("Ride not found"));
            boolean party = ride.getPassengerUserId().equals(user.getId())
                    || (ride.getDriverUserId() != null && ride.getDriverUserId().equals(user.getId()));
            if (!party) {
                throw new IllegalArgumentException("Forbidden: ride topic");
            }
        }
    }
}
