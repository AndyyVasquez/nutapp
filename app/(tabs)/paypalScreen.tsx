// screens/PayPalPaymentScreen.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const SERVER_API_URL = 'http://10.13.9.202:3001';

type User = {
  id: string;
  correo: string;
  nombre: string;
  tiene_acceso?: boolean;
};

const PayPalPaymentScreen = () => {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    loadUserData();
    
    // Configurar listener para deep links
    const handleDeepLink = async (url: string) => {
      console.log('🔗 Deep link recibido:', url);
      
      if (url.includes('success') || url.includes('approved')) {
        console.log('✅ Usuario regresó de PayPal - procesando pago...');
        // Pequeño delay para asegurar que PayPal completó el proceso
        setTimeout(() => {
          router.push('./paymentSuccess');
        }, 1000);
      } else if (url.includes('cancel')) {
        console.log('❌ Usuario canceló el pago');
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

    return () => subscription?.remove();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Error cargando datos del usuario:', error);
    }
  };

  const handlePayPalPayment = async () => {
    try {
      setLoading(true);
      
      if (!user) {
        Alert.alert('Error', 'No se encontraron datos del usuario');
        return;
      }

      console.log('💳 Iniciando pago PayPal...');

      // Verificar conectividad del servidor primero
      try {
        console.log('🔍 Verificando servidor...');
        const healthCheck = await fetch(`${SERVER_API_URL}/health`, {
          method: 'GET',
        });
        
        if (!healthCheck.ok) {
          throw new Error(`Servidor respondió con estado: ${healthCheck.status}`);
        }
        console.log('✅ Servidor disponible');
      } catch (healthError) {
        console.error('❌ Error de conectividad:', healthError);
        Alert.alert(
          'Error de Conexión',
          'No se puede conectar al servidor. Verifica que esté ejecutándose en ' + SERVER_API_URL
        );
        return;
      }

      // Probar configuración de PayPal
      try {
        console.log('🔍 Verificando PayPal...');
        const debugResponse = await fetch(`${SERVER_API_URL}/api/paypal/debug`);
        const debugData = await debugResponse.json();
        
        if (!debugData.success) {
          throw new Error(debugData.message);
        }
        console.log('✅ PayPal configurado correctamente');
      } catch (paypalError) {
        console.error('❌ Error de PayPal:', paypalError);
        Alert.alert(
          'Error de Configuración',
          'PayPal no está configurado correctamente en el servidor: ' + ((paypalError instanceof Error) ? paypalError.message : String(paypalError))
        );
        return;
      }

      // Crear orden de pago
      console.log('📤 Creando orden de pago...');
      const response = await fetch(`${SERVER_API_URL}/api/paypal/create-order`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          userId: user.id,
          amount: 99.00,
          currency: 'MXN',
          description: 'Suscripción Premium Nutralis'
        })
      });

      console.log('📊 Status de respuesta:', response.status);
      console.log('📄 Content-Type:', response.headers.get('content-type'));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error del servidor:', errorText);
        throw new Error(`Error del servidor (${response.status}): ${errorText.substring(0, 100)}`);
      }

      // Verificar que la respuesta sea JSON
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        const htmlContent = await response.text();
        console.error('❌ Respuesta no es JSON:', htmlContent.substring(0, 200));
        throw new Error('El servidor devolvió HTML en lugar de JSON');
      }

      const data = await response.json();
      console.log('📄 Respuesta crear orden:', data);

      if (data.success) {
        console.log('✅ Orden creada:', data.orderId);
        
        // Guardar ID de orden para capturar después
        await AsyncStorage.setItem('currentOrderId', data.orderId);
        
        console.log('🌐 Abriendo PayPal:', data.approvalUrl);

        Alert.alert(
          'Redirigiendo a PayPal',
          'Se abrirá PayPal para completar tu pago. Después del pago, regresa a la app.',
          [
            { text: 'Cancelar', style: 'cancel', onPress: () => setLoading(false) },
            { 
              text: 'Continuar', 
              onPress: async () => {
                try {
                  const canOpen = await Linking.canOpenURL(data.approvalUrl);
                  if (canOpen) {
                    await Linking.openURL(data.approvalUrl);
                  } else {
                    throw new Error('No se puede abrir PayPal');
                  }
                } catch (linkError) {
                  console.error('Error abriendo PayPal:', linkError);
                  const errorMsg = linkError instanceof Error ? linkError.message : String(linkError);
                  Alert.alert('Error', 'No se pudo abrir PayPal: ' + errorMsg);
                  setLoading(false);
                }
              }
            }
          ]
        );
        
      } else {
        throw new Error(data.message || 'No se pudo crear la orden de pago');
      }

    } catch (error) {
      console.error('❌ Error en pago:', error);
      
      let errorMessage = 'Error desconocido';

      if (error instanceof Error) {
        if (error.message.includes('Network request failed')) {
          errorMessage = 'Error de red. Verifica tu conexión a internet.';
        } else if (error.message.includes('JSON')) {
          errorMessage = 'Error de comunicación con el servidor.';
        } else if (error.message.includes('fetch')) {
          errorMessage = 'No se pudo conectar al servidor.';
        } else {
          errorMessage = error.message;
        }
      } else {
        errorMessage = String(error);
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const checkPaymentStatus = async () => {
    try {
      const orderId = await AsyncStorage.getItem('currentOrderId');
      if (!orderId) {
        Alert.alert('Error', 'No hay orden pendiente');
        return;
      }

      Alert.alert(
        '¿Completaste el pago?',
        'Si ya pagaste en PayPal, presiona "Sí" para verificar.',
        [
          { text: 'No', style: 'cancel' },
          { 
            text: 'Sí', 
            onPress: () => {
              router.push('./paymentSuccess');
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const goBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#7A9B57" barStyle="light-content" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#F5F5DC" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pago PayPal</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Icon name="logo-paypal" size={80} color="#0070ba" style={styles.paypalIcon} />
          
          <Text style={styles.title}>Suscripción Premium</Text>
          <Text style={styles.subtitle}>
            Acceso completo a todas las funciones de Nutralis
          </Text>

          <View style={styles.featuresContainer}>
            <View style={styles.feature}>
              <Icon name="checkmark-circle" size={20} color="#28a745" />
              <Text style={styles.featureText}>Seguimiento nutricional completo</Text>
            </View>
            <View style={styles.feature}>
              <Icon name="checkmark-circle" size={20} color="#28a745" />
              <Text style={styles.featureText}>Base de datos de alimentos</Text>
            </View>
            <View style={styles.feature}>
              <Icon name="checkmark-circle" size={20} color="#28a745" />
              <Text style={styles.featureText}>Registro de actividad física</Text>
            </View>
            <View style={styles.feature}>
              <Icon name="checkmark-circle" size={20} color="#28a745" />
              <Text style={styles.featureText}>Análisis de progreso</Text>
            </View>
          </View>

          <View style={styles.priceContainer}>
            <Text style={styles.priceText}>$99 MXN</Text>
            <Text style={styles.priceSubtext}>por mes</Text>
          </View>

          <TouchableOpacity 
            style={[styles.payButton, loading && styles.disabledButton]}
            onPress={handlePayPalPayment}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <Icon name="logo-paypal" size={24} color="white" />
                <Text style={styles.payButtonText}>Pagar con PayPal</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Botón adicional para verificar pago manualmente */}
          <TouchableOpacity 
            style={styles.checkButton}
            onPress={checkPaymentStatus}
          >
            <Text style={styles.checkButtonText}>Ya pagué - Verificar</Text>
          </TouchableOpacity>

          <Text style={styles.securityText}>
            🔒 Pago seguro procesado por PayPal
          </Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F5F5DC',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  card: {
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
  paypalIcon: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 25,
  },
  featuresContainer: {
    width: '100%',
    marginBottom: 25,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  featureText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  priceContainer: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 15,
    marginBottom: 25,
    alignItems: 'center',
    width: '100%',
  },
  priceText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#0070ba',
  },
  priceSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  payButton: {
    backgroundColor: '#0070ba',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    marginBottom: 15,
    gap: 10,
    width: '100%',
  },
  payButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  checkButton: {
    backgroundColor: '#28a745',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginBottom: 15,
    width: '100%',
    alignItems: 'center',
  },
  checkButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  securityText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});

export default PayPalPaymentScreen;