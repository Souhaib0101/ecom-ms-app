package net.montaki.gatewayservice;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.reactive.server.WebTestClient;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("static")
class GatewayServiceApplicationTests {

    private static final HttpServer DOWNSTREAM = downstream();

    @Autowired
    private WebTestClient webTestClient;

    private static HttpServer downstream() {
        try {
            HttpServer server = HttpServer.create(new InetSocketAddress("localhost", 0), 0);
            server.createContext("/", exchange -> {
                String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
                byte[] response = (exchange.getRequestMethod() + " " + exchange.getRequestURI() + " " + body)
                        .getBytes(StandardCharsets.UTF_8);
                exchange.getResponseHeaders().add("Content-Type", "text/plain");
                exchange.sendResponseHeaders(200, response.length);
                exchange.getResponseBody().write(response);
                exchange.close();
            });
            server.start();
            return server;
        } catch (IOException exception) {
            throw new ExceptionInInitializerError(exception);
        }
    }

    @DynamicPropertySource
    static void downstreamUrls(DynamicPropertyRegistry registry) {
        registry.add("customer-service.url", () -> "http://localhost:" + DOWNSTREAM.getAddress().getPort());
        registry.add("inventory-service.url", () -> "http://localhost:" + DOWNSTREAM.getAddress().getPort());
    }

    @AfterAll
    static void stopDownstream() {
        DOWNSTREAM.stop(0);
    }

    @Test
    void routesCustomerPathAndQueryString() {
        webTestClient.get().uri("/customers/42?projection=summary").exchange()
                .expectStatus().isOk().expectBody(String.class)
                .isEqualTo("GET /customers/42?projection=summary ");
    }

    @Test
    void forwardsProductMethodAndBody() {
        webTestClient.post().uri("/products").contentType(MediaType.APPLICATION_JSON)
                .bodyValue("{\"name\":\"Keyboard\"}").exchange()
                .expectStatus().isOk().expectBody(String.class)
                .isEqualTo("POST /products {\"name\":\"Keyboard\"}");
    }

    @Test
    void rejectsUnknownRoutes() {
        webTestClient.get().uri("/unknown").exchange().expectStatus().isNotFound();
    }
}
