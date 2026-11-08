package com.sw1.casetool.service.security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

@Slf4j
@Service
public class AesEncryptionService {

    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int TAG_LENGTH_BIT = 128;
    private static final int IV_LENGTH_BYTE = 12;

    private final SecretKey secretKey;
    private final SecureRandom secureRandom = new SecureRandom();

    public AesEncryptionService(
            @Value("${ai.encryption.secret:${AI_ENCRYPTION_SECRET:SW1-UML-CASE-TOOL-PROJ-AI-AES256-KEY-SECRET}}") String secret
    ) {
        try {
            MessageDigest sha = MessageDigest.getInstance("SHA-256");
            byte[] keyBytes = sha.digest(secret.getBytes(StandardCharsets.UTF_8));
            this.secretKey = new SecretKeySpec(keyBytes, "AES");
        } catch (Exception e) {
            throw new IllegalStateException("Error inicializando AES Key para cifrado de credenciales", e);
        }
    }

    public String encrypt(String plainText) {
        if (plainText == null || plainText.isBlank()) return null;
        try {
            byte[] iv = new byte[IV_LENGTH_BYTE];
            secureRandom.nextBytes(iv);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            GCMParameterSpec parameterSpec = new GCMParameterSpec(TAG_LENGTH_BIT, iv);
            cipher.init(Cipher.ENCRYPT_MODE, secretKey, parameterSpec);

            byte[] cipherText = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));

            byte[] combined = new byte[iv.length + cipherText.length];
            System.arraycopy(iv, 0, combined, 0, iv.length);
            System.arraycopy(cipherText, 0, combined, iv.length, cipherText.length);

            return Base64.getEncoder().encodeToString(combined);
        } catch (Exception e) {
            log.error("Error cifrando credencial de IA: {}", e.getMessage());
            throw new RuntimeException("No se pudo cifrar la clave de API", e);
        }
    }

    public String decrypt(String encryptedText) {
        if (encryptedText == null || encryptedText.isBlank()) return null;
        try {
            byte[] decoded = Base64.getDecoder().decode(encryptedText);
            if (decoded.length < IV_LENGTH_BYTE) {
                throw new IllegalArgumentException("Texto cifrado inválido");
            }

            byte[] iv = new byte[IV_LENGTH_BYTE];
            System.arraycopy(decoded, 0, iv, 0, IV_LENGTH_BYTE);

            byte[] cipherText = new byte[decoded.length - IV_LENGTH_BYTE];
            System.arraycopy(decoded, IV_LENGTH_BYTE, cipherText, 0, cipherText.length);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            GCMParameterSpec parameterSpec = new GCMParameterSpec(TAG_LENGTH_BIT, iv);
            cipher.init(Cipher.DECRYPT_MODE, secretKey, parameterSpec);

            byte[] plainTextBytes = cipher.doFinal(cipherText);
            return new String(plainTextBytes, StandardCharsets.UTF_8);
        } catch (Exception e) {
            log.error("Error descifrando credencial de IA: {}", e.getMessage());
            throw new RuntimeException("No se pudo descifrar la clave de API", e);
        }
    }

    /**
     * Enmascara una API Key para visualización segura en frontend (ej. gsk_••••••••1234).
     */
    public String maskApiKey(String rawKey) {
        if (rawKey == null || rawKey.isBlank()) return "";
        int len = rawKey.length();
        if (len <= 8) return "••••••••";
        String prefix = rawKey.substring(0, Math.min(4, len));
        String suffix = rawKey.substring(Math.max(0, len - 4));
        return prefix + "••••••••" + suffix;
    }
}
