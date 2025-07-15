// PaymentScreen.js - Pantalla de pagos en React Native
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

const API_URL = 'https://nutweb.onrender.com';

type User = {
  id: string;
  nombre: string;
  correo?: string;
  correo_cli?: string;
  userType?: string;
  tiene_acceso?: boolean;
};

const PaymentScreen = () => {
  const [user, setUser] = useState<User | null>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);

  useEffect(() => {
    loadUserData();
    loadPlans();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Error cargando usuario:', error);
    }
  };

  const loadPlans = async () => {
    try {
      const response = await fetch(`${API_URL}/mercadopago/plans`);
      const data = await response.json();
      
      if (data.success) {
        setPlans(data.plans);
      }
    } catch (error) {
      console.error('Error cargando planes:', error);
      Alert.alert('Error', 'No se pudieron cargar los planes');
    }
  };

  const initiatePayment = async (plan : any) => {
    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión para realizar un pago');
      return;
    }

    setLoading(true);
    setSelectedPlan(plan);

    try {
      console.log('💳 Iniciando pago para plan:', plan.name);

      // Crear preferencia de pago
      const response = await fetch(`${API_URL}/mercadopago/create-preference`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: plan.name,
          price: plan.price,
          quantity: 1,
          currency_id: plan.currency,
          user_id: user.id,
          user_email: user.correo || user.correo_cli,
          plan_type: user.userType || 'cliente'
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
            'Se abrió Mercado Pago en tu navegador. Una vez completado el pago, regresa a la app.',
            [
              {
                text: 'Verificar Pago',
                onPress: () => checkPaymentStatus(data.preference_id)
              },
              {
                text: 'Cancelar',
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
      setSelectedPlan(null);
    }
  };

  const checkPaymentStatus = async (preferenceId : any) => {
    try {
      console.log('🔍 Verificando estado del pago...');
      
      // Aquí podrías implementar lógica para verificar el pago
      // Por ahora, simplemente recargar los datos del usuario
      Alert.alert(
        'Verificación de Pago',
        'Si completaste el pago, cierra sesión y vuelve a iniciar para ver los cambios.',
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

    } catch (error) {
      console.error('Error verificando pago:', error);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('user');
      // Navegar a login
      // navigation.replace('Login');
    } catch (error) {
      console.error('Error cerrando sesión:', error);
    }
  };

  const renderPlan = (plan : any) => {
    const isLoading = loading && selectedPlan?.id === plan.id;
    const userNeedsThisPlan = user?.userType === 'cliente' && plan.id.includes('cliente') ||
                              user?.userType === 'nutriologo' && plan.id.includes('nutriologo');

    return (
      <View key={plan.id} style={styles.planCard}>
        <Text style={styles.planName}>{plan.name}</Text>
        <Text style={styles.planDescription}>{plan.description}</Text>
        
        <View style={styles.priceContainer}>
          <Text style={styles.price}>${plan.price}</Text>
          <Text style={styles.currency}>{plan.currency}</Text>
          <Text style={styles.duration}>/ {plan.duration}</Text>
        </View>

        <View style={styles.featuresContainer}>
          {plan.features.map((feature : any, index: any) => (
            <Text key={index} style={styles.feature}>• {feature}</Text>
          ))}
        </View>

        <TouchableOpacity
          style={[
            styles.payButton,
            !userNeedsThisPlan && styles.disabledButton,
            isLoading && styles.loadingButton
          ]}
          onPress={() => initiatePayment(plan)}
          disabled={!userNeedsThisPlan || isLoading}
        >
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.payButtonText}>Procesando...</Text>
            </View>
          ) : (
            <Text style={styles.payButtonText}>
              {userNeedsThisPlan ? 'Pagar Ahora' : 'No Disponible'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Planes de Suscripción</Text>
        <Text style={styles.subtitle}>
          Elige el plan que mejor se adapte a tus necesidades
        </Text>
      </View>

      {user && (
        <View style={styles.userInfo}>
          <Text style={styles.userText}>
            Usuario: {user.nombre} ({user.userType})
          </Text>
          <Text style={styles.accessText}>
            Acceso: {user.tiene_acceso ? '✅ Activo' : '❌ Inactivo'}
          </Text>
        </View>
      )}

      <View style={styles.plansContainer}>
        {plans.map(renderPlan)}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Pagos seguros procesados por Mercado Pago
        </Text>
        <Text style={styles.footerSubtext}>
          Aceptamos tarjetas de crédito, débito y transferencias
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#7A9B57',
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#f0f0f0',
    textAlign: 'center',
  },
  userInfo: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    elevation: 2,
  },
  userText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  accessText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  plansContainer: {
    padding: 16,
  },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  planName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  planDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  price: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#7A9B57',
  },
  currency: {
    fontSize: 16,
    color: '#666',
    marginLeft: 4,
  },
  duration: {
    fontSize: 14,
    color: '#999',
    marginLeft: 4,
  },
  featuresContainer: {
    marginBottom: 20,
  },
  feature: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
    lineHeight: 18,
  },
  payButton: {
    backgroundColor: '#7A9B57',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  loadingButton: {
    backgroundColor: '#5a7a42',
  },
  payButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  footerSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
});

export default PaymentScreen;