import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  XCircle, 
  X 
} from 'lucide-react-native';
import { THEME } from '../../constants/theme';
import { useMobileCollabStore } from '../../stores/collabStore';

export const NotificationToastContainer: React.FC = () => {
  const { notifications, removeNotification } = useMobileCollabStore();

  if (notifications.length === 0) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      {notifications.map((notif) => {
        const isSuccess = notif.type === 'success';
        const isWarning = notif.type === 'warning';
        const isAlert = notif.type === 'alert';

        const borderColor = isSuccess
          ? THEME.colors.accentSuccess
          : isWarning
          ? THEME.colors.accentWarning
          : isAlert
          ? THEME.colors.accentDanger
          : THEME.colors.accentInfo;

        const iconColor = borderColor;

        return (
          <View
            key={notif.id}
            style={[styles.toastCard, { borderLeftColor: borderColor }]}
          >
            <View style={styles.iconCol}>
              {isSuccess && <CheckCircle2 size={16} color={iconColor} />}
              {isWarning && <AlertTriangle size={16} color={iconColor} />}
              {isAlert && <XCircle size={16} color={iconColor} />}
              {!isSuccess && !isWarning && !isAlert && <Info size={16} color={iconColor} />}
            </View>

            <View style={styles.textCol}>
              <Text style={styles.toastTitle}>{notif.title}</Text>
              <Text style={styles.toastMsg} numberOfLines={2}>
                {notif.message}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => removeNotification(notif.id)}
              style={styles.closeBtn}
            >
              <X size={14} color={THEME.colors.textMuted} />
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 64,
    left: THEME.spacing.md,
    right: THEME.spacing.md,
    zIndex: 999,
    gap: THEME.spacing.sm,
  },
  toastCard: {
    backgroundColor: '#161922ee',
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
    borderLeftWidth: 4,
    borderRadius: THEME.borderRadius.md,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  iconCol: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
  },
  toastTitle: {
    fontSize: THEME.typography.fontSizeXs,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  toastMsg: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 2,
    lineHeight: 15,
  },
  closeBtn: {
    padding: 4,
  },
});
