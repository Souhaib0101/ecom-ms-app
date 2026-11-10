package net.montaki.billingservice.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import net.montaki.billingservice.model.Customer;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Getter
@Setter
public class Bill {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private LocalDate billingDate;
    private Long customerId;
    @OneToMany(mappedBy = "bill", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ProductItem> productItems = new ArrayList<>();
    @Transient
    private Customer customer;

    public void addItem(ProductItem item) {
        item.setBill(this);
        productItems.add(item);
    }

    public BigDecimal getTotal() {
        return productItems.stream().map(ProductItem::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
