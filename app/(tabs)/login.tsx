import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';


const API_URL = 'https://nutweb.onrender.com';

    //ipconfig


const LoginScreen = () => {
  const [formData, setFormData] = useState({
    correo: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // Verificar si ya hay una sesión activa al cargar la pantalla
  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        // Solo redirigir si es un cliente válido
        if (user.userType === 'cliente') {
          console.log('✅ Sesión existente encontrada, redirigiendo...');
          router.replace('/home');
          return;
        } else {
          // Si no es cliente, limpiar la sesión
          await AsyncStorage.removeItem('user');
        }
      }
    } catch (error) {
      console.error('Error verificando sesión:', error);
      // En caso de error, limpiar cualquier dato corrupto
      await AsyncStorage.removeItem('user');
    } finally {
      setCheckingSession(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleLogin = async () => {
    // Validaciones básicas
    if (!formData.correo.trim()) {
      Alert.alert('Error', 'Por favor ingresa tu correo electrónico');
      return;
    }

    if (!formData.password.trim()) {
      Alert.alert('Error', 'Por favor ingresa tu contraseña');
      return;
    }

    // Validar formato de email básico
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.correo)) {
      Alert.alert('Error', 'Por favor ingresa un correo electrónico válido');
      return;
    }

    setLoading(true);
    
    try {
      console.log('🔐 Intentando login con:', formData.correo);
      console.log('🌐 URL:', `${API_URL}/api/login`);
      console.log('📱 Platform:', Platform.OS);
      
      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          correo: formData.correo, 
          password: formData.password 
        })
      });

      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📋 Respuesta del servidor:', data);

      if (data.success) {
        // Verificar que sea un cliente
        if (data.user.userType !== 'cliente') {
          Alert.alert(
            'Acceso Restringido', 
            'Esta aplicación es solo para clientes. Usa la versión web para acceder como nutriólogo o administrador.'
          );
          return;
        }

        // Guardar datos del usuario
        await AsyncStorage.setItem('user', JSON.stringify(data.user));
        
        Alert.alert(
          '¡Bienvenido!', 
          `Hola ${data.user.nombre}`,
          [
            {
              text: 'Continuar',
              onPress: () => router.replace('/home')
            }
          ]
        );
        
      } else {
        Alert.alert('Error de Login', data.message);
      }
    } catch (error) {
      console.error('❌ Error en login:', error);
      
      let errorMessage = 'Error de conexión desconocido';
      let errorMsg = '';

      if (typeof error === 'object' && error !== null && 'message' in error && typeof (error as any).message === 'string') {
        errorMsg = (error as any).message;
      } else {
        errorMsg = String(error);
      }
      
      if (errorMsg.includes('Network request failed')) {
        errorMessage = `No se puede conectar al servidor.\n\n🔧 Verificar:\n• Servidor corriendo en ${API_URL}\n• IP correcta para tu dispositivo\n• WiFi/conexión a internet`;
      } else if (errorMsg.includes('Failed to fetch')) {
        errorMessage = `Error de red al conectar.\n\n🔧 Soluciones:\n• Cambiar URL a localhost si usas Expo Web\n• Verificar IP local si usas dispositivo físico\n• Revisar CORS en el servidor`;
      } else if (errorMsg.includes('HTTP')) {
        errorMessage = `Error del servidor: ${errorMsg}`;
      } else {
        errorMessage = `Error: ${errorMsg}`;
      }
      
      Alert.alert('Error de Conexión', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRegistro = () => {
    router.push('./registro');
  };

  // Función para probar conexión con el servidor
  const testConnection = async () => {
    try {
      console.log('🔍 Probando conexión a:', `${API_URL}/api/test`);
      
      const response = await fetch(`${API_URL}/api/test`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📡 Status:', response.status);
      const data = await response.json();
      console.log('📋 Respuesta:', data);
      
      if (data.success) {
        Alert.alert('✅ Conexión Exitosa', `Servidor funcionando correctamente\n\nURL: ${API_URL}`);
      } else {
        Alert.alert('⚠️ Respuesta inesperada', JSON.stringify(data));
      }
    } catch (error) {
      console.error('❌ Error de conexión:', error);
      Alert.alert(
        '❌ Error de Conexión', 
        `No se pudo conectar con el servidor.\n\nURL intentada: ${API_URL}\nError: ${
          typeof error === 'object' && error !== null && 'message' in error && typeof (error as any).message === 'string'
            ? (error as any).message
            : String(error)
        }\n\n🔧 Verificar:\n• Servidor corriendo en puerto 3001\n• IP correcta\n• Firewall/antivirus`
      );
    }
  };

  // Mostrar loading mientras se verifica la sesión
  if (checkingSession) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor="#7A9B57" barStyle="light-content" />
        <View style={styles.loadingScreen}>
          <Image
            source={require('../img/nutralis2.png')}
            style={{ width: 150, height: 150, resizeMode: 'contain', marginBottom: 20 }}
          />
          <ActivityIndicator color="#F5F5DC" size="large" />
          <Text style={styles.loadingText}>Verificando sesión...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#7A9B57" barStyle="light-content" />
      
      <KeyboardAvoidingView 
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoContainer}>
            <Image
              source={require('../img/nutralis2.png')}
              style={styles.logo}
            />
            
            {/* Botón de test (solo para desarrollo - puedes quitarlo después) */}
            <TouchableOpacity 
              style={styles.testButton} 
              onPress={testConnection}
            >
              <Text style={styles.testButtonText}>Probar Conexión</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.formContainer}>
            <TextInput
              style={styles.input}
              placeholder="Correo electrónico"
              placeholderTextColor="#666"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={formData.correo}
              onChangeText={(value) => handleChange('correo', value)}
              editable={!loading}
            />

            <TextInput
              style={styles.input}
              placeholder="Contraseña"
              placeholderTextColor="#666"
              secureTextEntry
              value={formData.password}
              onChangeText={(value) => handleChange('password', value)}
              editable={!loading}
            />

            <TouchableOpacity 
              style={[styles.loginButton, loading && styles.disabledButton]} 
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="#4A4A4A" size="small" />
                  <Text style={[styles.loginButtonText, { marginLeft: 10 }]}>
                    Iniciando sesión...
                  </Text>
                </View>
              ) : (
                <Text style={styles.loginButtonText}>Iniciar Sesión</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.registerText}>¿No tienes cuenta? Regístrate aquí</Text>

            <TouchableOpacity 
              style={[styles.registerButton, loading && styles.disabledButton]} 
              onPress={handleRegistro}
              disabled={loading}
            >
              <Text style={styles.registerButtonText}>Registrarse</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#7A9B57',
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 30,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: Platform.OS === 'ios' ? 60 : 40,
    marginBottom: 40,
  },
  logo: {
    width: 180,
    height: 180,
    resizeMode: 'contain',
  },
  formContainer: {
    width: '100%',
    paddingBottom: 40,
  },
  input: {
    backgroundColor: '#F5F5DC',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 18,
    marginBottom: 20,
    fontSize: 16,
    color: '#333',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  loginButton: {
    backgroundColor: '#CD853F',
    borderRadius: 8,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  loginButtonText: {
    color: '#4A4A4A',
    fontSize: 18,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  registerText: {
    textAlign: 'center',
    color: '#4A5D3A',
    fontSize: 16,
    marginBottom: 20,
    fontWeight: '500',
  },
  registerButton: {
    backgroundColor: '#4A5D3A',
    borderRadius: 8,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  registerButtonText: {
    color: '#F5F5DC',
    fontSize: 18,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  testButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
    marginTop: 10,
  },
  testButtonText: {
    color: '#F5F5DC',
    fontSize: 12,
    fontWeight: '500',
  },
  // Estilos para la pantalla de carga de verificación de sesión
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  loadingText: {
    color: '#F5F5DC',
    fontSize: 16,
    marginTop: 15,
    textAlign: 'center',
  },
});

export default LoginScreen;