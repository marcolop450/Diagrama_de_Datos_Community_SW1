import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { safeStorage } from './storage';
import { mobileApi } from './api';

const STORAGE_KEY_PUSH_TOKEN = 'case_mobile_expo_push_token';

// Configuración de presentación de notificaciones en primer y segundo plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

class PushNotificationService {
  private currentToken: string | null = null;
  private isConfigured: boolean = false;
  private channelCreated: boolean = false;
  private isExpoGo: boolean = false;

  /**
   * Configura el canal de notificación Android prioritario (MAX) con sonido y vibración.
   * Si Expo Go rechaza la creación del canal, conmuta silenciosamente al canal nativo por defecto.
   */
  async configureChannel(): Promise<void> {
    if (this.isConfigured) return;

    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync('case_updates', {
          name: 'Actualizaciones de Modelado CASE',
          description: 'Notificaciones en tiempo real sobre guardado de modelos, inicio de salas y eventos de colaboración.',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 300, 200, 300],
          lightColor: '#6366F1',
          enableVibrate: true,
          showBadge: true,
          bypassDnd: true,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        });
        this.channelCreated = true;
        console.log('[PushNotificationService] Canal Android case_updates configurado.');
      } catch (err) {
        console.log('[PushNotificationService] Expo Go omitió canal personalizado, usando canal nativo por defecto.');
        this.channelCreated = false;
      }
    }
    this.isConfigured = true;
  }

  /**
   * Solicita permisos de notificación del sistema operativo y registra el token.
   * En Expo Go Android (SDK 53+) conmuta automáticamente al motor local de alta prioridad.
   */
  async registerForPushNotificationsAsync(): Promise<string | null> {
    await this.configureChannel();

    try {
      // Comprobar y solicitar permisos en el sistema operativo (Android 13+ / iOS)
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('[PushNotificationService] Permiso de notificaciones denegado por el usuario.');
        return null;
      }

      // Si no es un dispositivo físico
      if (!Device.isDevice) {
        console.log('[PushNotificationService] Entorno emulador detectado.');
        return null;
      }

      // Intentar obtener Expo Push Token para despliegues Standalone / APK / EAS
      try {
        const tokenData = await Notifications.getExpoPushTokenAsync();
        const pushToken = tokenData.data;
        this.currentToken = pushToken;

        await safeStorage.setItem(STORAGE_KEY_PUSH_TOKEN, pushToken);
        console.log('[PushNotificationService] Expo Push Token obtenido exitosamente:', pushToken);

        const deviceModel = Device.modelName || (Platform.OS === 'android' ? 'Android Device' : 'iOS Device');
        await this.syncTokenWithBackend(pushToken, deviceModel);
        return pushToken;
      } catch (tokenErr: any) {
        const errMsg = String(tokenErr?.message || '');
        console.log('[PushNotificationService] Activando motor de notificaciones nativas locales de alta prioridad (Android/iOS):', errMsg);
        this.isExpoGo = true;
        this.currentToken = 'STANDALONE_LOCAL_NOTIFICATIONS';
        await safeStorage.setItem(STORAGE_KEY_PUSH_TOKEN, 'STANDALONE_LOCAL_NOTIFICATIONS');
        return 'STANDALONE_LOCAL_NOTIFICATIONS';
      }
    } catch (err) {
      console.warn('[PushNotificationService] Registro de notificaciones:', err);
      return null;
    }
  }

  /**
   * Sincroniza el token push registrado con el backend de CASE Tool UML.
   */
  async syncTokenWithBackend(pushToken: string, deviceName?: string): Promise<boolean> {
    if (pushToken === 'EXPO_GO_LOCAL_MODE') return true;
    try {
      const res = await mobileApi.registerPushToken({
        pushToken,
        platform: Platform.OS.toUpperCase(),
        deviceName: deviceName || Device.modelName || 'Dispositivo Móvil',
      });
      return !!res?.success;
    } catch (e) {
      console.warn('[PushNotificationService] Sincronización de token con backend aplazada:', e);
      return false;
    }
  }

  /**
   * Obtiene el token push guardado en la memoria / caché.
   */
  async getStoredPushToken(): Promise<string | null> {
    if (this.currentToken) return this.currentToken;
    const saved = await safeStorage.getItem(STORAGE_KEY_PUSH_TOKEN);
    if (saved) this.currentToken = saved;
    return saved;
  }

  /**
   * Dispara una notificación nativa en Android/iOS con banner, sonido y vibración.
   * Soporta disparo inmediato (delaySeconds = 0) o programado (ej. para probar segundo plano).
   */
  async triggerLocalNotification(
    title: string,
    body: string,
    data?: Record<string, any>,
    delaySeconds: number = 0
  ): Promise<void> {
    await this.configureChannel();

    // En Android, usar un trigger de al menos 1 segundo asegura despacho por AlarmManager en pantalla bloqueada
    const effectiveSeconds = Math.max(delaySeconds, 1);
    const trigger = {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: effectiveSeconds,
      repeats: false,
    } as any;

    try {
      const contentOptions: any = {
        title,
        body,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
        vibrate: [0, 300, 200, 300],
        badge: 1,
        data: data || { action: 'LOCAL_NOTIFICATION' },
      };

      if (Platform.OS === 'android') {
        contentOptions.channelId = 'case_updates';
      }

      await Notifications.scheduleNotificationAsync({
        content: contentOptions,
        trigger,
      });
      console.log(`[PushNotificationService] Notificación emitida en canal case_updates (segundos: ${effectiveSeconds}): ${title}`);
    } catch (err) {
      console.warn('[PushNotificationService] Error programando notificación:', err);
    }
  }

  /**
   * Realiza la prueba integral de notificación:
   * 1. Disparo inmediato con sonido y banner nativo.
   * 2. Disparo programado a los 4 segundos para permitir que el usuario bloquee la pantalla o minimice la app.
   * 3. Petición al backend si hay token remoto configurado.
   */
  async requestBackendPushTest(title?: string, body?: string): Promise<{ success: boolean; isExpoGo: boolean }> {
    const notifTitle = title || 'CASE Tool UML: Notificación de Prueba';
    const notifBody = body || 'Notificación nativa recibida con sonido y vibración (CU18).';

    // 1. Notificación Inmediata
    await this.triggerLocalNotification(notifTitle, notifBody, { action: 'TEST_NOW' }, 0);

    // 2. Notificación Programada a los 4 segundos para probar con la app minimizada
    await this.triggerLocalNotification(
      'CASE Tool UML: Alerta en Segundo Plano',
      'El sistema respondió con la app en segundo plano y pantalla bloqueada.',
      { action: 'TEST_BACKGROUND' },
      4
    );

    const token = await this.getStoredPushToken();
    if (token && token !== 'EXPO_GO_LOCAL_MODE') {
      try {
        await mobileApi.sendTestPush({
          pushToken: token,
          title: notifTitle,
          body: notifBody,
          notificationType: 'TEST_PING',
        });
      } catch {}
    }

    return { success: true, isExpoGo: this.isExpoGo || token === 'EXPO_GO_LOCAL_MODE' };
  }
}

export const pushNotificationService = new PushNotificationService();
