package net.montaki.customerservice.repository;

import net.montaki.customerservice.entities.Customer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.rest.core.annotation.RepositoryRestResource;

@RepositoryRestResource(path = "customers", collectionResourceRel = "customers")
public interface CustomerRepository extends JpaRepository<Customer, Long> {
}
