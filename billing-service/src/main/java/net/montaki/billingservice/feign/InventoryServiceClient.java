package net.montaki.billingservice.feign;

import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import net.montaki.billingservice.model.Product;
import org.slf4j.LoggerFactory;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.math.BigDecimal;

@FeignClient(name = "inventory-service", url = "${services.inventory.url:}")
public interface InventoryServiceClient {

    @GetMapping("/products/{id}")
    Product findById(@PathVariable("id") Long id);

    @CircuitBreaker(name = "inventory-service", fallbackMethod = "getDefaultProduct")
    default Product findByIdWithFallback(Long id) {
        return findById(id);
    }

    default Product getDefaultProduct(Long id, Throwable exception) {
        LoggerFactory.getLogger(InventoryServiceClient.class)
                .warn("Product {} unavailable; returning default product", id, exception);
        return new Product(id, null, BigDecimal.ZERO, 0);
    }
}
