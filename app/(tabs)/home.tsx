import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View
} from 'react-native';
import BottomNavbar from './navbar';

interface User {
  id: string;
  nombre: string;
  correo: string;
  userType: string;
}

const HomeScreen = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      
      if (!userData) {
        // No hay sesión, redirigir a login
        console.log('❌ No se encontró sesión activa, redirigiendo a login...');
        router.replace('/login');
        return;
      }

      const parsedUser = JSON.parse(userData);
      
      // Verificar que sea un cliente válido
      if (parsedUser.userType !== 'cliente') {
        console.log('❌ Usuario no es cliente, limpiando sesión...');
        await AsyncStorage.removeItem('user');
        router.replace('/login');
        return;
      }

      // Sesión válida
      console.log('✅ Sesión válida encontrada para:', parsedUser.nombre);
      setUser(parsedUser);
      
    } catch (error) {
      console.error('❌ Error verificando autenticación:', error);
      // En caso de error, limpiar y redirigir
      await AsyncStorage.removeItem('user');
      router.replace('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      console.log('🚪 Cerrando sesión...');
      await AsyncStorage.removeItem('user');
      router.replace('/login');
    } catch (error) {
      console.error('❌ Error al cerrar sesión:', error);
    }
  };

  // Mostrar loading mientras se verifica la autenticación
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor="#7A9B57" barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#7A9B57" size="large" />
          <Text style={styles.loadingText}>Cargando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Si no hay usuario después del loading, no mostrar nada 
  // (porque ya se redirigió a login)
  if (!user) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#7A9B57" barStyle="light-content" />
      
      <View style={styles.header}>
        <View style={styles.headerContent}>
         
         
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Calorías Diarias</Text>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Resumen de Hoy</Text>
          
          <View style={styles.caloriesContainer}>
            <Text style={styles.caloriesNumber}>350</Text>
            <Text style={styles.caloriesLabel}>de 2000 calorías</Text>
          </View>

          <Text style={styles.remainingCalories}>1650 calorías restantes</Text>
        </View>

      
      </View>

      <BottomNavbar activeTab="stats" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#7A9B57',
    paddingVertical: 25,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeContainer: {
    flex: 1,
  },
  welcomeText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  headerSubtext: {
    color: '#E8F5E8',
    fontSize: 14,
    fontWeight: '400',
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 30,
    textAlign: 'left',
  },
  summaryCard: {
    backgroundColor: '#F5F5DC',
    borderRadius: 12,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 20,
    textAlign: 'left',
  },
  caloriesContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  caloriesNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 5,
  },
  caloriesLabel: {
    fontSize: 16,
    color: '#666666',
  },
  remainingCalories: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginTop: 10,
  },
  userInfoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 20,
  },
  userInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 15,
  },
  userInfoText: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  loadingText: {
    color: '#7A9B57',
    fontSize: 16,
    marginTop: 15,
    textAlign: 'center',
  },
});

export default HomeScreen;