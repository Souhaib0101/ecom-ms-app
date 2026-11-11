package net.montaki.billingservice.repository;

import net.montaki.billingservice.entities.Bill;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.rest.core.annotation.RepositoryRestResource;

import java.util.List;
import java.util.Optional;

@RepositoryRestResource
public interface BillRepository extends JpaRepository<Bill, Long> {

    @Override
    @EntityGraph(attributePaths = "productItems")
    Optional<Bill> findById(Long id);

    @Override
    @EntityGraph(attributePaths = "productItems")
    List<Bill> findAll();

    @Override
    @EntityGraph(attributePaths = "productItems")
    Page<Bill> findAll(Pageable pageable);

    @EntityGraph(attributePaths = "productItems")
    List<Bill> findByCustomerId(Long customerId);
}
