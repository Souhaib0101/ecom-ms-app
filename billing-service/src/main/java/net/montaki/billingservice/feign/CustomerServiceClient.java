package net.montaki.billingservice.feign;

import net.montaki.billingservice.model.Customer;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "customer-service", url = "${services.customer.url:}")
public interface CustomerServiceClient {

    @GetMapping("/customers/{id}")
    Customer findById(@PathVariable("id") Long id);
}
