package com.sw1.casetool.dto.notification;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PushTestRequest {
    private String pushToken;
    private String title;
    private String body;
    private PushNotificationType notificationType;
}
