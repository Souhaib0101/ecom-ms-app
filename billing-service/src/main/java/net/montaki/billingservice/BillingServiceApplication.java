package net.montaki.billingservice;

import net.montaki.billingservice.entities.Bill;
import net.montaki.billingservice.entities.ProductItem;
import net.montaki.billingservice.repository.BillRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.context.annotation.Bean;

import java.math.BigDecimal;
import java.time.LocalDate;

@SpringBootApplication
@EnableFeignClients
public class BillingServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(BillingServiceApplication.class, args);
    }

    @Bean
    CommandLineRunner start(BillRepository bills) {
        return args -> {
            for (long customerId = 1; customerId <= 3; customerId++) {
                Bill bill = new Bill();
                bill.setCustomerId(customerId);
                bill.setBillingDate(LocalDate.now());
                bill.addItem(new ProductItem(null, 1L, 1, new BigDecimal("4300.00"), bill, null));
                bill.addItem(new ProductItem(null, 2L, 2, new BigDecimal("1200.00"), bill, null));
                bill.addItem(new ProductItem(null, 3L, 1, new BigDecimal("3200.00"), bill, null));
                bills.save(bill);
            }
        };
    }
}
