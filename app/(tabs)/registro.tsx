import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

const RegistroScreen = () => {
  // Estados para los campos del formulario
  const [formData, setFormData] = useState({
    nombreCompleto: '',
    edad: '',
    sexo: '',
    estatura: '',
    peso: '',
    correo: '',
    password: ''
  });
  
  const [loading, setLoading] = useState(false);

  const updateFormData = (field : any, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    const { nombreCompleto, edad, sexo, estatura, peso, correo, password } = formData;
    
    if (!nombreCompleto.trim()) {
      Alert.alert('Error', 'El nombre completo es requerido');
      return false;
    }
    
    if (!edad || isNaN(parseInt(edad)) || parseInt(edad) < 1 || parseInt(edad) > 120) {
      Alert.alert('Error', 'Ingresa una edad válida (1-120)');
      return false;
    }
    
    if (!sexo.trim()) {
      Alert.alert('Error', 'El sexo es requerido');
      return false;
    }
    
    if (!estatura || isNaN(parseInt(estatura)) || parseFloat(estatura) < 50 || parseFloat(estatura) > 250) {
      Alert.alert('Error', 'Ingresa una estatura válida en cm (50-250)');
      return false;
    }
    
    if (!peso || isNaN(parseInt(peso)) || parseFloat(peso) < 20 || parseFloat(peso) > 300) {
      Alert.alert('Error', 'Ingresa un peso válido en kg (20-300)');
      return false;
    }
    
    if (!correo.trim() || !correo.includes('@')) {
      Alert.alert('Error', 'Ingresa un correo electrónico válido');
      return false;
    }
    
    if (!password || password.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return false;
    }
    
    return true;
  };

  // Función para separar el nombre completo
  const parseNombreCompleto = (nombreCompleto : any) => {
    const partes = nombreCompleto.trim().split(' ');
    
    if (partes.length < 2) {
      return {
        nombre_cli: partes[0] || '',
        app_cli: '',
        apm_cli: ''
      };
    } else if (partes.length === 2) {
      return {
        nombre_cli: partes[0],
        app_cli: partes[1],
        apm_cli: ''
      };
    } else {
      return {
        nombre_cli: partes[0],
        app_cli: partes[1],
        apm_cli: partes.slice(2).join(' ')
      };
    }
  };

  // Función para manejar el registro
  const handleRegistro = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const { nombre_cli, app_cli, apm_cli } = parseNombreCompleto(formData.nombreCompleto);
      
      const registroData = {
        nombre_cli,
        app_cli,  
        apm_cli,
        correo_cli: formData.correo.toLowerCase().trim(),
        password_cli: formData.password,
        edad_cli: parseInt(formData.edad),
        sexo_cli: formData.sexo.toLowerCase(),
        peso_cli: parseFloat(formData.peso),
        estatura_cli: parseFloat(formData.estatura),
        faf_cli: 1.2,
        geb_cli: 0,  
        modo: 'autonomo'
      };


      const response = await fetch('https://nutweb.onrender.com/api/register-client', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registroData),
      });

      const result = await response.json();

      if (result.success) {
        Alert.alert(
          'Registro Exitoso',
          'Tu cuenta ha sido creada correctamente. Ahora puedes iniciar sesión.',
          [
            {
              text: 'OK',
              onPress: () => router.push('./login')
            }
          ]
        );
      } else {
        Alert.alert('Error', result.message || 'Error al registrar el usuario');
      }

    } catch (error) {
      console.error('Error en registro:', error);
      Alert.alert(
        'Error de Conexión',
        'No se pudo conectar con el servidor. Verifica tu conexión a internet.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleIniciarSesion = () => {
    router.push('./');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#7A9B57" barStyle="light-content" />
      
      <View style={styles.content}>
        <View style={styles.logoContainer}>
           <Image
             source={require('../img/nutralis2.png')}
             style={{ width: 200, height: 200, resizeMode: 'contain' }}
           />
         </View>

        <View style={styles.formContainer}>
          <TextInput
            style={styles.input}
            placeholder="Nombre completo"
            placeholderTextColor="#666"
            value={formData.nombreCompleto}
            onChangeText={(text) => updateFormData('nombreCompleto', text)}
            editable={!loading}
          />

          <View style={styles.rowContainer}>
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Edad"
              placeholderTextColor="#666"
              keyboardType="numeric"
              value={formData.edad}
              onChangeText={(text) => updateFormData('edad', text)}
              editable={!loading}
            />
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Sexo (M/F)"
              placeholderTextColor="#666"
              value={formData.sexo}
              onChangeText={(text) => updateFormData('sexo', text)}
              editable={!loading}
              maxLength={1}
            />
          </View>

          <View style={styles.rowContainer}>
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Estatura (cm)"
              placeholderTextColor="#666"
              keyboardType="numeric"
              value={formData.estatura}
              onChangeText={(text) => updateFormData('estatura', text)}
              editable={!loading}
            />
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Peso (kg)"
              placeholderTextColor="#666"
              keyboardType="numeric"
              value={formData.peso}
              onChangeText={(text) => updateFormData('peso', text)}
              editable={!loading}
            />
          </View>

          <TextInput
            style={styles.input}
            placeholder="Correo electrónico"
            placeholderTextColor="#666"
            keyboardType="email-address"
            autoCapitalize="none"
            value={formData.correo}
            onChangeText={(text) => updateFormData('correo', text)}
            editable={!loading}
          />

          <TextInput
            style={styles.input}
            placeholder="Contraseña (mín. 6 caracteres)"
            placeholderTextColor="#666"
            secureTextEntry
            value={formData.password}
            onChangeText={(text) => updateFormData('password', text)}
            editable={!loading}
          />

          <TouchableOpacity 
            style={[styles.registerButton, loading && styles.disabledButton]} 
            onPress={handleRegistro}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#F5F5DC" size="small" />
            ) : (
              <Text style={styles.registerButtonText}>Registrarse</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.loginLink}
            onPress={handleIniciarSesion}
            disabled={loading}
          >
            <Text style={styles.loginLinkText}>
              ¿Ya tienes cuenta? Inicia sesión
            </Text>
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
    paddingHorizontal: 30,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  formContainer: {
    width: '100%',
  },
  input: {
    backgroundColor: '#F5F5DC',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 15,
    marginBottom: 15,
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
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
  registerButton: {
    backgroundColor: '#4A5D3A',
    borderRadius: 8,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  disabledButton: {
    backgroundColor: '#666',
  },
  registerButtonText: {
    color: '#F5F5DC',
    fontSize: 18,
    fontWeight: '600',
  },
  loginLink: {
    alignItems: 'center',
    marginTop: 20,
  },
  loginLinkText: {
    color: '#F5F5DC',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
});

export default RegistroScreen;