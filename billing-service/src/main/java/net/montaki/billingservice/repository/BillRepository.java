package net.montaki.billingservice.repository;

import net.montaki.billingservice.entities.Bill;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BillRepository extends JpaRepository<Bill, Long> {

    @Override
    @EntityGraph(attributePaths = "productItems")
    Optional<Bill> findById(Long id);

    @Override
    @EntityGraph(attributePaths = "productItems")
    List<Bill> findAll();

    @EntityGraph(attributePaths = "productItems")
    List<Bill> findByCustomerId(Long customerId);
}
