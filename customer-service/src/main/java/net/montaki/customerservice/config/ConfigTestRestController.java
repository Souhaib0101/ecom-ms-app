package net.montaki.customerservice.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.bind.Binder;
import org.springframework.cloud.context.config.annotation.RefreshScope;
import org.springframework.core.env.Environment;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RefreshScope
public class ConfigTestRestController {

    @Value("${global.params.p1}")
    private String p1;
    @Value("${global.params.p2}")
    private String p2;

    private final CustomerConfigParams customerConfigParams;

    public ConfigTestRestController(CustomerConfigParams customerConfigParams, Environment environment) {
        // Immutable records are not rebound in place when Spring Cloud refreshes configuration.
        // Bind a fresh snapshot whenever this refresh-scoped controller is recreated.
        this.customerConfigParams = Binder.get(environment)
                .bind("customer.params", CustomerConfigParams.class).orElse(customerConfigParams);
    }

    @GetMapping("/testConfig1")
    public Map<String, String> globalConfiguration() {
        return Map.of("p1", p1, "p2", p2);
    }

    @GetMapping("/testConfig2")
    public CustomerConfigParams customerConfiguration() {
        return customerConfigParams;
    }
}
