package com.rideplatform.auth.bootstrap;

import com.rideplatform.users.application.UserService;
import com.rideplatform.users.domain.RoleCode;
import com.rideplatform.users.domain.UserEntity;
import com.rideplatform.users.domain.UserStatus;
import com.rideplatform.users.infrastructure.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Local/dev bootstrap for a SUPER_ADMIN. Disabled unless both email and password are set.
 * Production should use a one-time ops process — never ship default passwords.
 */
@Component
@Profile("local")
public class LocalAdminBootstrap implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(LocalAdminBootstrap.class);

    private final UserRepository userRepository;
    private final UserService userService;
    private final PasswordEncoder passwordEncoder;

    @Value("${BOOTSTRAP_SUPERADMIN_EMAIL:}")
    private String email;

    @Value("${BOOTSTRAP_SUPERADMIN_PASSWORD:}")
    private String password;

    public LocalAdminBootstrap(
            UserRepository userRepository,
            UserService userService,
            PasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.userService = userService;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (email == null || email.isBlank() || password == null || password.isBlank()) {
            log.info("Skipping super-admin bootstrap (BOOTSTRAP_SUPERADMIN_EMAIL/PASSWORD not set)");
            return;
        }
        userRepository.findByEmailIgnoreCase(email).ifPresentOrElse(
                existing -> log.info("Super-admin already exists: {}", email),
                () -> {
                    UserEntity user = new UserEntity();
                    user.setEmail(email.trim().toLowerCase());
                    user.setPasswordHash(passwordEncoder.encode(password));
                    user.setStatus(UserStatus.ACTIVE);
                    user.setDisplayName("Super Admin");
                    user.getRoles().add(userService.requireRole(RoleCode.SUPER_ADMIN));
                    user.getRoles().add(userService.requireRole(RoleCode.ADMIN));
                    userRepository.save(user);
                    log.warn("Bootstrapped SUPER_ADMIN {}. Change password after first login.", email);
                }
        );
    }
}
