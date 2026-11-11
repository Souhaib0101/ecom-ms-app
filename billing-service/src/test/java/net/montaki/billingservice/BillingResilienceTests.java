package net.montaki.billingservice;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import net.montaki.billingservice.feign.CustomerServiceClient;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "spring.cloud.discovery.enabled=false",
        "spring.datasource.url=jdbc:h2:mem:billing-resilience-db"
})
@AutoConfigureMockMvc
class BillingResilienceTests {

    private static final AtomicInteger customerStatus = new AtomicInteger(200);
    private static final AtomicInteger customerCalls = new AtomicInteger();
    private static final HttpServer server = startServer();

    @Autowired
    private MockMvc mvc;
    @Autowired
    private CustomerServiceClient customers;
    @Autowired
    private CircuitBreakerRegistry breakers;

    private static HttpServer startServer() {
        try {
            HttpServer http = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            http.createContext("/customers/", exchange -> {
                customerCalls.incrementAndGet();
                respond(exchange, customerStatus.get(),
                        "{\"id\":1,\"name\":\"Mohamed\",\"email\":\"mohamed@example.com\"}");
            });
            http.createContext("/products/", exchange -> respond(exchange, 200,
                    "{\"id\":1,\"name\":\"Computer\",\"price\":4300,\"quantity\":50}"));
            http.start();
            return http;
        } catch (IOException exception) {
            throw new IllegalStateException(exception);
        }
    }

    private static void respond(HttpExchange exchange, int status, String body) throws IOException {
        try (exchange) {
            byte[] content = body.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(status, content.length);
            exchange.getResponseBody().write(content);
        }
    }

    @DynamicPropertySource
    static void services(DynamicPropertyRegistry registry) {
        String url = "http://127.0.0.1:" + server.getAddress().getPort();
        registry.add("services.customer.url", () -> url);
        registry.add("services.inventory.url", () -> url);
    }

    @BeforeEach
    void resetServices() {
        customerStatus.set(200);
        customerCalls.set(0);
        breakers.getAllCircuitBreakers().forEach(CircuitBreaker::reset);
    }

    @AfterAll
    static void stopServer() {
        server.stop(0);
    }

    @Test
    void keepsBillAvailableWhenCustomerServiceFails() throws Exception {
        customerStatus.set(503);
        mvc.perform(get("/api/bills/1")).andExpect(status().isOk())
                .andExpect(jsonPath("$.customer.id").value(1))
                .andExpect(jsonPath("$.customer.name").value("Default customer"))
                .andExpect(jsonPath("$.productItems[0].product.name").value("Computer"))
                .andExpect(jsonPath("$.total").value(9900.0));
    }

    @Test
    void opensCustomerCircuitAndRecoversAfterSuccessfulProbes() {
        customerStatus.set(503);
        for (int call = 0; call < 5; call++) {
            assertThat(customers.findByIdWithFallback(1L).name()).isEqualTo("Default customer");
        }
        CircuitBreaker circuit = breakers.circuitBreaker("customer-service");
        assertThat(circuit.getState()).isEqualTo(CircuitBreaker.State.OPEN);
        assertThat(customerCalls.get()).isEqualTo(5);
        customerStatus.set(200);
        assertThat(customers.findByIdWithFallback(1L).name()).isEqualTo("Default customer");
        assertThat(customerCalls.get()).isEqualTo(5);
        circuit.transitionToHalfOpenState();
        assertThat(customers.findByIdWithFallback(1L).name()).isEqualTo("Mohamed");
        assertThat(customers.findByIdWithFallback(1L).name()).isEqualTo("Mohamed");
        assertThat(circuit.getState()).isEqualTo(CircuitBreaker.State.CLOSED);
    }

    @Test
    void doesNotCreateBillWithFallbackCustomer() throws Exception {
        customerStatus.set(503);
        mvc.perform(post("/api/bills").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"customerId":1,"items":[{"productId":1,"quantity":1}]}
                                """))
                .andExpect(status().isServiceUnavailable());
        mvc.perform(get("/api/bills?customerId=1"))
                .andExpect(jsonPath("$.length()").value(1));
    }
}
