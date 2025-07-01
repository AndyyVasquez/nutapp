import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import BottomNavbar from './navbar';

const SERVER_API_URL = 'http://10.13.9.202:3001'; 

interface User {
  id: string;
  nombre: string;
  correo: string;
  userType: string;
}

const FormularioNutriologoScreen = () => {
  const [motivo, setMotivo] = useState('');
  const [antecedentesHered, setAntecedentesHered] = useState('');
  const [antecedentesPersonales, setAntecedentesPersonales] = useState('');
  const [antecedentesPatologicos, setAntecedentesPatologicos] = useState('');
  const [alergias, setAlergias] = useState('');
  const [aversiones, setAversiones] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      
      if (!userData) {
        console.log('❌ No se encontró sesión activa, redirigiendo a login...');
        router.replace('/login');
        return;
      }

      const parsedUser = JSON.parse(userData);
      
      if (parsedUser.userType !== 'cliente') {
        console.log('❌ Usuario no es cliente, limpiando sesión...');
        await AsyncStorage.removeItem('user');
        router.replace('/login');
        return;
      }

      console.log('✅ Sesión válida encontrada para:', parsedUser.nombre);
      setUser(parsedUser);
      
    } catch (error) {
      console.error('❌ Error verificando autenticación:', error);
      await AsyncStorage.removeItem('user');
      router.replace('/login');
    } finally {
      setCheckingAuth(false);
    }
  };

  const validateForm = () => {
    if (!motivo.trim()) {
      Alert.alert('Error', 'Por favor describe el motivo de solicitud');
      return false;
    }
    if (!antecedentesHered.trim()) {
      Alert.alert('Error', 'Por favor completa los antecedentes heredofamiliares');
      return false;
    }
    if (!antecedentesPersonales.trim()) {
      Alert.alert('Error', 'Por favor completa los antecedentes personales no patológicos');
      return false;
    }
    if (!antecedentesPatologicos.trim()) {
      Alert.alert('Error', 'Por favor completa los antecedentes personales patológicos');
      return false;
    }
    if (!alergias.trim()) {
      Alert.alert('Error', 'Por favor completa el campo de alergias e intolerancias (escribe "Ninguna" si no tienes)');
      return false;
    }
    if (!aversiones.trim()) {
      Alert.alert('Error', 'Por favor completa el campo de aversiones alimentarias (escribe "Ninguna" si no tienes)');
      return false;
    }
    return true;
  };

  const handleEnviar = async () => {
    if (!validateForm()) {
      return;
    }

    if (!user) {
      Alert.alert('Error', 'No se encontraron datos del usuario. Por favor, inicia sesión nuevamente.');
      return;
    }

    setLoading(true);

    try {
      console.log('=== DEBUG MÓVIL ===');
      console.log('User ID:', user.id);
      console.log('User email:', user.correo);
      console.log('User name:', user.nombre);

      const payload = {
        userId: user.id,
        userEmail: user.correo,
        userName: user.nombre,
        formData: {
          motivo: motivo.trim(),
          antecedentesHeredofamiliares: antecedentesHered.trim(),
          antecedentesPersonalesNoPatologicos: antecedentesPersonales.trim(),
          antecedentesPersonalesPatologicos: antecedentesPatologicos.trim(),
          alergiasIntolerancias: alergias.trim(),
          aversionesAlimentarias: aversiones.trim(),
          fechaEnvio: new Date().toISOString()
        }
      };

      console.log('Payload completo a enviar:', JSON.stringify(payload, null, 2));

      console.log('SERVER_API_URL:', SERVER_API_URL);
      const fullUrl = `${SERVER_API_URL}/api/submit-nutrition-form`;
      console.log('URL completa:', fullUrl);

      console.log('🚀 Enviando formulario...');
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      const data = await response.json();
      console.log('Response data:', data);

      if (data.success) {
        console.log('✅ Formulario enviado exitosamente');
        
        await AsyncStorage.setItem('formularioEnviado', 'true');
        
        Alert.alert(
          "✅ Solicitud Enviada",
          "Tu solicitud ha sido enviada exitosamente. Ahora verificaremos tu acceso.",
          [
            { 
              text: "Continuar", 
              onPress: () => {
                console.log('🔄 Navegando a token-verification...');
                router.push('./tokenVerification');
              }
            }
          ]
        );
      } else {
        console.log('❌ Error del servidor:', data.message);
        Alert.alert('Error', data.message || 'No se pudo enviar la solicitud');
      }

    } catch (error) {
      console.error('❌ Error enviando formulario:', error);
      if (typeof error === 'object' && error !== null && 'stack' in error) {
        console.error('Error stack:', (error as { stack?: string }).stack);
      }
      
      let errorMessage = 'Error de conexión desconocido';
      
      if (typeof error === 'object' && error !== null && 'message' in error && typeof (error as any).message === 'string') {
        const errMsg = (error as any).message;
        if (errMsg.includes('Network request failed')) {
          errorMessage = 'Error de red. Verifica tu conexión a internet y que el servidor esté funcionando.';
        } else if (errMsg.includes('JSON')) {
          errorMessage = 'Error procesando la respuesta del servidor.';
        } else if (errMsg.includes('fetch')) {
          errorMessage = 'No se pudo conectar al servidor. Verifica la IP del servidor.';
        }
      }
      
      Alert.alert(
        'Error de Conexión',
        `${errorMessage}\n\n¿Deseas continuar sin guardar en el servidor?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Continuar',
            onPress: async () => {
              console.log('💾 Guardando localmente y continuando...');
              
              await AsyncStorage.setItem('formularioEnviado', 'true');
              await AsyncStorage.setItem('formularioData', JSON.stringify({
                motivo,
                antecedentesHered,
                antecedentesPersonales,
                antecedentesPatologicos,
                alergias,
                aversiones,
                fechaEnvio: new Date().toISOString()
              }));
              
              router.push('./token-verification');
            }
          }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  // Mostrar loading mientras se verifica la autenticación
  if (checkingAuth) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor="#7A9B57" barStyle="light-content" />
        <View style={styles.loadingScreen}>
          <ActivityIndicator color="#7A9B57" size="large" />
          <Text style={styles.loadingText}>Verificando acceso...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Si no hay usuario después del loading, no mostrar nada 
  if (!user) {
    return null;
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
          style={styles.content} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Profesional de la Salud</Text>
          
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Formulario de Solicitud</Text>
            <Text style={styles.subtitle}>Motivo de solicitud de atención nutricional *</Text>
            
            <TextInput
              style={styles.textInput}
              value={motivo}
              onChangeText={setMotivo}
              multiline
              placeholder="Describe tu motivo..."
              editable={!loading}
              textAlignVertical="top"
            />
            
            <Text style={styles.fieldLabel}>Antecedentes heredofamiliares *</Text>
            <TextInput
              style={styles.textInput}
              value={antecedentesHered}
              onChangeText={setAntecedentesHered}
              multiline
              placeholder="Describe antecedentes familiares..."
              editable={!loading}
              textAlignVertical="top"
            />
            
            <Text style={styles.fieldLabel}>Antecedentes personales no patológicos *</Text>
            <TextInput
              style={styles.textInput}
              value={antecedentesPersonales}
              onChangeText={setAntecedentesPersonales}
              multiline
              placeholder="Describe antecedentes personales..."
              editable={!loading}
              textAlignVertical="top"
            />
            
            <Text style={styles.fieldLabel}>Antecedentes personales patológicos *</Text>
            <TextInput
              style={styles.textInput}
              value={antecedentesPatologicos}
              onChangeText={setAntecedentesPatologicos}
              multiline
              placeholder="Describe antecedentes patológicos..."
              editable={!loading}
              textAlignVertical="top"
            />
            
            <Text style={styles.fieldLabel}>Alergias e intolerancias alimentarias *</Text>
            <TextInput
              style={styles.textInput}
              value={alergias}
              onChangeText={setAlergias}
              multiline
              placeholder="Describe alergias e intolerancias (escribe 'Ninguna' si no tienes)..."
              editable={!loading}
              textAlignVertical="top"
            />
            
            <Text style={styles.fieldLabel}>Aversiones alimentarias *</Text>
            <TextInput
              style={styles.textInput}
              value={aversiones}
              onChangeText={setAversiones}
              multiline
              placeholder="Describe aversiones alimentarias (escribe 'Ninguna' si no tienes)..."
              editable={!loading}
              textAlignVertical="top"
            />

            <Text style={styles.requiredNote}>* Campos obligatorios</Text>
            
            <TouchableOpacity 
              style={[styles.enviarButton, loading && styles.disabledButton]}
              onPress={handleEnviar}
              disabled={loading}
            >
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text style={[styles.enviarButtonText, { marginLeft: 10 }]}>
                    Enviando...
                  </Text>
                </View>
              ) : (
                <Text style={styles.enviarButtonText}>Enviar Solicitud</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <BottomNavbar activeTab="./" />
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
    alignItems: 'center',
  },
  headerText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  keyboardContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 100, // Espacio extra para el BottomNavbar
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 30,
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: '#F5F5DC',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 15,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 10,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 8,
    marginTop: 15,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 15,
    paddingVertical: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    fontSize: 14,
    color: '#333333',
  },
  requiredNote: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 15,
    textAlign: 'center',
  },
  enviarButton: {
    backgroundColor: '#7A9B57',
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  disabledButton: {
    opacity: 0.6,
  },
  enviarButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingScreen: {
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

export default FormularioNutriologoScreen;