import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView, 
  ActivityIndicator,
  Modal
} from 'react-native';
import { 
  Layers, 
  Lock, 
  Mail, 
  ArrowRight, 
  ShieldCheck,
  Settings2,
  CheckCircle2,
  X
} from 'lucide-react-native';
import { THEME } from '../constants/theme';
import { useMobileAuthStore } from '../stores/authStore';
import { apiConfig } from '../config/apiConfig';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const { login, isLoading, error, clearError } = useMobileAuthStore();

  const [email, setEmail] = useState('marcolop450@gmail.com');
  const [password, setPassword] = useState('Password123!');
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [hostInput, setHostInput] = useState(apiConfig.getHost());

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) return;
    const ok = await login(email.trim(), password.trim());
    if (ok) {
      onLoginSuccess();
    }
  };

  const handleSaveHost = async () => {
    if (hostInput.trim()) {
      await apiConfig.setHost(hostInput.trim());
      setIsConfigOpen(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Barra superior con botón de configuración de host backend */}
        <View style={styles.topToolbar}>
          <TouchableOpacity
            style={styles.settingsBtn}
            onPress={() => {
              setHostInput(apiConfig.getHost());
              setIsConfigOpen(true);
            }}
            activeOpacity={0.7}
          >
            <Settings2 size={18} color={THEME.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Encabezado Corporativo */}
        <View style={styles.headerArea}>
          <View style={styles.logoBadge}>
            <Layers size={32} color={THEME.colors.accentPrimary} />
          </View>
          <Text style={styles.appTitle}>CASE Tool UML</Text>
          <Text style={styles.appSubtitle}>
            Visor Periférico Móvil • Supervisión y Lectura en Vivo
          </Text>
        </View>

        {/* Formulario de Inicio de Sesión */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Acceso con Cuenta</Text>
          <Text style={styles.cardDesc}>
            Inicia sesión con tu rol de Arquitecto o Colaborador para consultar tus modelos.
          </Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <View style={styles.inputWrapper}>
              <Mail size={16} color={THEME.colors.textMuted} />
              <TextInput
                style={styles.textInput}
                value={email}
                onChangeText={(t) => {
                  clearError();
                  setEmail(t);
                }}
                placeholder="correo@ejemplo.com"
                placeholderTextColor={THEME.colors.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputWrapper}>
              <Lock size={16} color={THEME.colors.textMuted} />
              <TextInput
                style={styles.textInput}
                value={password}
                onChangeText={(t) => {
                  clearError();
                  setPassword(t);
                }}
                placeholder="Contraseña"
                placeholderTextColor={THEME.colors.textMuted}
                secureTextEntry
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <>
                <Text style={styles.primaryBtnText}>Iniciar Sesión</Text>
                <ArrowRight size={16} color="#ffffff" />
              </>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.securityNote}>
          <ShieldCheck size={12} color={THEME.colors.textMuted} /> Modo Lectura Estricto • Arquitectura PUDS Ciclo 5
        </Text>
      </ScrollView>

      {/* Modal de Configuración de Host / IP Backend */}
      <Modal visible={isConfigOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Servidor Backend</Text>
              <TouchableOpacity onPress={() => setIsConfigOpen(false)}>
                <X size={20} color={THEME.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              Host y puerto de la API Spring Boot (WiFi o USB adb reverse):
            </Text>

            <TextInput
              style={styles.modalInput}
              value={hostInput}
              onChangeText={setHostInput}
              placeholder="marcolop-sw1-case.duckdns.org"
              placeholderTextColor={THEME.colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.quickHostRow}>
              <TouchableOpacity
                style={styles.quickHostChip}
                onPress={() => setHostInput('marcolop-sw1-case.duckdns.org')}
              >
                <Text style={styles.quickHostText}>Nube (DuckDNS)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickHostChip}
                onPress={() => setHostInput('192.168.1.10:8080')}
              >
                <Text style={styles.quickHostText}>WiFi Local</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickHostChip}
                onPress={() => setHostInput('localhost:8080')}
              >
                <Text style={styles.quickHostText}>USB</Text>
              </TouchableOpacity>
            </View>

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
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.bgDark,
  },
  scrollContent: {
    padding: THEME.spacing.lg,
    paddingTop: 30,
  },
  topToolbar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 10,
  },
  settingsBtn: {
    width: 38,
    height: 38,
    borderRadius: THEME.borderRadius.md,
    backgroundColor: THEME.colors.bgCard,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerArea: {
    alignItems: 'center',
    marginBottom: THEME.spacing.xl,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: THEME.borderRadius.lg,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  appTitle: {
    fontSize: THEME.typography.fontSizeTitle,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  appSubtitle: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  card: {
    backgroundColor: THEME.colors.bgCard,
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.lg,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
    marginBottom: THEME.spacing.md,
  },
  cardTitle: {
    fontSize: THEME.typography.fontSizeLg,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginBottom: THEME.spacing.md,
    lineHeight: 18,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: THEME.borderRadius.md,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    color: THEME.colors.accentDanger,
    fontSize: 12,
    fontWeight: '600',
  },
  inputGroup: {
    gap: 12,
    marginBottom: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.bgSurface,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
    paddingHorizontal: 12,
    height: 48,
    gap: 10,
  },
  textInput: {
    flex: 1,
    color: THEME.colors.textPrimary,
    fontSize: 14,
  },
  primaryBtn: {
    height: 48,
    backgroundColor: THEME.colors.accentPrimary,
    borderRadius: THEME.borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  liveHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  codeTextInput: {
    fontFamily: THEME.typography.fontFamilyMono,
    fontWeight: '700',
    letterSpacing: 2,
    textAlign: 'center',
  },
  guestBtn: {
    height: 48,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    borderRadius: THEME.borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  guestBtnText: {
    color: THEME.colors.accentSuccess,
    fontSize: 14,
    fontWeight: '700',
  },
  disabledBtn: {
    opacity: 0.5,
  },
  securityNote: {
    textAlign: 'center',
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: THEME.spacing.lg,
  },
  modalCard: {
    backgroundColor: THEME.colors.bgCard,
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.lg,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  modalDesc: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  modalInput: {
    height: 44,
    backgroundColor: THEME.colors.bgSurface,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
    paddingHorizontal: 12,
    color: THEME.colors.textPrimary,
    fontSize: 13,
    fontFamily: THEME.typography.fontFamilyMono,
    marginBottom: 10,
  },
  quickHostRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  quickHostChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: THEME.colors.bgSurface,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
  },
  quickHostText: {
    fontSize: 11,
    color: THEME.colors.accentPrimaryLight,
  },
  modalActions: {
    alignItems: 'flex-end',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.colors.accentPrimary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: THEME.borderRadius.md,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
});
