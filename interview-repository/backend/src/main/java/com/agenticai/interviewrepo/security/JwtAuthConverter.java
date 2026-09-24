package com.agenticai.interviewrepo.security;

import com.agenticai.interviewrepo.model.Role;
import com.agenticai.interviewrepo.model.User;
import com.agenticai.interviewrepo.repository.UserRepository;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

@Component
public class JwtAuthConverter implements Converter<Jwt, AbstractAuthenticationToken> {

    private final UserRepository userRepository;

    public JwtAuthConverter(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        Set<GrantedAuthority> authorities = new HashSet<>();
        String authUserId = jwt.getSubject();

        Optional<User> userOptional = userRepository.findByAuthUserId(authUserId);

        if (userOptional.isPresent()) {
            User user = userOptional.get();
            String roleName = user.getRole().name();
            // Provide both "ROLE_XYZ" and "XYZ" for flexible hasRole / hasAuthority checks
            authorities.add(new SimpleGrantedAuthority("ROLE_" + roleName));
            authorities.add(new SimpleGrantedAuthority(roleName));
        } else {
            // Check if role claim is present in JWT
            String claimRole = jwt.getClaimAsString("role");
            if (claimRole != null && !claimRole.isBlank()) {
                String normalized = claimRole.toUpperCase().replace("ROLE_", "");
                try {
                    Role role = Role.valueOf(normalized);
                    authorities.add(new SimpleGrantedAuthority("ROLE_" + role.name()));
                    authorities.add(new SimpleGrantedAuthority(role.name()));
                } catch (IllegalArgumentException ignored) {
                    authorities.add(new SimpleGrantedAuthority("ROLE_STUDENT"));
                    authorities.add(new SimpleGrantedAuthority("STUDENT"));
                }
            } else {
                authorities.add(new SimpleGrantedAuthority("ROLE_STUDENT"));
                authorities.add(new SimpleGrantedAuthority("STUDENT"));
            }
        }

        return new JwtAuthenticationToken(jwt, authorities, jwt.getSubject());
    }
}
