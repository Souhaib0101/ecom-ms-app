package net.montaki.customerservice;

import net.montaki.customerservice.config.CustomerConfigParams;
import net.montaki.customerservice.entities.Customer;
import net.montaki.customerservice.repository.CustomerRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;

import java.util.List;

@SpringBootApplication
@EnableConfigurationProperties(CustomerConfigParams.class)
public class CustomerServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(CustomerServiceApplication.class, args);
    }

    @Bean
    CommandLineRunner start(CustomerRepository customerRepository) {
        return args -> customerRepository.saveAll(List.of(
                Customer.builder().name("Mohamed").email("mohamed@example.com").build(),
                Customer.builder().name("Imane").email("imane@example.com").build(),
                Customer.builder().name("Yassine").email("yassine@example.com").build()
        ));
    }

}
