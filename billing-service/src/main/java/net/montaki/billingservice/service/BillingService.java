package net.montaki.billingservice.service;

import lombok.RequiredArgsConstructor;
import net.montaki.billingservice.entities.Bill;
import net.montaki.billingservice.entities.ProductItem;
import net.montaki.billingservice.feign.CustomerServiceClient;
import net.montaki.billingservice.feign.InventoryServiceClient;
import net.montaki.billingservice.model.Product;
import net.montaki.billingservice.repository.BillRepository;
import net.montaki.billingservice.web.CreateBillRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BillingService {

    private final BillRepository bills;
    private final CustomerServiceClient customers;
    private final InventoryServiceClient products;

    public List<Summary> list(Long customerId) {
        List<Bill> result = customerId == null ? bills.findAll() : bills.findByCustomerId(customerId);
        return result.stream().map(bill -> new Summary(bill.getId(), bill.getBillingDate(),
                bill.getCustomerId(), bill.getProductItems().size(), bill.getTotal())).toList();
    }

    public Bill fullBill(Long id) {
        Bill bill = find(id);
        bill.setCustomer(customers.findByIdWithFallback(bill.getCustomerId()));
        bill.getProductItems().forEach(item -> item.setProduct(products.findById(item.getProductId())));
        return bill;
    }

    @Transactional
    public Bill create(CreateBillRequest request) {
        Bill bill = new Bill();
        bill.setBillingDate(LocalDate.now());
        bill.setCustomerId(request.customerId());
        bill.setCustomer(customers.findById(request.customerId()));
        for (CreateBillRequest.Item line : request.items()) {
            Product product = products.findById(line.productId());
            bill.addItem(new ProductItem(null, line.productId(), line.quantity(), product.price(), bill, product));
        }
        return bills.save(bill);
    }

    @Transactional
    public void delete(Long id) {
        bills.delete(find(id));
    }

    private Bill find(Long id) {
        return bills.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Facture introuvable"));
    }

    public record Summary(Long id, LocalDate billingDate, Long customerId, int itemCount, BigDecimal total) {
    }
}
