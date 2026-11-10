package net.montaki.billingservice.web;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.util.List;

public record CreateBillRequest(
        @NotNull @Positive Long customerId,
        @NotEmpty List<@NotNull @Valid Item> items) {

    public record Item(@NotNull @Positive Long productId, @Positive int quantity) {
    }
}
