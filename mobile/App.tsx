import React, { Component, ErrorInfo, ReactNode, useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, ActivityIndicator, Platform, StatusBar as NativeStatusBar, AppState } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { THEME } from './src/constants/theme';
import { apiConfig } from './src/config/apiConfig';
import { useMobileAuthStore } from './src/stores/authStore';
import { useMobileProjectStore } from './src/stores/projectStore';
import { useMobileCollabStore } from './src/stores/collabStore';
import { pushNotificationService } from './src/services/pushNotificationService';
import { mobileCollabWs } from './src/services/collabWsService';
import { LoginScreen } from './src/screens/LoginScreen';
import { ProjectsListScreen } from './src/screens/ProjectsListScreen';
import { DiagramViewerScreen } from './src/screens/DiagramViewerScreen';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class MobileErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, errorMessage: error?.message || 'Error inesperado de renderizado' };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('[MobileErrorBoundary] Error capturado en cliente móvil:', error, errorInfo);
  }

  handleReset = () => {
    useMobileCollabStore.getState().leaveSession();
    useMobileProjectStore.getState().resetDiagram();
    this.setState({ hasError: false, errorMessage: '' });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Visor Móvil Recuperado</Text>
          <Text style={styles.errorDesc}>
            Se produjo un conflicto visual temporal al renderizar el lienzo. El estado se ha protegido.
          </Text>
          <Text style={styles.errorDetail} numberOfLines={2}>
            {this.state.errorMessage}
          </Text>
          <TouchableOpacity style={styles.retryBtn} onPress={this.handleReset} activeOpacity={0.8}>
            <Text style={styles.retryBtnText}>Regresar a Mis Proyectos</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

function MainApp() {
  const { isAuthenticated, isLoading: isAuthLoading, initAuth } = useMobileAuthStore();
  const { currentProject, resetDiagram, openProject } = useMobileProjectStore();
  const { isLive, leaveSession, joinSession } = useMobileCollabStore();

  const [currentScreen, setCurrentScreen] = useState<'login' | 'projects' | 'viewer'>('login');

  useEffect(() => {
    // Inicializar configuración de IP, almacenamiento y autenticación volátil
    apiConfig.init().then(() => {
      initAuth();
      pushNotificationService.configureChannel();
      mobileCollabWs.connectGlobal();
    });

    // Listener para cuando el usuario pulsa sobre la notificación push (incluso con app cerrada o minimizada)
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(async (response) => {
      const data = response.notification.request.content.data;
      console.log('[App] Notificación push pulsada por el usuario:', data);

      if (data && typeof data === 'object') {
        const sessionCode = (data as any).sessionCode ? String((data as any).sessionCode) : null;
        const projectId = (data as any).projectId ? String((data as any).projectId) : null;

        // Asegurar que la configuración y autenticación estén listas antes de invocar la API
        await apiConfig.init();
        await useMobileAuthStore.getState().initAuth();

        const authState = useMobileAuthStore.getState();
        const user = authState.user;

        try {
          if (sessionCode) {
            const dni = user?.username || user?.email || 'COLAB-M';
            const fullName = user?.fullName || 'Observador Móvil';
            const ok = await joinSession(sessionCode, dni, fullName);
            if (ok) {
              setCurrentScreen('viewer');
            }
          } else if (projectId) {
            const ok = await openProject(projectId);
            if (ok) {
              setCurrentScreen('viewer');
            }
          }
        } catch (e) {
          console.warn('[App] Error manejando pulsación de notificación:', e);
        }
      }
    });

    return () => {
      responseSubscription.remove();
    };
  }, []);

  // Oyente de ciclo de vida del movil para reanudar WebSocket y sincronizar diagrama al volver de segundo plano
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        console.log('[App] Aplicacion reanudada en primer plano. Sincronizando estado y WebSocket...');
        mobileCollabWs.reconnectIfStale();
        const collab = useMobileCollabStore.getState();
        if (collab.isLive) {
          collab.syncCurrentRoomDiagram();
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (isLive || currentProject) {
      setCurrentScreen('viewer');
    } else if (isAuthenticated) {
      setCurrentScreen('projects');
    } else {
      setCurrentScreen('login');
    }
  }, [isAuthenticated, isLive, currentProject]);

  const handleBackFromViewer = () => {
    if (isLive) {
      leaveSession();
    }
    resetDiagram();
    if (isAuthenticated) {
      setCurrentScreen('projects');
    } else {
      setCurrentScreen('login');
    }
  };

  if (isAuthLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={THEME.colors.accentPrimary} />
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {currentScreen === 'login' && (
        <LoginScreen
          onLoginSuccess={() => setCurrentScreen('projects')}
        />
      )}

      {currentScreen === 'projects' && (
        <ProjectsListScreen
          onOpenDiagram={() => setCurrentScreen('viewer')}
        />
      )}

      {currentScreen === 'viewer' && (
        <DiagramViewerScreen
          onBack={handleBackFromViewer}
        />
      )}
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <MobileErrorBoundary>
      <MainApp />
    </MobileErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.bgDark,
    paddingTop: Platform.OS === 'android' ? Math.max(NativeStatusBar.currentHeight || 0, 52) : 0,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: THEME.colors.bgDark,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.colors.accentWarning,
    marginBottom: 8,
  },
  errorDesc: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 12,
  },
  errorDetail: {
    fontSize: 11,
    fontFamily: THEME.typography.fontFamilyMono,
    color: THEME.colors.textMuted,
    backgroundColor: THEME.colors.bgSurface,
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
    width: '100%',
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: THEME.colors.accentPrimary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
