package com.rideplatform.realtime.security;

import com.rideplatform.auth.security.UserPrincipal;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;

import java.util.Collection;
import java.util.UUID;

/**
 * STOMP principal whose {@link #getName()} is the user UUID (for /user destinations).
 */
public class StompUserPrincipal implements Authentication {

    private final UserPrincipal user;
    private boolean authenticated = true;

    public StompUserPrincipal(UserPrincipal user) {
        this.user = user;
    }

    public UserPrincipal getUser() {
        return user;
    }

    public UUID getUserId() {
        return user.getId();
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return user.getAuthorities();
    }

    @Override
    public Object getCredentials() {
        return null;
    }

    @Override
    public Object getDetails() {
        return null;
    }

    @Override
    public Object getPrincipal() {
        return user;
    }

    @Override
    public boolean isAuthenticated() {
        return authenticated;
    }

    @Override
    public void setAuthenticated(boolean isAuthenticated) {
        this.authenticated = isAuthenticated;
    }

    @Override
    public String getName() {
        return user.getId().toString();
    }
}
