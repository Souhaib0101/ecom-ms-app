package net.montaki.inventoryservice;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class InventoryServiceApplicationTests {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void listsSeededProductsWithHalLinks() throws Exception {
        mockMvc.perform(get("/products"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$._embedded.products", hasSize(3)))
                .andExpect(jsonPath("$._embedded.products[*].name",
                        containsInAnyOrder("Computer", "Printer", "Smartphone")))
                .andExpect(jsonPath("$._embedded.products[0]._links.self.href").exists());
    }

    @Test
    void supportsPaginationAndSortingByPrice() throws Exception {
        mockMvc.perform(get("/products").param("size", "1").param("sort", "price,asc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$._embedded.products", hasSize(1)))
                .andExpect(jsonPath("$._embedded.products[0].name").value("Printer"))
                .andExpect(jsonPath("$._embedded.products[0].price").value(1200.0))
                .andExpect(jsonPath("$.page.totalElements").value(3));
    }

    @Test
    void createsReadsUpdatesAndDeletesProduct() throws Exception {
        String location = mockMvc.perform(post("/products")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Keyboard","price":199.99,"quantity":25}
                                """))
                .andExpect(status().isCreated())
                .andExpect(header().exists("Location"))
                .andReturn().getResponse().getHeader("Location");
        assertThat(location).isNotNull();

        mockMvc.perform(get(location))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Keyboard"))
                .andExpect(jsonPath("$.price").value(199.99))
                .andExpect(jsonPath("$.quantity").value(25));

        mockMvc.perform(patch(location).contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"quantity":20}
                                """))
                .andExpect(status().is2xxSuccessful());
        mockMvc.perform(get(location))
                .andExpect(jsonPath("$.name").value("Keyboard"))
                .andExpect(jsonPath("$.price").value(199.99))
                .andExpect(jsonPath("$.quantity").value(20));

        mockMvc.perform(put(location).contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Mechanical Keyboard","price":349.50,"quantity":15}
                                """))
                .andExpect(status().is2xxSuccessful());
        mockMvc.perform(get(location))
                .andExpect(jsonPath("$.name").value("Mechanical Keyboard"))
                .andExpect(jsonPath("$.price").value(349.50))
                .andExpect(jsonPath("$.quantity").value(15));

        mockMvc.perform(delete(location)).andExpect(status().isNoContent());
        mockMvc.perform(get(location)).andExpect(status().isNotFound());
    }

    @Test
    void returnsNotFoundForUnknownProduct() throws Exception {
        mockMvc.perform(get("/products/999999")).andExpect(status().isNotFound());
    }

    @Test
    void reportsHealthyWithoutExternalServices() throws Exception {
        mockMvc.perform(get("/actuator/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }
}
