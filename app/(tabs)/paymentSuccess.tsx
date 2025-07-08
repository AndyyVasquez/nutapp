// screens/PaymentSuccessScreen.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const SERVER_API_URL = 'http://192.168.1.73:3001'; // Cambia por tu IP

const PaymentSuccessScreen = () => {
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    console.log('🎉 PaymentSuccessScreen cargado');
    console.log('📄 Parámetros recibidos:', params);
    
    processPaymentSuccess();
  }, []);

  const processPaymentSuccess = async () => {
    try {
      setLoading(true);
      
      // Obtener token de los parámetros o de AsyncStorage
      let accessToken = params.token as string;
      let successMessage = params.message as string || 'Token autorizado';
      
      if (!accessToken) {
        // Intentar obtener de AsyncStorage si no viene en parámetros
        accessToken = (await AsyncStorage.getItem('accessToken')) || '';
      }

      if (!accessToken) {
        // Si aún no hay token, intentar procesar orden pendiente
        console.log('🔄 No se encontró token, procesando orden pendiente...');
        await handlePendingOrder();
        return;
      }

      console.log('🎫 Token encontrado:', accessToken);
      
      // Obtener datos del usuario
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        console.log('👤 Usuario:', parsedUser.nombre);
      }

      setToken(accessToken);
      setMessage(successMessage);
      
    } catch (error) {
      console.error('❌ Error procesando éxito de pago:', error);
      Alert.alert(
        'Error',
        'Hubo un problema procesando tu pago. Por favor contacta soporte.',
        [
          {
            text: 'Volver',
            onPress: () => router.back()
          }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePendingOrder = async () => {
    try {
      const orderId = await AsyncStorage.getItem('currentOrderId');
      if (!orderId) {
        throw new Error('No se encontró orden pendiente');
      }

      console.log('💰 Procesando orden pendiente:', orderId);

      const response = await fetch(`${SERVER_API_URL}/api/paypal/capture-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Guardar token y datos
        await AsyncStorage.setItem('accessToken', data.data.accessToken);
        await AsyncStorage.setItem('tokenExpires', data.data.tokenExpires);
        
        // Actualizar usuario
        const userData = await AsyncStorage.getItem('user');
        if (userData) {
          const parsedUser = JSON.parse(userData);
          const updatedUser = { ...parsedUser, tiene_acceso: true, token_acceso: data.data.accessToken };
          await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
          setUser(updatedUser);
        }

        // Limpiar orden pendiente
        await AsyncStorage.removeItem('currentOrderId');

        setToken(data.data.accessToken);
        setMessage('Token autorizado');
        
        console.log('✅ Pago procesado exitosamente');
        
      } else {
        throw new Error(data.message || 'Error procesando el pago');
      }

    } catch (error) {
      console.error('❌ Error procesando orden pendiente:', error);
      throw error;
    }
  };

  const copyToClipboard = async () => {
    if (!token) return;
    
    try {
      await Clipboard.setStringAsync(token);
      Alert.alert('✅ Copiado', 'Token copiado al portapapeles');
    } catch (error) {
      console.error('Error copiando token:', error);
      Alert.alert('Error', 'No se pudo copiar el token');
    }
  };

  const goToHome = () => {
    console.log('🏠 Navegando a home...');
    router.replace('/home');
  };

  const verifyToken = async () => {
    if (!token || !user) return;

    try {
      setLoading(true);
      
      const response = await fetch(`${SERVER_API_URL}/api/verify-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token,
          userId: user.id
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        Alert.alert(
          '✅ Token Válido',
          `Tu token es válido y expira el: ${new Date(data.expires).toLocaleDateString()}`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('❌ Token Inválido', data.message);
      }
      
    } catch (error) {
      console.error('Error verificando token:', error);
      Alert.alert('Error', 'No se pudo verificar el token');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor="#7A9B57" barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#7A9B57" size="large" />
          <Text style={styles.loadingText}>Procesando tu pago...</Text>
          <Text style={styles.loadingSubText}>Por favor espera...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!token) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor="#7A9B57" barStyle="light-content" />
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={60} color="#dc3545" />
          <Text style={styles.errorTitle}>Error procesando pago</Text>
          <Text style={styles.errorMessage}>
            No se pudo obtener el token de acceso. Por favor contacta soporte.
          </Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#7A9B57" barStyle="light-content" />
      
      <View style={styles.content}>
        <View style={styles.successCard}>
          <Icon name="checkmark-circle" size={80} color="#28a745" style={styles.successIcon} />
          
          <Text style={styles.successTitle}>¡Pago Exitoso!</Text>
          <Text style={styles.successSubtitle}>{message}</Text>
          
          {user && (
            <Text style={styles.userInfo}>
              Bienvenido, {user.nombre}
            </Text>
          )}
          
          <View style={styles.tokenCard}>
            <Text style={styles.tokenTitle}>Tu Token de Acceso</Text>
            <TouchableOpacity 
              style={styles.tokenContainer}
              onPress={copyToClipboard}
            >
              <Text style={styles.tokenText} numberOfLines={3}>
                {token}
              </Text>
              <View style={styles.copyIconContainer}>
                <Icon name="copy" size={20} color="#28a745" />
                <Text style={styles.copyHint}>Toca para copiar</Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.verifyButton}
              onPress={verifyToken}
            >
              <Icon name="shield-checkmark" size={16} color="white" />
              <Text style={styles.verifyButtonText}>Verificar Token</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.infoSection}>
            <Icon name="information-circle" size={20} color="#6c757d" />
            <Text style={styles.infoText}>
              Tu suscripción ha sido activada. Ahora tienes acceso completo a todas las funciones de Nutralis.
            </Text>
          </View>
          
          <TouchableOpacity style={styles.continueButton} onPress={goToHome}>
            <Icon name="home" size={20} color="white" />
            <Text style={styles.continueButtonText}>Ir a la App</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#7A9B57',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#7A9B57',
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
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#dc3545',
    marginTop: 20,
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
  successCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  successIcon: {
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
    marginBottom: 10,
    textAlign: 'center',
  },
  userInfo: {
    fontSize: 14,
    color: '#7A9B57',
    marginBottom: 30,
    fontWeight: '500',
  },
  tokenCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 20,
    marginBottom: 25,
    width: '100%',
    borderWidth: 1,
    borderColor: '#28a745',
  },
  tokenTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  tokenContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  tokenText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
    fontFamily: 'monospace',
    lineHeight: 20,
  },
  copyIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  copyHint: {
    fontSize: 12,
    color: '#28a745',
    fontStyle: 'italic',
  },
  verifyButton: {
    backgroundColor: '#6c757d',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  verifyButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#e3f2fd',
    padding: 15,
    borderRadius: 10,
    marginBottom: 25,
    gap: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    lineHeight: 20,
  },
  continueButton: {
    backgroundColor: '#7A9B57',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 40,
    width: '100%',
    gap: 10,
  },
  continueButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default PaymentSuccessScreen;