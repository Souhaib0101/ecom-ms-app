package net.montaki.billingservice.web;

import feign.FeignException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class RemoteServiceExceptionHandler {

    @ExceptionHandler(FeignException.class)
    ProblemDetail remoteFailure(FeignException exception) {
        boolean missingReference = exception.status() == 404;
        return ProblemDetail.forStatusAndDetail(
                missingReference ? HttpStatus.UNPROCESSABLE_ENTITY : HttpStatus.SERVICE_UNAVAILABLE,
                missingReference ? "Le client ou le produit demandé n'existe plus."
                        : "Le service clients ou produits est momentanément indisponible.");
    }
}
