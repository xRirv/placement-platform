package com.agenticai.interviewrepo.repository;

import com.agenticai.interviewrepo.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByAuthUserId(String authUserId);

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    boolean existsByAuthUserId(String authUserId);
}
