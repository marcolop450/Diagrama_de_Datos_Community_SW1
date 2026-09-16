package com.sw1.casetool.dto.collab;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CollabMessageDto {

    public enum Type {
        JOIN,
        LEAVE,
        NODE_MOVE,
        NODE_UPDATE,
        NODE_CREATE,
        NODE_DELETE,
        EDGE_CREATE,
        EDGE_UPDATE,
        EDGE_DELETE,
        CURSOR,
        LOCK,
        UNLOCK,
        SESSION_ENDED,
        SYNC_STATE,
        SAVE_SYNC,
        KICK,
        CHAT,
        ROLE_CHANGED,
        STANDBY_STATE
    }

    private Type type;
    private UUID senderId;
    private String senderName;
    private String senderColor;
    private String sessionCode;
    private Object payload;
    private long timestamp;
}
