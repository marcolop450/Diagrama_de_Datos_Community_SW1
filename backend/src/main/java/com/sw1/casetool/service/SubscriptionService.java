package com.sw1.casetool.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sw1.casetool.dto.subscription.*;
import com.sw1.casetool.model.PaymentLog;
import com.sw1.casetool.model.SubscriptionPlan;
import com.sw1.casetool.model.UserProfile;
import com.sw1.casetool.repository.PaymentLogRepository;
import com.sw1.casetool.repository.SubscriptionPlanRepository;
import com.sw1.casetool.repository.UserProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SubscriptionService {

    private final UserProfileRepository userProfileRepository;
    private final PaymentLogRepository paymentLogRepository;
    private final SubscriptionPlanRepository subscriptionPlanRepository;
    private final AuditLogService auditLogService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${paypal.client-id:BAAEZt0Yfq-bOz9gNms5brjPxsI5rg76weuPR4Af4MdDP5g5XkLEMd9FOfZppWGz2g1q-3CeacCFe4Pc-w}")
    private String paypalClientId;

    @Value("${paypal.client-secret:EC2Ox4xw8-9QJcQbbyBIoX4-bKlT2eoaqT81VQj2XMKB6tsPz3ZP_NJzIdEJeytWFDbrqV10K3dbWQNF}")
    private String paypalClientSecret;

    @Value("${paypal.mode:sandbox}")
    private String paypalMode;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    @Transactional(readOnly = true)
    public List<SubscriptionPlanResponse> getPlans() {
        List<SubscriptionPlan> plans = subscriptionPlanRepository.findAllByOrderByPriceMonthlyAsc();
        if (plans.isEmpty()) {
            return getDefaultPlans();
        }

        return plans.stream().map(p -> SubscriptionPlanResponse.builder()
                .id(p.getId())
                .name(p.getName())
                .priceMonthly(p.getPriceMonthly())
                .maxProjects(p.getMaxProjects())
                .maxClassesPerProject(p.getMaxClassesPerProject())
                .allowSpringBootGeneration(Boolean.TRUE.equals(p.getAllowSpringBootGeneration()))
                .allowDdlGeneration(Boolean.TRUE.equals(p.getAllowDdlGeneration()))
                .allowPostmanGeneration(Boolean.TRUE.equals(p.getAllowPostmanGeneration()))
                .allowXmiExport(Boolean.TRUE.equals(p.getAllowXmiExport()))
                .allowVoiceCommands(Boolean.TRUE.equals(p.getAllowVoiceCommands()))
                .allowPhotoOcr(Boolean.TRUE.equals(p.getAllowPhotoOcr()))
                .allowRealtimeCollaboration(Boolean.TRUE.equals(p.getAllowRealtimeCollaboration()))
                .build()
        ).collect(Collectors.toList());
    }

    @Transactional
    public SubscriptionStatusResponse getStatus(String userIdentifier) {
        UserProfile user = getUser(userIdentifier);
        Instant now = Instant.now();

        // Check expiration
        if (user.getSubscriptionExpiresAt() != null && user.getSubscriptionExpiresAt().isBefore(now)) {
            if (!"COMMUNITY".equalsIgnoreCase(user.getSubscriptionPlan())) {
                log.info("Subscription expired for user {}. Downgrading to COMMUNITY", user.getUsername());
                user.setSubscriptionPlan("COMMUNITY");
                user.setSubscriptionExpiresAt(null);
                userProfileRepository.saveAndFlush(user);
            }
        }

        String plan = user.getSubscriptionPlan() != null ? user.getSubscriptionPlan().toUpperCase() : "COMMUNITY";
        boolean isPaid = !"COMMUNITY".equalsIgnoreCase(plan);
        long daysRemaining = 0;

        if (user.getSubscriptionExpiresAt() != null && user.getSubscriptionExpiresAt().isAfter(now)) {
            daysRemaining = ChronoUnit.DAYS.between(now, user.getSubscriptionExpiresAt()) + 1;
        }

        return SubscriptionStatusResponse.builder()
                .planId(plan)
                .planName(getPlanDisplayName(plan))
                .active(isPaid ? daysRemaining > 0 : true)
                .subscriptionExpiresAt(user.getSubscriptionExpiresAt())
                .daysRemaining(daysRemaining)
                .canCancel(isPaid)
                .allowSpringBootGeneration(isPaid)
                .allowDdlGeneration(true)
                .allowPostmanGeneration(isPaid)
                .allowXmiExport(isPaid)
                .build();
    }

    @Transactional
    public CreatePayPalOrderResponse createPayPalOrder(String userIdentifier, CreatePayPalOrderRequest req) {
        UserProfile user = getUser(userIdentifier);
        String planId = normalizePlanId(req.getPlanId());
        BigDecimal price = getPlanPrice(planId);

        String orderId = null;
        try {
            // Attempt to create real PayPal Sandbox Order via REST API v2
            String accessToken = getPayPalAccessToken();
            if (accessToken != null) {
                orderId = createPayPalOrderOnSandbox(accessToken, price, planId, user);
            }
        } catch (Exception e) {
            log.warn("Could not call live PayPal Sandbox API, falling back to simulated order ID: {}", e.getMessage());
        }

        if (orderId == null || orderId.trim().isEmpty()) {
            orderId = "SANDBOX-ORD-" + UUID.randomUUID().toString().substring(0, 18).toUpperCase();
        }

        return CreatePayPalOrderResponse.builder()
                .orderId(orderId)
                .status("CREATED")
                .planId(planId)
                .amount(price)
                .currency("USD")
                .build();
    }

    @Transactional
    public PaymentReceiptResponse capturePayPalOrder(String userIdentifier, CapturePayPalOrderRequest req, String ip, String userAgent) {
        UserProfile user = getUser(userIdentifier);
        String planId = normalizePlanId(req.getPlanId());
        BigDecimal amount = getPlanPrice(planId);
        String planName = getPlanDisplayName(planId);

        // Compute strict 30 calendar days
        Instant now = Instant.now();
        Instant currentExpiration = user.getSubscriptionExpiresAt();
        Instant newExpiration;

        if (currentExpiration != null && currentExpiration.isAfter(now)) {
            newExpiration = currentExpiration.plus(30, ChronoUnit.DAYS);
        } else {
            newExpiration = now.plus(30, ChronoUnit.DAYS);
        }

        // Update user profile in PostgreSQL
        String userPlanValue = planId.contains("ENTERPRISE") ? "ENTERPRISE" : "PRO_ARCHITECT";
        user.setSubscriptionPlan(userPlanValue);
        user.setSubscriptionExpiresAt(newExpiration);
        userProfileRepository.saveAndFlush(user);

        // Persist immutable transaction in payments_log
        Map<String, Object> rawPayload = new HashMap<>();
        rawPayload.put("paypalOrderId", req.getOrderId());
        rawPayload.put("paypalPayerId", req.getPayerId());
        rawPayload.put("planId", planId);
        rawPayload.put("amount", amount);
        rawPayload.put("currency", "USD");
        rawPayload.put("activatedDays", 30);
        rawPayload.put("clientIp", ip);

        PaymentLog paymentLog = PaymentLog.builder()
                .userId(user.getId())
                .paypalOrderId(req.getOrderId())
                .paypalPayerId(req.getPayerId() != null ? req.getPayerId() : "SANDBOX-BUYER")
                .amount(amount)
                .currency("USD")
                .planId(planId)
                .status("COMPLETED")
                .paymentMethod("PAYPAL_SANDBOX")
                .rawPayload(rawPayload)
                .createdAt(now)
                .build();

        PaymentLog savedPayment = paymentLogRepository.save(paymentLog);

        // Record security audit log
        Map<String, Object> auditDetails = new HashMap<>();
        auditDetails.put("paypalOrderId", req.getOrderId());
        auditDetails.put("plan", userPlanValue);
        auditDetails.put("amount", amount);
        auditDetails.put("expiresAt", newExpiration.toString());
        auditDetails.put("validityDays", 30);

        auditLogService.recordAction(
                user.getId(),
                "SUBSCRIPTION_PURCHASED",
                "payments_log",
                savedPayment.getId(),
                ip,
                userAgent,
                auditDetails
        );

        return mapToReceipt(savedPayment, user, planName, newExpiration);
    }

    @Transactional
    public SubscriptionStatusResponse cancelSubscription(String userIdentifier, String ip, String userAgent) {
        UserProfile user = getUser(userIdentifier);
        String currentPlan = user.getSubscriptionPlan();

        if (currentPlan == null || "COMMUNITY".equalsIgnoreCase(currentPlan)) {
            throw new IllegalArgumentException("No hay una suscripción activa para cancelar.");
        }

        Instant previousExpiresAt = user.getSubscriptionExpiresAt();

        // Option A: Immediate reset to COMMUNITY with clean null expiration date
        user.setSubscriptionPlan("COMMUNITY");
        user.setSubscriptionExpiresAt(null);
        userProfileRepository.saveAndFlush(user);

        // Record immutable audit log
        Map<String, Object> auditDetails = new HashMap<>();
        auditDetails.put("cancelledPlan", currentPlan);
        auditDetails.put("previousExpiresAt", previousExpiresAt != null ? previousExpiresAt.toString() : null);
        auditDetails.put("cancellationType", "OPTION_A_IMMEDIATE_RESET");

        auditLogService.recordAction(
                user.getId(),
                "SUBSCRIPTION_CANCELLED",
                "user_profiles",
                user.getId(),
                ip,
                userAgent,
                auditDetails
        );

        return getStatus(userIdentifier);
    }

    @Transactional(readOnly = true)
    public List<PaymentReceiptResponse> getUserPaymentHistory(String userIdentifier) {
        UserProfile user = getUser(userIdentifier);
        List<PaymentLog> logs = paymentLogRepository.findAllByUserIdOrderByCreatedAtDesc(user.getId());

        return logs.stream().map(p -> {
            String planName = getPlanDisplayName(p.getPlanId());
            Instant estimatedExpires = p.getCreatedAt() != null ? p.getCreatedAt().plus(30, ChronoUnit.DAYS) : null;
            return mapToReceipt(p, user, planName, estimatedExpires);
        }).collect(Collectors.toList());
    }

    private String getPayPalAccessToken() {
        try {
            String auth = paypalClientId + ":" + paypalClientSecret;
            String encodedAuth = Base64.getEncoder().encodeToString(auth.getBytes(StandardCharsets.UTF_8));

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api-m.sandbox.paypal.com/v1/oauth2/token"))
                    .header("Authorization", "Basic " + encodedAuth)
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(HttpRequest.BodyPublishers.ofString("grant_type=client_credentials"))
                    .timeout(Duration.ofSeconds(7))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                JsonNode root = objectMapper.readTree(response.body());
                return root.path("access_token").asText();
            } else {
                log.warn("PayPal Auth failed with status {}: {}", response.statusCode(), response.body());
            }
        } catch (Exception e) {
            log.warn("Error obtaining PayPal Sandbox access token: {}", e.getMessage());
        }
        return null;
    }

    private String createPayPalOrderOnSandbox(String accessToken, BigDecimal price, String planId, UserProfile user) {
        try {
            Map<String, Object> orderPayload = new HashMap<>();
            orderPayload.put("intent", "CAPTURE");

            Map<String, Object> amountMap = new HashMap<>();
            amountMap.put("currency_code", "USD");
            amountMap.put("value", price.setScale(2).toString());

            Map<String, Object> unit = new HashMap<>();
            unit.put("description", "Suscripción CASE Tool UML 30 Días - " + planId);
            unit.put("amount", amountMap);

            orderPayload.put("purchase_units", List.of(unit));

            String bodyJson = objectMapper.writeValueAsString(orderPayload);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api-m.sandbox.paypal.com/v2/checkout/orders"))
                    .header("Authorization", "Bearer " + accessToken)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(bodyJson))
                    .timeout(Duration.ofSeconds(7))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 201 || response.statusCode() == 200) {
                JsonNode root = objectMapper.readTree(response.body());
                return root.path("id").asText();
            }
        } catch (Exception e) {
            log.warn("Error creating order on PayPal Sandbox API: {}", e.getMessage());
        }
        return null;
    }

    private UserProfile getUser(String identifier) {
        return userProfileRepository.findByEmailIgnoreCase(identifier)
                .orElseGet(() -> userProfileRepository.findByUsernameIgnoreCase(identifier)
                        .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado con identificador: " + identifier)));
    }

    private String normalizePlanId(String planId) {
        if (planId == null) return "PLAN_PRO_ARCHITECT";
        String upper = planId.trim().toUpperCase();
        if (upper.equals("PRO_ARCHITECT") || upper.equals("PLAN_PRO_ARCHITECT")) {
            return "PLAN_PRO_ARCHITECT";
        }
        if (upper.equals("ENTERPRISE") || upper.equals("PLAN_ENTERPRISE_TEAM")) {
            return "PLAN_ENTERPRISE_TEAM";
        }
        return "PLAN_PRO_ARCHITECT";
    }

    private BigDecimal getPlanPrice(String planId) {
        if (planId.contains("ENTERPRISE")) {
            return new BigDecimal("29.99");
        }
        return new BigDecimal("9.99");
    }

    private String getPlanDisplayName(String planId) {
        if (planId == null) return "Community Free";
        String upper = planId.toUpperCase();
        if (upper.contains("ENTERPRISE")) return "Enterprise Team";
        if (upper.contains("PRO")) return "Pro Architect";
        return "Community Free";
    }

    private PaymentReceiptResponse mapToReceipt(PaymentLog p, UserProfile u, String planName, Instant expiresAt) {
        String invoiceNum = "INV-" + p.getCreatedAt().toString().substring(0, 10).replace("-", "") + "-" + p.getId().toString().substring(0, 6).toUpperCase();

        return PaymentReceiptResponse.builder()
                .id(p.getId())
                .invoiceNumber(invoiceNum)
                .paypalOrderId(p.getPaypalOrderId())
                .paypalPayerId(p.getPaypalPayerId())
                .planId(p.getPlanId())
                .planName(planName)
                .amount(p.getAmount())
                .currency(p.getCurrency())
                .paymentMethod(p.getPaymentMethod())
                .status(p.getStatus())
                .createdAt(p.getCreatedAt())
                .subscriptionExpiresAt(expiresAt)
                .userFullName(u.getFullName())
                .userEmail(u.getEmail())
                .username(u.getUsername())
                .build();
    }

    private List<SubscriptionPlanResponse> getDefaultPlans() {
        return List.of(
                SubscriptionPlanResponse.builder()
                        .id("PLAN_COMMUNITY_FREE")
                        .name("Community Free")
                        .priceMonthly(BigDecimal.ZERO)
                        .maxProjects(3)
                        .maxClassesPerProject(10)
                        .allowSpringBootGeneration(false)
                        .allowDdlGeneration(true)
                        .allowPostmanGeneration(false)
                        .allowXmiExport(false)
                        .allowVoiceCommands(false)
                        .allowPhotoOcr(false)
                        .allowRealtimeCollaboration(false)
                        .build(),
                SubscriptionPlanResponse.builder()
                        .id("PLAN_PRO_ARCHITECT")
                        .name("Pro Architect")
                        .priceMonthly(new BigDecimal("9.99"))
                        .maxProjects(50)
                        .maxClassesPerProject(100)
                        .allowSpringBootGeneration(true)
                        .allowDdlGeneration(true)
                        .allowPostmanGeneration(true)
                        .allowXmiExport(true)
                        .allowVoiceCommands(true)
                        .allowPhotoOcr(true)
                        .allowRealtimeCollaboration(false)
                        .build(),
                SubscriptionPlanResponse.builder()
                        .id("PLAN_ENTERPRISE_TEAM")
                        .name("Enterprise Team")
                        .priceMonthly(new BigDecimal("29.99"))
                        .maxProjects(9999)
                        .maxClassesPerProject(9999)
                        .allowSpringBootGeneration(true)
                        .allowDdlGeneration(true)
                        .allowPostmanGeneration(true)
                        .allowXmiExport(true)
                        .allowVoiceCommands(true)
                        .allowPhotoOcr(true)
                        .allowRealtimeCollaboration(true)
                        .build()
        );
    }
}
