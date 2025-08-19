import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
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

const SERVER_API_URL = 'https://nutweb.onrender.com';

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
        router.replace('/login');
        return;
      }

      const parsedUser = JSON.parse(userData);
      
      if (parsedUser.userType !== 'cliente') {
        await AsyncStorage.removeItem('user');
        router.replace('/login');
        return;
      }

      setUser(parsedUser);
      
    } catch {
      await AsyncStorage.removeItem('user');
      router.replace('/login');
    } finally {
      setCheckingAuth(false);
    }
  };

  const validateForm = () => {
    if (!motivo.trim() || !antecedentesHered.trim() || !antecedentesPersonales.trim() ||
        !antecedentesPatologicos.trim() || !alergias.trim() || !aversiones.trim()) {
      Alert.alert('Error', 'Completa todos los campos requeridos.');
      return false;
    }
    return true;
  };

  const handleEnviar = async () => {
    if (!validateForm()) return;

    if (!user) {
      Alert.alert('Error', 'No se encontraron datos del usuario. Inicia sesión nuevamente.');
      return;
    }

    setLoading(true);

    try {
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

      const response = await fetch(`${SERVER_API_URL}/api/submit-nutrition-form`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (data.success) {
        await AsyncStorage.setItem('formularioEnviado', 'true');
        // Luego de guardar exitosamente el formulario, procesar Mercado Pago
        await handleMercadoPagoPayment();
      } else {
        throw new Error(data.message || 'No se pudo enviar el formulario');
      }

    } catch (error: any) {
      Alert.alert('Error', error.message || 'Error inesperado');
    } finally {
      setLoading(false);
    }
  };

// FormularioNutriologoScreen.js - Solo cambios en handleMercadoPagoPayment

const handleMercadoPagoPayment = async () => {
  if (!user) return;

  try {
    console.log('💳 Iniciando pago con Mercado Pago...');
    const payload = {
      title: 'Plan Cliente Mensual - Nutralis',
      price: 99,
      quantity: 1,
      currency_id: 'MXN',
      user_id: user.id,
      user_email: user.correo,
      plan_type: 'cliente'
    };

    const response = await fetch(`${SERVER_API_URL}/api/mercadopago/create-preference`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('❌ Respuesta NO JSON:', text);
      throw new Error('Respuesta inesperada del servidor.');
    }

    const data = await response.json();
    if (data.success && data.init_point) {
      Alert.alert(
        'Formulario Enviado',
        'Tu formulario se guardó exitosamente. Ahora puedes proceder con el pago o verificar si tienes un token de nutriólogo.',
        [
          { text: 'Ir a Verificación', onPress: () => router.push('./tokenVerification') },
          {
            text: 'Pagar Ahora',
            onPress: async () => {
              const canOpen = await Linking.canOpenURL(data.init_point);
              if (canOpen) {
                await Linking.openURL(data.init_point);
                // Después del pago, navegar a tokenVerification
                setTimeout(() => {
                  router.push('./tokenVerification');
                }, 1000);
              } else {
                Alert.alert('Error', 'No se puede abrir Mercado Pago');
                router.push('./tokenVerification');
              }
            }
          }
        ]
      );
    } else {
      throw new Error(data.message || 'No se pudo crear la preferencia de pago.');
    }

  } catch (error: any) {
    console.error('❌ Error iniciando pago:', error);
    Alert.alert(
      'Error con el pago',
      'Hubo un problema con el pago, pero tu formulario se guardó correctamente. Puedes continuar con la verificación.',
      [
        { text: 'Continuar', onPress: () => router.push('./tokenVerification') }
      ]
    );
  }
};

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

  if (!user) return null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#7A9B57" barStyle="light-content" />
      <KeyboardAvoidingView 
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          style={styles.content} 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
         <View style={styles.header}>
           <Text style={styles.title}>Profesional de la Salud</Text>
         </View>
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Formulario de Solicitud</Text>

            <Text style={styles.fieldLabel}>Motivo *</Text>
            <TextInput style={styles.textInput} value={motivo} placeholder='Describe tu motivo...' placeholderTextColor={"#666"} onChangeText={setMotivo} multiline />

            <Text style={styles.fieldLabel}>Antecedentes heredofamiliares *</Text>
            <TextInput style={styles.textInput} value={antecedentesHered} placeholder='Enfermedades dentro de tu familia...' placeholderTextColor={"#666"} onChangeText={setAntecedentesHered} multiline />

            <Text style={styles.fieldLabel}>Antecedentes personales no patológicos *</Text>
            <TextInput style={styles.textInput} value={antecedentesPersonales} placeholder='Estilo de vida, ocupación, hábitos...' placeholderTextColor={"#666"} onChangeText={setAntecedentesPersonales} multiline />

            <Text style={styles.fieldLabel}>Antecedentes personales patológicos *</Text>
            <TextInput style={styles.textInput} value={antecedentesPatologicos} placeholder='Enfermedades, cirugías, hospitalizaciones...' placeholderTextColor={"#666"} onChangeText={setAntecedentesPatologicos} multiline />

            <Text style={styles.fieldLabel}>Alergias e intolerancias *</Text>
            <TextInput style={styles.textInput} value={alergias} placeholder='Describe tus alergias...' placeholderTextColor={"#666"} onChangeText={setAlergias} multiline />

            <Text style={styles.fieldLabel}>Aversiones alimentarias *</Text>
            <TextInput style={styles.textInput} value={aversiones} placeholder='Alimentos que no toleras o no son de tu gusto...' placeholderTextColor={"#666"} onChangeText={setAversiones} multiline />

            <Text style={styles.requiredNote}>* Campos obligatorios</Text>

            <TouchableOpacity 
              style={[styles.enviarButton, loading && styles.disabledButton]}
              onPress={handleEnviar}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
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
    backgroundColor: '#F5F5F5' 
  },
  header: {
     backgroundColor: "#7A9B57" ,
      paddingVertical: 10,
      marginBottom: 10,
      marginTop: -30,
      marginRight: -20,
      marginLeft: -20,
  },
  keyboardContainer: { 
    flex: 1 
  },
  content: { 
    flex: 1 
  },
  scrollContent: { 
    paddingHorizontal: 20, 
    paddingTop: 30, 
    paddingBottom: 100 
  },
  title: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    color: '#333', 
    marginBottom: 30, 
    textAlign: 'center'
  },
  formCard: { 
    backgroundColor: '#F5F5DC', 
    borderRadius: 12, 
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5
  },
  formTitle: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: '#333', 
    marginBottom: 15, 
    textAlign: 'center' 
  },
  fieldLabel: { 
    fontSize: 14, 
    fontWeight: '500', 
    color: '#333', 
    marginBottom: 8, 
    marginTop: 15 
  },
  textInput: { 
    backgroundColor: '#FFF', 
    borderRadius: 8, 
    borderWidth: 1, 
    borderColor: '#E0E0E0', 
    padding: 12, 
    minHeight: 60, 
    textAlignVertical: 'top' 
  },
  requiredNote: { 
    fontSize: 12, 
    color: '#666', 
    fontStyle: 'italic', 
    marginTop: 15, 
    textAlign: 'center' 
  },
  enviarButton: { 
    backgroundColor: '#7A9B57', 
    borderRadius: 8, 
    padding: 15, 
    alignItems: 'center', 
    marginTop: 20 
  },
  enviarButtonText: { 
    color: '#FFF', 
    fontSize: 16, 
    fontWeight: '600' 
  },
  disabledButton: { 
    opacity: 0.6 
  },
  loadingScreen: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingHorizontal: 30 
  },
  loadingText: { 
    color: '#7A9B57', 
    fontSize: 16, 
    marginTop: 15, 
    textAlign: 'center' 
  },
});

export default FormularioNutriologoScreen;
