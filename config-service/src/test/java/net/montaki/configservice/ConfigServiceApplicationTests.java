package net.montaki.configservice;

import org.eclipse.jgit.api.Git;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.cloud.config.environment.Environment;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "spring.cloud.discovery.enabled=false")
@DirtiesContext
class ConfigServiceApplicationTests {

    @TempDir
    static Path temporary;

    private static Path repository;

    @Autowired
    private TestRestTemplate http;

    @DynamicPropertySource
    static void gitRepository(DynamicPropertyRegistry registry) throws Exception {
        repository = temporary.resolve("repository");
        Path config = Files.createDirectories(repository.resolve("config-repo"));
        try (var files = Files.list(Path.of("..", "config-repo"))) {
            for (Path file : files.toList()) {
                Files.copy(file, config.resolve(file.getFileName()));
            }
        }
        try (Git git = Git.init().setDirectory(repository.toFile()).setInitialBranch("main").call()) {
            git.add().addFilepattern("config-repo").call();
            git.commit().setMessage("Initial test configuration")
                    .setAuthor("Config tests", "config-tests@example.com")
                    .setCommitter("Config tests", "config-tests@example.com").call();
        }
        registry.add("spring.cloud.config.server.git.uri", () -> repository.toUri().toString());
        registry.add("spring.cloud.config.server.git.basedir", () -> temporary.resolve("checkout").toString());
    }

    @Test
    void servesSharedConfiguration() {
        Map<String, Object> shared = properties("application", "default");
        assertThat(shared).containsEntry("global.params.p1", "456")
                .containsEntry("global.params.p2", "224")
                .containsEntry("management.endpoints.web.exposure.include", "health,refresh");
    }

    @ParameterizedTest
    @CsvSource({"default,11,22", "dev,88,99", "prod,33,44"})
    void mergesCustomerProfilesWithSharedAndDefaultSettings(String profile, String x, String y) {
        Map<String, Object> customer = properties("customer-service", profile);
        assertThat(customer).containsEntry("global.params.p1", "456")
                .containsEntry("spring.datasource.url", "jdbc:h2:mem:customers-db")
                .containsEntry("customer.params.x", x)
                .containsEntry("customer.params.y", y);
    }

    @ParameterizedTest
    @CsvSource({
            "inventory-service,default,products-db", "inventory-service,dev,products-dev-db",
            "inventory-service,prod,products-prod-db", "billing-service,default,billing-db",
            "billing-service,dev,billing-dev-db", "billing-service,prod,billing-prod-db"
    })
    void selectsDatabaseForEachServiceAndProfile(String service, String profile, String database) {
        assertThat(properties(service, profile))
                .containsEntry("spring.datasource.url", "jdbc:h2:mem:" + database)
                .containsEntry("spring.jpa.open-in-view", "false");
    }

    @Test
    void preservesBillingResilienceAndGatewayDiscoverySettings() {
        assertThat(properties("billing-service", "default"))
                .containsEntry("resilience4j.circuitbreaker.instances.inventory-service.base-config", "default")
                .containsEntry("resilience4j.circuitbreaker.configs.default.minimum-number-of-calls", "5");
        assertThat(properties("gateway-service", "default"))
                .containsEntry("spring.cloud.gateway.server.webflux.discovery.locator.enabled", "true")
                .containsEntry("spring.cloud.gateway.server.webflux.discovery.locator.lower-case-service-id", "true");
    }

    @Test
    void readsNewGitCommitWithoutRestartingServer() throws Exception {
        Environment before = environment("application", "default");
        Path shared = repository.resolve("config-repo/application.properties");
        String original = Files.readString(shared);
        try {
            Files.writeString(shared, original.replace("global.params.p1=456", "global.params.p1=777"));
            commitConfiguration("Change test configuration");
            Environment after = environment("application", "default");
            assertThat(after.getVersion()).isNotEqualTo(before.getVersion());
            assertThat(merge(after)).containsEntry("global.params.p1", "777");
        } finally {
            Files.writeString(shared, original);
            commitConfiguration("Restore test configuration");
        }
    }

    private void commitConfiguration(String message) throws Exception {
        try (Git git = Git.open(repository.toFile())) {
            git.add().addFilepattern("config-repo").call();
            git.commit().setMessage(message)
                    .setAuthor("Config tests", "config-tests@example.com")
                    .setCommitter("Config tests", "config-tests@example.com").call();
        }
    }

    private Environment environment(String service, String profile) {
        Environment result = http.getForObject("/{service}/{profile}", Environment.class, service, profile);
        assertThat(result).isNotNull();
        assertThat(result.getPropertySources()).isNotEmpty();
        assertThat(result.getVersion()).isNotBlank();
        return result;
    }

    private Map<String, Object> properties(String service, String profile) {
        return merge(environment(service, profile));
    }

    private Map<String, Object> merge(Environment environment) {
        Map<String, Object> result = new LinkedHashMap<>();
        environment.getPropertySources().forEach(source -> source.getSource()
                .forEach((key, value) -> result.putIfAbsent(key.toString(), value)));
        return result;
    }
}
