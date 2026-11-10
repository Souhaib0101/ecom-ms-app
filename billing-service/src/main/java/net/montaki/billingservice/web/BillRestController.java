package net.montaki.billingservice.web;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import net.montaki.billingservice.entities.Bill;
import net.montaki.billingservice.service.BillingService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/bills")
@RequiredArgsConstructor
public class BillRestController {

    private final BillingService service;

    @GetMapping
    public List<BillingService.Summary> list(@RequestParam(required = false) Long customerId) {
        return service.list(customerId);
    }

    @GetMapping("/{id}")
    public Bill fullBill(@PathVariable Long id) {
        return service.fullBill(id);
    }

    @PostMapping
    public ResponseEntity<Bill> create(@Valid @RequestBody CreateBillRequest request) {
        Bill bill = service.create(request);
        return ResponseEntity.created(URI.create("/api/bills/" + bill.getId())).body(bill);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
