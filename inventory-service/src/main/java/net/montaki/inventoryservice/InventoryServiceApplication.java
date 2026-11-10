package net.montaki.inventoryservice;

import net.montaki.inventoryservice.entities.Product;
import net.montaki.inventoryservice.repository.ProductRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

import java.util.List;

@SpringBootApplication
public class InventoryServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(InventoryServiceApplication.class, args);
    }

    @Bean
    CommandLineRunner start(ProductRepository productRepository) {
        return args -> productRepository.saveAll(List.of(
                Product.builder().name("Computer").price(4300).quantity(50).build(),
                Product.builder().name("Printer").price(1200).quantity(10).build(),
                Product.builder().name("Smartphone").price(3200).quantity(30).build()
        ));
    }
}
