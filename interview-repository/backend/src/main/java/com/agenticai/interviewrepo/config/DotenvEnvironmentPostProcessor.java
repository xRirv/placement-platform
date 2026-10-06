package com.agenticai.interviewrepo.config;

import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

public class DotenvEnvironmentPostProcessor implements EnvironmentPostProcessor {

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, org.springframework.boot.SpringApplication application) {
        File envFile = new File(".env");
        System.out.println("=== DotenvEnvironmentPostProcessor: Loading .env from " + envFile.getAbsolutePath() + " ===");

        Map<String, Object> properties = new HashMap<>();
        int count = 0;

        if (envFile.exists()) {
            try (BufferedReader reader = new BufferedReader(new FileReader(envFile))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    line = line.trim();
                    if (line.isEmpty() || line.startsWith("#")) {
                        continue;
                    }
                    int eqIndex = line.indexOf('=');
                    if (eqIndex > 0) {
                        String key = line.substring(0, eqIndex).trim();
                        String value = line.substring(eqIndex + 1).trim();
                        // Remove surrounding quotes if present
                        if ((value.startsWith("\"") && value.endsWith("\"")) ||
                            (value.startsWith("'") && value.endsWith("'"))) {
                            value = value.substring(1, value.length() - 1);
                        }
                        System.out.println("=== Dotenv: " + key + " = " + (key.contains("PASSWORD") || key.contains("KEY") ? "***" : value) + " ===");
                        properties.put(key, value);
                        count++;
                    }
                }
            } catch (IOException e) {
                System.err.println("=== Failed to read .env file: " + e.getMessage() + " ===");
            }
        }

        System.out.println("=== Dotenv entries count: " + count + " ===");
        if (!properties.isEmpty()) {
            environment.getPropertySources().addFirst(new MapPropertySource("dotenv", properties));
            System.out.println("=== Dotenv property source added ===");
        } else {
            System.out.println("=== Dotenv: NO ENTRIES FOUND ===");
        }
    }
}