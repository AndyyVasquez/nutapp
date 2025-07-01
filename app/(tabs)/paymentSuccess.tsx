import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface PayPalPaymentProps {
  userId: string;
  userEmail?: string;
  onPaymentSuccess?: (data: any) => void;
  onPaymentError?: (error: string) => void;
}

type PaymentStatus = 'processing' | 'creating' | 'pending' | 'cancelled' | 'error' | null;

const PayPalPayment: React.FC<PayPalPaymentProps> = ({ userId, userEmail, onPaymentSuccess, onPaymentError }) => {
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(null);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);

  const API_URL = 'http://10.13.9.202:3001'; // Cambia por tu URL del servidor

  // Planes de pago disponibles
  const paymentPlans = [
    {
      id: 'cliente_mensual',
      name: 'Plan Cliente Mensual',
      price: 9.99,
      description: 'Acceso completo por 1 mes',
      duration: '1 mes'
    },
    {
      id: 'cliente_anual',
      name: 'Plan Cliente Anual',
      price: 99.99,
      description: 'Acceso completo por 1 año (2 meses gratis)',
      duration: '1 año',
      popular: true
    },
    {
      id: 'nutriologo_mensual',
      name: 'Plan Nutriólogo Mensual',
      price: 29.99,
      description: 'Herramientas profesionales por 1 mes',
      duration: '1 mes'
    },
    {
      id: 'nutriologo_anual',
      name: 'Plan Nutriólogo Anual',
      price: 299.99,
      description: 'Herramientas profesionales por 1 año',
      duration: '1 año'
    }
  ];

  useEffect(() => {
    // Configurar listener para deep links
    const handleDeepLink = async (url: any) => {
      console.log('🔗 Deep link recibido:', url);
      
      if (url.includes('success') || url.includes('approved')) {
        console.log('✅ Usuario regresó de PayPal - procesando pago...');
        await processPaymentSuccess();
      } else if (url.includes('cancel')) {
        console.log('❌ Usuario canceló el pago');
        setPaymentStatus('cancelled');
        Alert.alert('Pago Cancelado', 'El pago fue cancelado por el usuario.');
        setLoading(false);
      }
    };

    // Listener para cuando la app está abierta
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    // Verificar si la app se abrió con un deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    // Verificar si hay una orden pendiente al cargar el componente
    checkPendingOrder();

    return () => {
      if (subscription && typeof subscription.remove === 'function') {
        subscription.remove();
      }
    };
  }, []);

  const checkPendingOrder = async () => {
    try {
      const savedOrderId = await AsyncStorage.getItem('currentOrderId');
      if (savedOrderId) {
        setCurrentOrderId(savedOrderId);
        console.log('📋 Orden pendiente encontrada:', savedOrderId);
      }
    } catch (error) {
      console.error('Error verificando orden pendiente:', error);
    }
  };

  // Agrega la función processPaymentSuccess para manejar el éxito del pago
  const processPaymentSuccess = async () => {
    try {
      setLoading(true);
      setPaymentStatus('processing');
      setError(null);

      // Recupera el ID de la orden guardada
      const orderId = currentOrderId || (await AsyncStorage.getItem('currentOrderId'));
      if (!orderId) {
        throw new Error('No se encontró una orden pendiente.');
      }

      // Llama a la API para capturar el pago
      const response = await fetch(`${API_URL}/api/paypal/capture-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId }),
      });

      const data = await response.json();
      console.log('💰 Respuesta de captura:', data);

      if (data.success) {
        setPaymentData(data.data);
        setToken(data.data.accessToken);

        // Actualizar el usuario con acceso
        const userData = await AsyncStorage.getItem('user');
        if (userData) {
          const user = JSON.parse(userData);
          const updatedUser = { ...user, tiene_acceso: true };
          await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
        }

        await AsyncStorage.setItem('accessToken', data.data.accessToken);
        await AsyncStorage.setItem('tokenExpires', data.data.tokenExpires);
        await AsyncStorage.removeItem('currentOrderId');

        console.log('✅ Pago procesado exitosamente');
        console.log('🎫 Token generado:', data.data.accessToken);

        if (onPaymentSuccess) {
          onPaymentSuccess(data.data);
        }

      } else {
        throw new Error(data.message || 'Error procesando el pago');
      }

    } catch (error) {
      console.error('❌ Error procesando pago:', error);

      if (onPaymentError) {
        onPaymentError(error instanceof Error ? error.message : String(error));
      }

      // Errores específicos
      if (
        typeof error === 'object' &&
        error !== null &&
        'name' in error &&
        'message' in error &&
        typeof (error as any).name === 'string' &&
        typeof (error as any).message === 'string'
      ) {
        if ((error as any).name === 'TypeError' && (error as any).message.includes('Network request failed')) {
          setError('Error de red. Verifica tu conexión a internet.');
        } else if ((error as any).name === 'AbortError') {
          setError('La petición tardó demasiado. Intenta de nuevo.');
        } else if ((error as any).message.includes('JSON Parse error')) {
          setError('El servidor devolvió una respuesta inválida. Contacta soporte.');
        } else {
          setError(`Error de conexión: ${(error as any).message}`);
        }
      } else {
        setError('Ocurrió un error desconocido.');
      }
    } finally {
      setLoading(false);
    }
  };

  const createPayPalOrder = async (plan:any) => {
    try {
      setLoading(true);
      setPaymentStatus('creating');

      console.log('💳 Creando orden PayPal para plan:', plan.name);

      // Verificar conectividad del servidor con timeout manual
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      let healthCheck;
      try {
        healthCheck = await fetch(`${API_URL}/health`, {
          method: 'GET',
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (!healthCheck.ok) {
        throw new Error('Servidor no disponible');
      }

      // Crear orden en PayPal
      const response = await fetch(`${API_URL}/api/paypal/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          amount: plan.price,
          currency: 'USD',
          description: `${plan.name} - Nutralis`
        }),
      });

      const data = await response.json();
      console.log('📄 Respuesta crear orden:', data);

      if (data.success) {
        // Guardar ID de orden para capturar después
        await AsyncStorage.setItem('currentOrderId', data.orderId);
        setCurrentOrderId(data.orderId);
        setPaymentStatus('pending');

        console.log('✅ Orden creada:', data.orderId);
        console.log('🌐 Abriendo PayPal:', data.approvalUrl);

        // Abrir PayPal en el navegador
        const canOpen = await Linking.canOpenURL(data.approvalUrl);
        if (canOpen) {
          await Linking.openURL(data.approvalUrl);
        } else {
          throw new Error('No se puede abrir PayPal');
        }

      } else {
        throw new Error(data.message || 'Error creando orden de pago');
      }

    } catch (error) {
      console.error('❌ Error creando orden:', error);
      setPaymentStatus('error');
      setLoading(false);
      
      if (onPaymentError) {
        onPaymentError(error instanceof Error ? error.message : String(error));
      }
      
      Alert.alert(
        'Error',
        `Error al crear orden de pago: ${error && typeof error === 'object' && 'message' in error ? (error as any).message : String(error)}`,
        [{ text: 'OK', onPress: () => setPaymentStatus(null) }]
      );
    }
  };



  const copyToClipboard = (text : any) => {
    Clipboard.setString(text);
    Alert.alert('✅ Copiado', 'Token copiado al portapapeles');
  };

  const goToHome = () => {
    router.replace('/home');
  };

  const retryPayment = async () => {
    setError(null);
    setLoading(true);
    await processPaymentSuccess();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#0070ba" size="large" />
        <Text style={styles.loadingText}>Procesando pago...</Text>
        <Text style={styles.loadingSubText}>Por favor espera...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>❌</Text>
        <Text style={styles.errorTitle}>Error en el Pago</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        
        <TouchableOpacity style={styles.retryButton} onPress={retryPayment}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (paymentData && paymentData.accessToken) {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.successIcon}>🎉</Text>
        <Text style={styles.successTitle}>¡Pago Exitoso!</Text>
        <Text style={styles.successSubtitle}>Tu suscripción ha sido activada</Text>
        
        <View style={styles.tokenCard}>
          <Text style={styles.tokenTitle}>Tu Token de Acceso</Text>
          <TouchableOpacity 
            style={styles.tokenContainer}
            onPress={() => copyToClipboard(paymentData.accessToken)}
          >
            <Text style={styles.tokenText}>{paymentData.accessToken}</Text>
            <Text style={styles.copyHint}>Toca para copiar</Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity style={styles.continueButton} onPress={goToHome}>
          <Text style={styles.continueButtonText}>Continuar a la App</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Configurando tu acceso...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 20,
    textAlign: 'center',
  },
  loadingSubText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 40,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: '#0070ba',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: '#6c757d',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  successIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#28a745',
    marginBottom: 8,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
    textAlign: 'center',
  },
  tokenCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tokenTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  tokenContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    borderWidth: 1,
    borderColor: '#28a745',
  },
  tokenText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 5,
    fontFamily: 'monospace',
  },
  copyHint: {
    fontSize: 12,
    color: '#28a745',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  continueButton: {
    backgroundColor: '#7A9B57',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 40,
    width: '100%',
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
});
