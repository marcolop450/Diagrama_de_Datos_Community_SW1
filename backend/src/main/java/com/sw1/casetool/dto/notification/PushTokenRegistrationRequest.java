package com.sw1.casetool.dto.notification;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PushTokenRegistrationRequest {
    private String pushToken;
    private String deviceType; // "android" | "ios"
    private String deviceName;
}
