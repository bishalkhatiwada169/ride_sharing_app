package com.rideplatform.realtime.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rideplatform.realtime.config.RedisRealtimeConfig;
import com.rideplatform.realtime.domain.RealtimeEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service
public class RealtimeEventPublisher {

    private static final Logger log = LoggerFactory.getLogger(RealtimeEventPublisher.class);

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    public RealtimeEventPublisher(StringRedisTemplate redisTemplate, ObjectMapper objectMapper) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
    }

    public void publish(RealtimeEvent event) {
        try {
            String json = objectMapper.writeValueAsString(event);
            redisTemplate.convertAndSend(RedisRealtimeConfig.CHANNEL, json);
        } catch (JsonProcessingException ex) {
            log.error("Failed to serialize realtime event", ex);
        } catch (Exception ex) {
            log.warn("Redis publish failed (event dropped): {}", ex.getMessage());
        }
    }
}
