package net.montaki.customerservice;

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

@SpringBootTest(properties = {
        "spring.cloud.discovery.enabled=false",
        "spring.cloud.config.enabled=false",
        "spring.config.import=file:../config-repo/application.properties,file:../config-repo/customer-service.properties"
})
@AutoConfigureMockMvc
class CustomerServiceApplicationTests {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void readsSharedConfigurationWithValueInjection() throws Exception {
        mockMvc.perform(get("/testConfig1")).andExpect(status().isOk())
                .andExpect(jsonPath("$.p1").value("456"))
                .andExpect(jsonPath("$.p2").value("224"));
    }

    @Test
    void bindsCustomerConfigurationToRecord() throws Exception {
        mockMvc.perform(get("/testConfig2")).andExpect(status().isOk())
                .andExpect(jsonPath("$.x").value(11))
                .andExpect(jsonPath("$.y").value(22));
    }

    @Test
    void listsSeededCustomersWithHalLinks() throws Exception {
        mockMvc.perform(get("/customers"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$._embedded.customers", hasSize(3)))
                .andExpect(jsonPath("$._embedded.customers[*].name",
                        containsInAnyOrder("Mohamed", "Imane", "Yassine")))
                .andExpect(jsonPath("$._embedded.customers[0]._links.self.href").exists());
    }

    @Test
    void supportsPaginationAndSorting() throws Exception {
        mockMvc.perform(get("/customers").param("size", "1").param("sort", "name,asc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$._embedded.customers", hasSize(1)))
                .andExpect(jsonPath("$._embedded.customers[0].name").value("Imane"))
                .andExpect(jsonPath("$.page.totalElements").value(3));
    }

    @Test
    void createsReadsUpdatesAndDeletesCustomer() throws Exception {
        String location = mockMvc.perform(post("/customers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Sara","email":"sara@example.com"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(header().exists("Location"))
                .andReturn().getResponse().getHeader("Location");
        assertThat(location).isNotNull();

        mockMvc.perform(get(location))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Sara"))
                .andExpect(jsonPath("$.email").value("sara@example.com"));

        mockMvc.perform(patch(location).contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"sara.updated@example.com"}
                                """))
                .andExpect(status().is2xxSuccessful());
        mockMvc.perform(get(location))
                .andExpect(jsonPath("$.name").value("Sara"))
                .andExpect(jsonPath("$.email").value("sara.updated@example.com"));

        mockMvc.perform(put(location).contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Sara Updated","email":"sara@example.com"}
                                """))
                .andExpect(status().is2xxSuccessful());
        mockMvc.perform(get(location))
                .andExpect(jsonPath("$.name").value("Sara Updated"));

        mockMvc.perform(delete(location)).andExpect(status().isNoContent());
        mockMvc.perform(get(location)).andExpect(status().isNotFound());
    }

    @Test
    void returnsNotFoundForUnknownCustomer() throws Exception {
        mockMvc.perform(get("/customers/999999")).andExpect(status().isNotFound());
    }

    @Test
    void reportsHealthyWithoutExternalServices() throws Exception {
        mockMvc.perform(get("/actuator/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }

}
