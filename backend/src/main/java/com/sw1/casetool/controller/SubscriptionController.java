package com.sw1.casetool.controller;

import com.sw1.casetool.dto.ApiResponse;
import com.sw1.casetool.dto.subscription.*;
import com.sw1.casetool.service.SubscriptionService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/subscription")
@RequiredArgsConstructor
public class SubscriptionController {

    private final SubscriptionService subscriptionService;

    @GetMapping("/plans")
    public ResponseEntity<ApiResponse<List<SubscriptionPlanResponse>>> getPlans() {
        List<SubscriptionPlanResponse> plans = subscriptionService.getPlans();
        return ResponseEntity.ok(ApiResponse.success("Catálogo de planes recuperado exitosamente", plans));
    }

    @GetMapping("/status")
    public ResponseEntity<ApiResponse<SubscriptionStatusResponse>> getStatus(
            @AuthenticationPrincipal String userEmail,
            Principal principal
    ) {
        String userIdentifier = resolveUser(userEmail, principal);
        SubscriptionStatusResponse status = subscriptionService.getStatus(userIdentifier);
        return ResponseEntity.ok(ApiResponse.success("Estado de suscripción obtenido", status));
    }

    @PostMapping("/paypal/create-order")
    public ResponseEntity<ApiResponse<CreatePayPalOrderResponse>> createOrder(
            @AuthenticationPrincipal String userEmail,
            Principal principal,
            @Valid @RequestBody CreatePayPalOrderRequest request
    ) {
        String userIdentifier = resolveUser(userEmail, principal);
        CreatePayPalOrderResponse res = subscriptionService.createPayPalOrder(userIdentifier, request);
        return ResponseEntity.ok(ApiResponse.success("Orden de PayPal Sandbox inicializada", res));
    }

    @PostMapping("/paypal/capture-order")
    public ResponseEntity<ApiResponse<PaymentReceiptResponse>> captureOrder(
            @AuthenticationPrincipal String userEmail,
            Principal principal,
            @Valid @RequestBody CapturePayPalOrderRequest request,
            HttpServletRequest httpRequest
    ) {
        String userIdentifier = resolveUser(userEmail, principal);
        String ip = extractClientIp(httpRequest);
        String userAgent = httpRequest.getHeader("User-Agent");

        PaymentReceiptResponse receipt = subscriptionService.capturePayPalOrder(
                userIdentifier,
                request,
                ip,
                userAgent
        );
        return ResponseEntity.ok(ApiResponse.success("Suscripción de 30 días activada exitosamente", receipt));
    }

    @PostMapping("/cancel")
    public ResponseEntity<ApiResponse<SubscriptionStatusResponse>> cancelSubscription(
            @AuthenticationPrincipal String userEmail,
            Principal principal,
            HttpServletRequest httpRequest
    ) {
        String userIdentifier = resolveUser(userEmail, principal);
        String ip = extractClientIp(httpRequest);
        String userAgent = httpRequest.getHeader("User-Agent");

        SubscriptionStatusResponse status = subscriptionService.cancelSubscription(
                userIdentifier,
                ip,
                userAgent
        );
        return ResponseEntity.ok(ApiResponse.success("Suscripción cancelada. Se restableció a Community", status));
    }

    @GetMapping("/history")
    public ResponseEntity<ApiResponse<List<PaymentReceiptResponse>>> getHistory(
            @AuthenticationPrincipal String userEmail,
            Principal principal
    ) {
        String userIdentifier = resolveUser(userEmail, principal);
        List<PaymentReceiptResponse> history = subscriptionService.getUserPaymentHistory(userIdentifier);
        return ResponseEntity.ok(ApiResponse.success("Historial de pagos obtenido", history));
    }

    private String resolveUser(String userEmail, Principal principal) {
        if (userEmail != null && !userEmail.isBlank()) {
            return userEmail;
        }
        if (principal != null && principal.getName() != null && !principal.getName().isBlank()) {
            return principal.getName();
        }
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getName() != null && !auth.getName().isBlank() && !auth.getName().equals("anonymousUser")) {
            return auth.getName();
        }
        throw new IllegalArgumentException("Usuario no autenticado o sesión expirada.");
    }

    private String extractClientIp(HttpServletRequest request) {
        String xf = request.getHeader("X-Forwarded-For");
        if (xf != null && !xf.isEmpty()) {
            return xf.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
