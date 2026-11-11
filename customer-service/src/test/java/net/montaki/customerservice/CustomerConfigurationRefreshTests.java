package net.montaki.customerservice;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import net.montaki.customerservice.config.CustomerConfigParams;
import net.montaki.customerservice.repository.CustomerRepository;
import org.junit.jupiter.api.Test;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.web.servlet.context.ServletWebServerApplicationContext;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestClient;

import java.net.InetSocketAddress;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

class CustomerConfigurationRefreshTests {

    @Test
    void importsDevConfigurationAndRefreshesValuesAndImmutableRecordWithoutRestart() throws Exception {
        AtomicReference<Map<String, Object>> configuration = new AtomicReference<>(devConfiguration());
        Set<String> requests = ConcurrentHashMap.newKeySet();
        ObjectMapper json = new ObjectMapper();
        HttpServer configServer = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        configServer.createContext("/customer-service/", exchange -> {
            requests.add(exchange.getRequestURI().getPath());
            byte[] response = json.writeValueAsBytes(Map.of(
                    "name", "customer-service", "profiles", List.of("dev"), "label", "main",
                    "propertySources", List.of(Map.of("name", "test-config-repo", "source", configuration.get()))));
            try (exchange) {
                exchange.getResponseHeaders().set("Content-Type", "application/json");
                exchange.sendResponseHeaders(200, response.length);
                exchange.getResponseBody().write(response);
            }
        });
        configServer.start();
        try {
            String configUrl = "http://127.0.0.1:" + configServer.getAddress().getPort();
            try (var application = new SpringApplicationBuilder(CustomerServiceApplication.class).run(
                    "--spring.application.name=customer-service",
                    "--server.port=0", "--spring.config.import=configserver:" + configUrl,
                    "--spring.profiles.active=dev", "--spring.cloud.discovery.enabled=false",
                    "--spring.datasource.url=jdbc:h2:mem:customer-config-refresh-db")) {
                int port = ((ServletWebServerApplicationContext) application).getWebServer().getPort();
                RestClient customer = RestClient.create("http://127.0.0.1:" + port);
                assertThat(requests).contains("/customer-service/default", "/customer-service/dev");
                assertThat(globalConfiguration(customer))
                        .containsEntry("p1", "456").containsEntry("p2", "224");
                assertThat(customer.get().uri("/testConfig2").retrieve().body(CustomerConfigParams.class))
                        .isEqualTo(new CustomerConfigParams(88, 99));

                Map<String, Object> changed = new HashMap<>(configuration.get());
                changed.put("global.params.p1", "777");
                changed.put("global.params.p2", "888");
                changed.put("customer.params.x", "123");
                changed.put("customer.params.y", "321");
                configuration.set(changed);

                // Publishing a configuration change alone does not refresh a running client.
                assertThat(globalConfiguration(customer))
                        .containsEntry("p1", "456");
                assertThat(customer.get().uri("/testConfig2").retrieve().body(CustomerConfigParams.class))
                        .isEqualTo(new CustomerConfigParams(88, 99));

                String[] refreshed = customer.post().uri("/actuator/refresh")
                        .contentType(MediaType.APPLICATION_JSON).body("{}").retrieve().body(String[].class);
                assertThat(refreshed).contains("global.params.p1", "global.params.p2",
                        "customer.params.x", "customer.params.y");
                assertThat(globalConfiguration(customer))
                        .containsEntry("p1", "777").containsEntry("p2", "888");
                assertThat(customer.get().uri("/testConfig2").retrieve().body(CustomerConfigParams.class))
                        .isEqualTo(new CustomerConfigParams(123, 321));
                assertThat(application.getBean(CustomerRepository.class).count()).isEqualTo(3);
            }
        } finally {
            configServer.stop(0);
        }
    }

    private Map<String, String> globalConfiguration(RestClient customer) {
        return customer.get().uri("/testConfig1").retrieve()
                .body(new ParameterizedTypeReference<>() {});
    }

    private Map<String, Object> devConfiguration() throws Exception {
        Map<String, Object> values = new HashMap<>();
        for (String filename : List.of("application.properties", "customer-service.properties",
                "customer-service-dev.properties")) {
            Properties properties = new Properties();
            try (var input = Files.newInputStream(Path.of("..", "config-repo", filename))) {
                properties.load(input);
            }
            properties.stringPropertyNames().forEach(key -> values.put(key, properties.getProperty(key)));
        }
        return values;
    }
}
