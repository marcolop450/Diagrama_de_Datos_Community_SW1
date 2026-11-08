import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { 
  Eye, 
  Radio, 
  Layers, 
  GitFork, 
  ShieldCheck,
  MessageSquare
} from 'lucide-react-native';
import { THEME } from '../constants/theme';
import { HeaderBar } from '../components/common/HeaderBar';
import { CanvasSvgViewer } from '../components/canvas/CanvasSvgViewer';
import { ClassDetailSheet } from '../components/sheets/ClassDetailSheet';
import { MobileLiveChatSheet } from '../components/chat/MobileLiveChatSheet';
import { NotificationToastContainer } from '../components/common/NotificationToast';
import { useMobileProjectStore } from '../stores/projectStore';
import { useMobileCollabStore } from '../stores/collabStore';

interface DiagramViewerScreenProps {
  onBack: () => void;
}

export const DiagramViewerScreen: React.FC<DiagramViewerScreenProps> = ({ onBack }) => {
  const { currentProject, nodes, edges, selectedClass, selectClass } = useMobileProjectStore();
  const { isLive, sessionCode, toggleChat, unreadChatCount } = useMobileCollabStore();

  const title = currentProject?.name || (isLive ? `Sala en Vivo ${sessionCode}` : 'Lienzo UML');
  const subtitle = `v${currentProject?.version || '1.0.0'} • ${nodes.length} Clases • ${edges.length} Relaciones`;

  return (
    <View style={styles.container}>
      <HeaderBar
        title={title}
        subtitle={subtitle}
        canGoBack
        onBack={onBack}
      />

      {/* Alertas Flotantes de Actualización en Tiempo Real */}
      <NotificationToastContainer />

      {/* Barra de Estado del Visor (Modo Lectura) */}
      <View style={styles.statusBar}>
        <View style={styles.statusLeft}>
          <Eye size={13} color={THEME.colors.accentPrimaryLight} />
          <Text style={styles.statusText}>Modo Lectura e Inspección Táctil</Text>
        </View>

        <View style={styles.statusRight}>
          {isLive ? (
            <View style={styles.liveIndicator}>
              <Radio size={12} color={THEME.colors.accentSuccess} />
              <Text style={styles.liveStatusText}>Espejo en Tiempo Real</Text>
            </View>
          ) : (
            <Text style={styles.offlineStatusText}>Consulta Local (Estático)</Text>
          )}
        </View>
      </View>

      {/* Lienzo Táctil SVG */}
      <View style={styles.canvasWrapper}>
        <CanvasSvgViewer />
      </View>

      {/* Botón Flotante para Chat en Vivo de Sala */}
      {isLive && (
        <TouchableOpacity
          onPress={toggleChat}
          style={styles.floatingChatBtn}
          activeOpacity={0.8}
        >
          <View style={styles.chatIconWrapper}>
            <MessageSquare size={18} color="#FFFFFF" />
            {unreadChatCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>
                  {unreadChatCount > 9 ? '9+' : unreadChatCount}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.floatingChatText}>Chat en Vivo</Text>
        </TouchableOpacity>
      )}

      {/* Ficha Técnica Deslizante al Tocar una Clase */}
      <ClassDetailSheet
        classData={selectedClass}
        onClose={() => selectClass(null)}
      />

      {/* Sheet de Chat en Vivo y Asistencia @ai */}
      <MobileLiveChatSheet />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.bgDark,
  },
  statusBar: {
    height: 32,
    backgroundColor: THEME.colors.bgSurface,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderSubtle,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.md,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.accentPrimaryLight,
  },
  statusRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  liveStatusText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.accentSuccess,
    fontFamily: THEME.typography.fontFamilyMono,
  },
  offlineStatusText: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    fontFamily: THEME.typography.fontFamilyMono,
  },
  canvasWrapper: {
    flex: 1,
  },
  floatingChatBtn: {
    position: 'absolute',
    bottom: Platform.OS === 'android' ? 96 : 32,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 24,
    backgroundColor: THEME.colors.accentPrimary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#ffffff30',
  },
  chatIconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadge: {
    position: 'absolute',
    top: -6,
    right: -8,
    backgroundColor: THEME.colors.accentDanger,
    borderRadius: 9,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    fontFamily: THEME.typography.fontFamilyMono,
  },
  floatingChatText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
