package com.rideplatform.realtime.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rideplatform.realtime.domain.RealtimeEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.data.redis.listener.adapter.MessageListenerAdapter;
import org.springframework.messaging.simp.SimpMessagingTemplate;

@Configuration
public class RedisRealtimeConfig {

    public static final String CHANNEL = "rideplatform.realtime";

    @Bean
    StringRedisTemplate stringRedisTemplate(RedisConnectionFactory connectionFactory) {
        return new StringRedisTemplate(connectionFactory);
    }

    @Bean
    RedisMessageListenerContainer realtimeListenerContainer(
            RedisConnectionFactory connectionFactory,
            MessageListenerAdapter realtimeMessageListener
    ) {
        RedisMessageListenerContainer container = new RedisMessageListenerContainer();
        container.setConnectionFactory(connectionFactory);
        container.addMessageListener(realtimeMessageListener, new ChannelTopic(CHANNEL));
        return container;
    }

    @Bean
    MessageListenerAdapter realtimeMessageListener(RealtimeRedisFanout fanout) {
        return new MessageListenerAdapter(fanout, "onMessage");
    }

    @Bean
    RealtimeRedisFanout realtimeRedisFanout(SimpMessagingTemplate messagingTemplate, ObjectMapper objectMapper) {
        return new RealtimeRedisFanout(messagingTemplate, objectMapper);
    }

    public static class RealtimeRedisFanout {
        private static final Logger log = LoggerFactory.getLogger(RealtimeRedisFanout.class);

        private final SimpMessagingTemplate messagingTemplate;
        private final ObjectMapper objectMapper;

        public RealtimeRedisFanout(SimpMessagingTemplate messagingTemplate, ObjectMapper objectMapper) {
            this.messagingTemplate = messagingTemplate;
            this.objectMapper = objectMapper;
        }

        public void onMessage(String json) {
            try {
                RealtimeEvent event = objectMapper.readValue(json, RealtimeEvent.class);
                if (event.rideId() != null) {
                    messagingTemplate.convertAndSend("/topic/ride." + event.rideId(), event);
                }
                messagingTemplate.convertAndSend("/topic/admin.live", event);
                if (event.passengerUserId() != null) {
                    messagingTemplate.convertAndSendToUser(
                            event.passengerUserId().toString(),
                            "/queue/events",
                            event
                    );
                }
                if (event.driverUserId() != null) {
                    messagingTemplate.convertAndSendToUser(
                            event.driverUserId().toString(),
                            "/queue/events",
                            event
                    );
                }
            } catch (Exception ex) {
                log.warn("Failed to fan-out realtime event: {}", ex.getMessage());
            }
        }
    }
}
