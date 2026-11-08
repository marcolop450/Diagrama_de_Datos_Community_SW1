import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Modal, 
  TextInput,
  ActivityIndicator
} from 'react-native';
import { 
  Radio, 
  LogOut, 
  ChevronLeft, 
  Settings2, 
  Layers, 
  CheckCircle2, 
  X,
  Bell,
  Send,
  Smartphone,
  MessageSquare
} from 'lucide-react-native';
import { THEME } from '../../constants/theme';
import { useMobileAuthStore } from '../../stores/authStore';
import { useMobileCollabStore } from '../../stores/collabStore';
import { useMobileProjectStore } from '../../stores/projectStore';
import { apiConfig } from '../../config/apiConfig';
import { pushNotificationService } from '../../services/pushNotificationService';

interface HeaderBarProps {
  title?: string;
  subtitle?: string;
  canGoBack?: boolean;
  onBack?: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  title = 'CASE Tool UML',
  subtitle,
  canGoBack = false,
  onBack,
}) => {
  const { user, logout } = useMobileAuthStore();
  const { isLive, sessionCode, leaveSession, toggleChat, unreadChatCount } = useMobileCollabStore();

  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [hostInput, setHostInput] = useState(apiConfig.getHost());
  const [pushStatusMessage, setPushStatusMessage] = useState<string | null>(null);
  const [isTestingPush, setIsTestingPush] = useState(false);
  const [devicePushToken, setDevicePushToken] = useState<string | null>(null);

  useEffect(() => {
    if (isConfigOpen) {
      pushNotificationService.getStoredPushToken().then(t => setDevicePushToken(t));
      setPushStatusMessage(null);
    }
  }, [isConfigOpen]);

  const handleSaveHost = async () => {
    if (hostInput.trim()) {
      await apiConfig.setHost(hostInput.trim());
      setIsConfigOpen(false);
    }
  };

  const handleTestPush = async () => {
    try {
      setIsTestingPush(true);
      setPushStatusMessage('Transmitiendo alertas (inmediata y programada a 4s)...');
      await pushNotificationService.requestBackendPushTest(
        'CASE Tool UML: Prueba Inmediata',
        'Notificación del sistema Android recibida con sonido y vibración.'
      );
      setPushStatusMessage('Alerta emitida. Minimiza la app o bloquea la pantalla ahora para ver la segunda alerta en segundo plano.');
    } catch {
      setPushStatusMessage('Error al emitir la notificación.');
    } finally {
      setIsTestingPush(false);
    }
  };

  const handleLogout = async () => {
    leaveSession();
    useMobileProjectStore.getState().resetDiagram();
    await logout();
  };

  return (
    <View style={styles.container}>
      <View style={styles.leftRow}>
        {canGoBack && onBack ? (
          <TouchableOpacity onPress={onBack} style={styles.iconBtn} activeOpacity={0.7}>
            <ChevronLeft size={20} color={THEME.colors.textPrimary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.brandIcon}>
            <Layers size={18} color={THEME.colors.accentPrimary} />
          </View>
        )}

        <View style={styles.titleCol}>
          <Text style={styles.titleText} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitleText} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : user ? (
            <Text style={styles.subtitleText} numberOfLines={1}>
              {user.fullName} • {user.role}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.rightRow}>
        {isLive && (
          <TouchableOpacity
            style={styles.chatHeaderBtn}
            onPress={toggleChat}
            activeOpacity={0.7}
          >
            <MessageSquare size={18} color={THEME.colors.accentPrimaryLight} />
            {unreadChatCount > 0 && (
              <View style={styles.unreadHeaderBadge}>
                <Text style={styles.unreadHeaderBadgeText}>
                  {unreadChatCount > 9 ? '9+' : unreadChatCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {isLive && sessionCode && (
          <TouchableOpacity
            style={styles.livePill}
            onPress={leaveSession}
            activeOpacity={0.8}
          >
            <View style={styles.pulsingDot} />
            <Text style={styles.liveText}>{sessionCode}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={() => setIsConfigOpen(true)}
          style={styles.iconBtn}
          activeOpacity={0.7}
        >
          <Settings2 size={18} color={THEME.colors.textSecondary} />
        </TouchableOpacity>

        {user && (
          <TouchableOpacity onPress={handleLogout} style={styles.iconBtn} activeOpacity={0.7}>
            <LogOut size={18} color={THEME.colors.accentDanger} />
          </TouchableOpacity>
        )}
      </View>

      {/* Modal de Configuración de Host / IP LAN para Celular Físico */}
      <Modal visible={isConfigOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Configurar Servidor Backend</Text>
              <TouchableOpacity onPress={() => setIsConfigOpen(false)}>
                <X size={20} color={THEME.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              Ingresa la dirección IP de tu computadora para que la app se conecte a Spring Boot desde tu teléfono físico:
            </Text>

            <TextInput
              style={styles.input}
              value={hostInput}
              onChangeText={setHostInput}
              placeholder="192.168.1.10:8080"
              placeholderTextColor={THEME.colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveHost}
                activeOpacity={0.8}
              >
                <CheckCircle2 size={16} color="#ffffff" />
                <Text style={styles.saveBtnText}>Guardar Conexión</Text>
              </TouchableOpacity>
            </View>

            {/* Apartado de Notificaciones Push CU18 */}
            <View style={styles.pushSection}>
              <View style={styles.pushHeaderRow}>
                <Bell size={16} color={THEME.colors.accentPrimary} />
                <Text style={styles.pushTitle}>Notificaciones Push (CU18)</Text>
              </View>
              <Text style={styles.pushDesc}>
                Valida la recepción de alertas remotas con sonido y vibración en segundo plano o con la pantalla bloqueada:
              </Text>

              {devicePushToken ? (
                <View style={styles.tokenPill}>
                  <Smartphone size={12} color={THEME.colors.textMuted} />
                  <Text style={styles.tokenText} numberOfLines={1}>
                    {devicePushToken === 'EXPO_GO_LOCAL_MODE'
                      ? 'Modo: Expo Go (Canal Local Android Max)'
                      : `Token: ${devicePushToken.substring(0, 22)}...`}
                  </Text>
                </View>
              ) : null}

              {pushStatusMessage ? (
                <View style={styles.pushStatusBox}>
                  <Text style={styles.pushStatusText}>{pushStatusMessage}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={styles.pushTestBtn}
                onPress={handleTestPush}
                disabled={isTestingPush}
                activeOpacity={0.8}
              >
                {isTestingPush ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Send size={14} color="#ffffff" />
                    <Text style={styles.pushTestBtnText}>Enviar Notificación de Prueba</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 56,
    backgroundColor: THEME.colors.bgSurface,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderSubtle,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.md,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spacing.sm,
    flex: 1,
  },
  brandIcon: {
    width: 32,
    height: 32,
    borderRadius: THEME.borderRadius.md,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: THEME.borderRadius.md,
    backgroundColor: THEME.colors.bgCard,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleCol: {
    flex: 1,
  },
  titleText: {
    fontSize: THEME.typography.fontSizeMd,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  subtitleText: {
    fontSize: THEME.typography.fontSizeXs,
    color: THEME.colors.textSecondary,
    fontFamily: THEME.typography.fontFamilyMono,
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spacing.sm,
  },
  chatHeaderBtn: {
    position: 'relative',
    width: 34,
    height: 34,
    borderRadius: THEME.borderRadius.md,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadHeaderBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: THEME.colors.accentDanger,
    borderRadius: 8,
    minWidth: 15,
    height: 15,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  unreadHeaderBadgeText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '800',
    fontFamily: THEME.typography.fontFamilyMono,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.full,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  pulsingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.accentSuccess,
  },
  liveText: {
    fontSize: THEME.typography.fontSizeXs,
    fontWeight: '700',
    color: THEME.colors.accentSuccess,
    fontFamily: THEME.typography.fontFamilyMono,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: THEME.spacing.lg,
  },
  modalCard: {
    width: '100%',
    backgroundColor: THEME.colors.bgCard,
    borderRadius: THEME.borderRadius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
    padding: THEME.spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.sm,
  },
  modalTitle: {
    fontSize: THEME.typography.fontSizeMd,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  modalDesc: {
    fontSize: THEME.typography.fontSizeSm,
    color: THEME.colors.textSecondary,
    marginBottom: THEME.spacing.md,
    lineHeight: 18,
  },
  input: {
    backgroundColor: THEME.colors.bgDark,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
    borderRadius: THEME.borderRadius.md,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: 10,
    color: THEME.colors.textPrimary,
    fontFamily: THEME.typography.fontFamilyMono,
    fontSize: THEME.typography.fontSizeSm,
    marginBottom: THEME.spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.colors.accentPrimary,
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: 10,
    borderRadius: THEME.borderRadius.md,
  },
  saveBtnText: {
    fontSize: THEME.typography.fontSizeSm,
    fontWeight: '600',
    color: '#ffffff',
  },
  pushSection: {
    marginTop: THEME.spacing.lg,
    paddingTop: THEME.spacing.md,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borderSubtle,
  },
  pushHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  pushTitle: {
    fontSize: THEME.typography.fontSizeSm,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  pushDesc: {
    fontSize: THEME.typography.fontSizeXs,
    color: THEME.colors.textSecondary,
    lineHeight: 16,
    marginBottom: THEME.spacing.sm,
  },
  tokenPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.colors.bgDark,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.sm,
    marginBottom: THEME.spacing.sm,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  tokenText: {
    fontSize: 10,
    fontFamily: THEME.typography.fontFamilyMono,
    color: THEME.colors.textMuted,
    flex: 1,
  },
  pushStatusBox: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    borderRadius: THEME.borderRadius.sm,
    padding: 8,
    marginBottom: THEME.spacing.sm,
  },
  pushStatusText: {
    fontSize: 11,
    color: THEME.colors.accentPrimary,
    lineHeight: 15,
  },
  pushTestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4F46E5',
    paddingVertical: 10,
    borderRadius: THEME.borderRadius.md,
  },
  pushTestBtnText: {
    fontSize: THEME.typography.fontSizeSm,
    fontWeight: '600',
    color: '#ffffff',
  },
});
