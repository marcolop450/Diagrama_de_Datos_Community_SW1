import React, { useEffect, useState } from 'react';
import { StyleSheet, View, SafeAreaView, ActivityIndicator, Platform, StatusBar as NativeStatusBar } from 'react-native';
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

export default function App() {
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
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      console.log('[App] Notificación push pulsada por el usuario:', data);

      if (data && typeof data === 'object') {
        const sessionCode = (data as any).sessionCode ? String((data as any).sessionCode) : null;
        const projectId = (data as any).projectId ? String((data as any).projectId) : null;

        if (sessionCode) {
          joinSession(sessionCode, 'GUEST', 'Observador Push').then(() => {
            setCurrentScreen('viewer');
          }).catch(() => {});
        } else if (projectId) {
          openProject(projectId).then(() => {
            setCurrentScreen('viewer');
          }).catch(() => {});
        }
      }
    });

    return () => {
      responseSubscription.remove();
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
});
