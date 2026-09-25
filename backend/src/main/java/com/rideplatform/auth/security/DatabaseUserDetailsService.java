package com.rideplatform.auth.security;

import com.rideplatform.users.domain.RoleCode;
import com.rideplatform.users.domain.RoleEntity;
import com.rideplatform.users.domain.UserEntity;
import com.rideplatform.users.domain.UserStatus;
import com.rideplatform.users.infrastructure.UserRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class DatabaseUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    public DatabaseUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        UserEntity user = userRepository.findByEmailIgnoreCase(username)
                .or(() -> userRepository.findByPhoneE164(username))
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
        return toPrincipal(user);
    }

    public UserPrincipal loadById(UUID id) {
        UserEntity user = userRepository.findById(id)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
        return toPrincipal(user);
    }

    private UserPrincipal toPrincipal(UserEntity user) {
        Set<RoleCode> roles = user.getRoles().stream().map(RoleEntity::getCode).collect(Collectors.toSet());
        String username = user.getEmail() != null ? user.getEmail() : user.getPhoneE164();
        return new UserPrincipal(
                user.getId(),
                username,
                user.getPasswordHash(),
                user.getStatus() == UserStatus.ACTIVE,
                roles
        );
    }
}
