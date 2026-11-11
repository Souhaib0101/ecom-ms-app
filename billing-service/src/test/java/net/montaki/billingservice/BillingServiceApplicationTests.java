package net.montaki.billingservice;

import feign.FeignException;
import feign.Request;
import net.montaki.billingservice.feign.CustomerServiceClient;
import net.montaki.billingservice.feign.InventoryServiceClient;
import net.montaki.billingservice.model.Customer;
import net.montaki.billingservice.model.Product;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.Map;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = "spring.cloud.discovery.enabled=false")
@AutoConfigureMockMvc
class BillingServiceApplicationTests {

    @Autowired
    private MockMvc mvc;
    @MockitoBean
    private CustomerServiceClient customers;
    @MockitoBean
    private InventoryServiceClient products;

    @BeforeEach
    void remoteData() {
        when(customers.findById(1L)).thenReturn(new Customer(1L, "Mohamed", "mohamed@example.com"));
        when(customers.findByIdWithFallback(1L)).thenReturn(new Customer(1L, "Mohamed", "mohamed@example.com"));
        when(products.findById(1L)).thenReturn(new Product(1L, "Computer", new BigDecimal("4300.00"), 50));
        when(products.findById(2L)).thenReturn(new Product(2L, "Printer", new BigDecimal("1200.00"), 10));
        when(products.findById(3L)).thenReturn(new Product(3L, "Smartphone", new BigDecimal("3200.00"), 30));
    }

    @Test
    void exposesBillsAndTheirLinesThroughSpringDataRest() throws Exception {
        mvc.perform(get("/bills")).andExpect(status().isOk())
                .andExpect(jsonPath("$._embedded.bills", hasSize(3)));
        mvc.perform(get("/bills/1/productItems")).andExpect(status().isOk())
                .andExpect(jsonPath("$._embedded.productItems", hasSize(3)));
        mvc.perform(get("/productItems/search/findByBillId?billId=1")).andExpect(status().isOk())
                .andExpect(jsonPath("$._embedded.productItems", hasSize(3)));
    }

    @Test
    void enrichesBillAndComputesTotalWithoutRecursiveJson() throws Exception {
        mvc.perform(get("/api/bills/1")).andExpect(status().isOk())
                .andExpect(jsonPath("$.customer.name").value("Mohamed"))
                .andExpect(jsonPath("$.productItems", hasSize(3)))
                .andExpect(jsonPath("$.productItems[0].product.name").value("Computer"))
                .andExpect(jsonPath("$.productItems[0].bill").doesNotExist())
                .andExpect(jsonPath("$.total").value(9900.0));
    }

    @Test
    void createsBillAtCurrentPricesAndDeletesItsLines() throws Exception {
        String location = mvc.perform(post("/api/bills").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"customerId":1,"items":[{"productId":1,"quantity":2},{"productId":2,"quantity":1}]}
                                """))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.total").value(9800.0))
                .andReturn().getResponse().getHeader("Location");
        mvc.perform(get(location)).andExpect(status().isOk()).andExpect(jsonPath("$.total").value(9800.0));
        mvc.perform(delete(location)).andExpect(status().isNoContent());
        mvc.perform(get(location)).andExpect(status().isNotFound());
    }

    @Test
    void filtersSummariesByCustomer() throws Exception {
        mvc.perform(get("/api/bills?customerId=2")).andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1))).andExpect(jsonPath("$[0].customerId").value(2));
    }

    @Test
    void rejectsInvalidQuantity() throws Exception {
        mvc.perform(post("/api/bills").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"customerId":1,"items":[{"productId":1,"quantity":0}]}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void returnsNotFoundForMissingBill() throws Exception {
        mvc.perform(get("/api/bills/999999")).andExpect(status().isNotFound());
    }

    @Test
    void reportsDependencyFailureAsServiceUnavailable() throws Exception {
        Request request = Request.create(Request.HttpMethod.GET, "http://customer-service/customers/1",
                Map.of(), null, StandardCharsets.UTF_8, null);
        when(customers.findById(1L)).thenThrow(new FeignException.ServiceUnavailable(
                "Unavailable", request, null, Map.of()));
        mvc.perform(post("/api/bills").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"customerId":1,"items":[{"productId":1,"quantity":1}]}
                                """))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.detail").exists());
        mvc.perform(get("/api/bills")).andExpect(status().isOk());
    }
}
