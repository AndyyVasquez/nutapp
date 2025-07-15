// screens/TokenVerificationScreen.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

// Configuración del servidor - CORREGIDA
const SERVER_API_URL = 'https://nutweb.onrender.com/api'; // ✅ Agregado /api

type User = {
  id: string;
  correo?: string;
  correo_cli?: string;
  nombre?: string;
  userType?: string;
};

const TokenVerificationScreen = () => {
  const [hasToken, setHasToken] = useState<boolean | null>(null);
  const [token, setToken] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);

  React.useEffect(() => {
    loadUserData();
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

  const verifyToken = async () => {
    if (!token.trim()) {
      Alert.alert('Error', 'Por favor ingresa el token');
      return;
    }

    setLoading(true);
    try {
      // ✅ CORREGIDO: Agregado /api
      const response = await fetch(`${SERVER_API_URL}/verify-nutritionist-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: token.trim(),
          clientId: user?.id
        })
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert(
          '¡Token Válido!',
          `Te has vinculado exitosamente con ${data.nutritionist.name}`,
          [
            {
              text: 'Continuar',
              onPress: () => router.replace('./home') // ✅ CORREGIDO: Agregado ./
            }
          ]
        );
      } else {
        Alert.alert('Token Inválido', data.message || 'El token ingresado no es válido');
      }
    } catch (error) {
      console.error('Error verificando token:', error);
      Alert.alert('Error', 'No se pudo verificar el token. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // NUEVA FUNCIÓN: Iniciar pago con Mercado Pago
  const initiatePayment = async () => {
    if (!user) {
      Alert.alert('Error', 'No se encontraron datos del usuario');
      return;
    }

    setLoading(true);
    try {
      console.log('💳 Iniciando pago con Mercado Pago...');

      // ✅ CORREGIDO: URL consistente con /api
      const response = await fetch(`${SERVER_API_URL}/mercadopago/create-preference`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'Plan Cliente Mensual - Nutralis',
          price: 99.00,
          quantity: 1,
          currency_id: 'MXN',
          user_id: user.id,
          user_email: user.correo || user.correo_cli,
          plan_type: 'cliente'
        })
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ Preferencia creada:', data.preference_id);
        
        // Abrir Mercado Pago en el navegador
        const paymentUrl = data.init_point; // Para producción
        // const paymentUrl = data.sandbox_init_point; // Para pruebas
        
        const supported = await Linking.canOpenURL(paymentUrl);
        
        if (supported) {
          await Linking.openURL(paymentUrl);
          
          // Mostrar mensaje al usuario
          Alert.alert(
            'Pago en proceso',
            'Se abrió Mercado Pago en tu navegador. Una vez completado el pago, regresa a la app y reinicia sesión para ver los cambios.',
            [
              {
                text: 'Verificar Pago',
                onPress: () => checkPaymentStatus()
              },
              {
                text: 'Continuar',
                style: 'cancel'
              }
            ]
          );
        } else {
          Alert.alert('Error', 'No se puede abrir el enlace de pago');
        }

      } else {
        Alert.alert('Error', data.message || 'Error creando el pago');
      }

    } catch (error) {
      console.error('❌ Error iniciando pago:', error);
      Alert.alert('Error', 'No se pudo iniciar el pago. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const checkPaymentStatus = () => {
    Alert.alert(
      'Verificación de Pago',
      'Si completaste el pago exitosamente, cierra sesión y vuelve a iniciar para ver los cambios.',
      [
        {
          text: 'Cerrar Sesión',
          onPress: logout
        },
        {
          text: 'Continuar',
          style: 'cancel'
        }
      ]
    );
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('user');
      router.replace('./login'); // ✅ CORREGIDO: Agregado ./
    } catch (error) {
      console.error('Error cerrando sesión:', error);
    }
  };

  // FUNCIÓN ACTUALIZADA: Cambiar de PayPal a MercadoPago
  const goToMercadoPago = () => {
    initiatePayment();
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
        <Text style={styles.headerTitle}>Verificación de Acceso</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Icon name="shield-checkmark" size={60} color="#7A9B57" style={styles.mainIcon} />
          
          <Text style={styles.title}>¿Tienes Token de Nutriólogo?</Text>
          <Text style={styles.subtitle}>
            Si ya tienes un nutriólogo asignado, él te habrá proporcionado un token de vinculación
          </Text>

          {hasToken === null && (
            <View style={styles.optionsContainer}>
              <TouchableOpacity 
                style={[styles.optionButton, styles.yesButton]}
                onPress={() => setHasToken(true)}
              >
                <Icon name="checkmark-circle" size={24} color="white" />
                <Text style={styles.optionButtonText}>Sí, tengo token</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.optionButton, styles.noButton]}
                onPress={() => setHasToken(false)}
              >
                <Icon name="close-circle" size={24} color="white" />
                <Text style={styles.optionButtonText}>No tengo token</Text>
              </TouchableOpacity>
            </View>
          )}

          {hasToken === true && (
            <View style={styles.tokenContainer}>
              <Text style={styles.tokenLabel}>Ingresa tu token de vinculación:</Text>
              <TextInput
                style={styles.tokenInput}
                placeholder="Ej: NUT001ABC123"
                value={token}
                onChangeText={setToken}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              
              <View style={styles.tokenButtons}>
                <TouchableOpacity 
                  style={[styles.tokenButton, styles.cancelButton]}
                  onPress={() => setHasToken(null)}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.tokenButton, styles.verifyButton]}
                  onPress={verifyToken}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <Text style={styles.verifyButtonText}>Verificar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {hasToken === false && (
            <View style={styles.paymentContainer}>
              <Icon name="card" size={40} color="#CD853F" style={styles.paymentIcon} />
              <Text style={styles.paymentTitle}>Acceso Premium</Text>
              <Text style={styles.paymentDescription}>
                Para acceder a todas las funciones de la app necesitas suscribirte a nuestro plan premium
              </Text>
              
              <View style={styles.priceContainer}>
                <Text style={styles.priceText}>$99 MXN / mes</Text>
                <Text style={styles.priceSubtext}>Incluye acceso completo a la app</Text>
              </View>

              {/* BOTÓN ACTUALIZADO: De PayPal a Mercado Pago */}
              <TouchableOpacity 
                style={styles.mercadopagoButton}
                onPress={goToMercadoPago}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <Icon name="card" size={24} color="white" />
                    <Text style={styles.mercadopagoButtonText}>Pagar con Mercado Pago</Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.paymentMethods}>
                <Text style={styles.paymentMethodsText}>
                  💳 Aceptamos: Tarjetas de crédito, débito y transferencias
                </Text>
              </View>

              <TouchableOpacity 
                style={styles.backToOptionsButton}
                onPress={() => setHasToken(null)}
              >
                <Text style={styles.backToOptionsText}>← Volver a opciones</Text>
              </TouchableOpacity>
            </View>
          )}
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
  mainIcon: {
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
    marginBottom: 30,
    lineHeight: 22,
  },
  optionsContainer: {
    width: '100%',
    gap: 15,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 10,
  },
  yesButton: {
    backgroundColor: '#28a745',
  },
  noButton: {
    backgroundColor: '#dc3545',
  },
  optionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  tokenContainer: {
    width: '100%',
    alignItems: 'center',
  },
  tokenLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  tokenInput: {
    width: '100%',
    borderWidth: 2,
    borderColor: '#7A9B57',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  tokenButtons: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  tokenButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#6c757d',
  },
  cancelButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  verifyButton: {
    backgroundColor: '#7A9B57',
  },
  verifyButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  paymentContainer: {
    width: '100%',
    alignItems: 'center',
  },
  paymentIcon: {
    marginBottom: 15,
  },
  paymentTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  paymentDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  priceContainer: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 25,
    alignItems: 'center',
    width: '100%',
  },
  priceText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#CD853F',
  },
  priceSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  mercadopagoButton: {
    backgroundColor: '#00B5FF',
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
  mercadopagoButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  paymentMethods: {
    backgroundColor: '#f0f8ff',
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
    width: '100%',
  },
  paymentMethodsText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  backToOptionsButton: {
    paddingVertical: 10,
  },
  backToOptionsText: {
    color: '#7A9B57',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default TokenVerificationScreen;