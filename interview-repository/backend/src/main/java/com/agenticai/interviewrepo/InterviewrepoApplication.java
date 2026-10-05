package com.agenticai.interviewrepo;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.nio.charset.StandardCharsets;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class InterviewrepoApplication {

    public static void main(String[] args) {
        loadDotEnvIfPresent();
        SpringApplication.run(InterviewrepoApplication.class, args);
    }

    private static void loadDotEnvIfPresent() {
        File[] candidates = new File[] {
            new File(".env"),
            new File("backend/.env"),
            new File("../backend/.env"),
            new File("../.env")
        };

        for (File candidate : candidates) {
            if (candidate.exists() && candidate.isFile()) {
                try (BufferedReader reader = new BufferedReader(new FileReader(candidate, StandardCharsets.UTF_8))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        line = line.trim();
                        if (line.isEmpty() || line.startsWith("#")) {
                            continue;
                        }
                        int eqIdx = line.indexOf('=');
                        if (eqIdx > 0) {
                            String key = line.substring(0, eqIdx).trim();
                            String value = line.substring(eqIdx + 1).trim();
                            if ((value.startsWith("\"") && value.endsWith("\"")) ||
                                (value.startsWith("'") && value.endsWith("'"))) {
                                value = value.substring(1, value.length() - 1);
                            }
                            if (System.getProperty(key) == null && System.getenv(key) == null) {
                                System.setProperty(key, value);
                            }
                        }
                    }
                    System.out.println("Loaded environment configuration from " + candidate.getAbsolutePath());
                    break;
                } catch (Exception e) {
                    System.err.println("Warning: Failed to load .env from " + candidate.getAbsolutePath() + ": " + e.getMessage());
                }
            }
        }
    }

}
