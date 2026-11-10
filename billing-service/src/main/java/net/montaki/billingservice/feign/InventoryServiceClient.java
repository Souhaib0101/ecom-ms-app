package net.montaki.billingservice.feign;

import net.montaki.billingservice.model.Product;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "inventory-service", url = "${services.inventory.url:}")
public interface InventoryServiceClient {

    @GetMapping("/products/{id}")
    Product findById(@PathVariable("id") Long id);
}
