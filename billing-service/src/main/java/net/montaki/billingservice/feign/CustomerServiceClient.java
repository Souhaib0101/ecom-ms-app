package net.montaki.billingservice.feign;

import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import net.montaki.billingservice.model.Customer;
import org.slf4j.LoggerFactory;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "customer-service", url = "${services.customer.url:}")
public interface CustomerServiceClient {

    @GetMapping("/customers/{id}")
    Customer findById(@PathVariable("id") Long id);

    @CircuitBreaker(name = "customer-service", fallbackMethod = "getDefaultCustomer")
    default Customer findByIdWithFallback(Long id) {
        return findById(id);
    }

    default Customer getDefaultCustomer(Long id, Throwable exception) {
        LoggerFactory.getLogger(CustomerServiceClient.class)
                .warn("Customer {} unavailable; returning default customer", id, exception);
        return new Customer(id, "Default customer", "default@gmail.com");
    }
}
