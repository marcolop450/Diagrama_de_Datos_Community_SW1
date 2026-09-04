package com.sw1.casetool.controller;

import com.sw1.casetool.dto.ApiResponse;
import com.sw1.casetool.dto.subscription.*;
import com.sw1.casetool.service.SubscriptionService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

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
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        SubscriptionStatusResponse status = subscriptionService.getStatus(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success("Estado de suscripción obtenido", status));
    }

    @PostMapping("/paypal/create-order")
    public ResponseEntity<ApiResponse<CreatePayPalOrderResponse>> createOrder(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody CreatePayPalOrderRequest request
    ) {
        CreatePayPalOrderResponse res = subscriptionService.createPayPalOrder(userDetails.getUsername(), request);
        return ResponseEntity.ok(ApiResponse.success("Orden de PayPal Sandbox inicializada", res));
    }

    @PostMapping("/paypal/capture-order")
    public ResponseEntity<ApiResponse<PaymentReceiptResponse>> captureOrder(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody CapturePayPalOrderRequest request,
            HttpServletRequest httpRequest
    ) {
        String ip = extractClientIp(httpRequest);
        String userAgent = httpRequest.getHeader("User-Agent");

        PaymentReceiptResponse receipt = subscriptionService.capturePayPalOrder(
                userDetails.getUsername(),
                request,
                ip,
                userAgent
        );
        return ResponseEntity.ok(ApiResponse.success("Suscripción de 30 días activada exitosamente", receipt));
    }

    @PostMapping("/cancel")
    public ResponseEntity<ApiResponse<SubscriptionStatusResponse>> cancelSubscription(
            @AuthenticationPrincipal UserDetails userDetails,
            HttpServletRequest httpRequest
    ) {
        String ip = extractClientIp(httpRequest);
        String userAgent = httpRequest.getHeader("User-Agent");

        SubscriptionStatusResponse status = subscriptionService.cancelSubscription(
                userDetails.getUsername(),
                ip,
                userAgent
        );
        return ResponseEntity.ok(ApiResponse.success("Suscripción cancelada. Se restableció a Community", status));
    }

    @GetMapping("/history")
    public ResponseEntity<ApiResponse<List<PaymentReceiptResponse>>> getHistory(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        List<PaymentReceiptResponse> history = subscriptionService.getUserPaymentHistory(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success("Historial de pagos obtenido", history));
    }

    private String extractClientIp(HttpServletRequest request) {
        String xf = request.getHeader("X-Forwarded-For");
        if (xf != null && !xf.isEmpty()) {
            return xf.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
