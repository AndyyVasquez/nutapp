// screens/TokenVerificationScreen.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
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
  TouchableWithoutFeedback,
  View
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

// Configuración del servidor
const SERVER_API_URL = 'https://nutweb.onrender.com/api';

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
  const [showConflictDialog, setShowConflictDialog] = useState<boolean>(false);
  const [conflictData, setConflictData] = useState<any>(null);

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
      console.log('🔍 Verificando token:', token.trim());

      // Verificar token de nutriólogo
      const nutritionistResponse = await fetch(`${SERVER_API_URL}/verify-nutritionist-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: token.trim().toUpperCase(),
          clientId: user?.id
        })
      });

      const nutritionistData = await nutritionistResponse.json();
      console.log('📊 Respuesta del servidor:', nutritionistData);

      if (nutritionistData.success) {
        Alert.alert(
          '¡Token de Nutriólogo Válido!',
          `Te has vinculado exitosamente con ${nutritionistData.nutritionist.name}${nutritionistData.nutritionist.especialidad ? '\nEspecialidad: ' + nutritionistData.nutritionist.especialidad : ''}`,
          [
            {
              text: 'Continuar',
              onPress: () => {
                updateUserMode('supervisado');
                router.replace('./home');
              }
            }
          ]
        );
      } else if (nutritionistData.conflict) {
        // Mostrar diálogo de conflicto
        setConflictData(nutritionistData);
        setShowConflictDialog(true);
      } else {
        Alert.alert(
          'Token Inválido', 
          nutritionistData.message || 'El token ingresado no es válido. Verifica que sea un token de nutriólogo activo.'
        );
      }
    } catch (error) {
      console.error('Error verificando token:', error);
      Alert.alert('Error', 'No se pudo verificar el token. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleConflictDecision = async (confirm: boolean) => {
    if (!confirm) {
      setShowConflictDialog(false);
      setConflictData(null);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${SERVER_API_URL}/confirm-nutritionist-change`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          clientId: user?.id,
          newNutritionistId: conflictData.new_nutritionist_id,
          confirm: true
        })
      });

      const data = await response.json();

      if (data.success) {
        setShowConflictDialog(false);
        setConflictData(null);
        
        Alert.alert(
          '¡Cambio Realizado!',
          data.message,
          [
            {
              text: 'Continuar',
              onPress: () => {
                updateUserMode('supervisado');
                router.replace('./home');
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', data.message || 'No se pudo realizar el cambio');
      }
    } catch (error) {
      console.error('Error confirmando cambio:', error);
      Alert.alert('Error', 'No se pudo procesar el cambio');
    } finally {
      setLoading(false);
    }
  };

  const autoAssignNutritionist = async () => {
    setLoading(true);
    try {
      console.log('🤖 Iniciando asignación automática...');

      const response = await fetch(`${SERVER_API_URL}/auto-assign-nutritionist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          clientId: user?.id
        })
      });

      const data = await response.json();
      console.log('📊 Respuesta asignación automática:', data);

      if (data.success) {
        Alert.alert(
          '¡Nutriólogo Asignado!',
          `${data.message}${data.nutritionist.especialidad ? '\nEspecialidad: ' + data.nutritionist.especialidad : ''}`,
          [
            {
              text: 'Continuar',
              onPress: () => {
                updateUserMode('supervisado');
                router.replace('./home');
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', data.message || 'No se pudo asignar un nutriólogo automáticamente');
      }
    } catch (error) {
      console.error('Error en asignación automática:', error);
      Alert.alert('Error', 'No se pudo conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const updateUserMode = async (mode: string) => {
    try {
      if (user) {
        const updatedUser = {
          ...user,
          modo: mode
        };
        
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        
        console.log(`✅ Usuario actualizado con modo: ${mode}`);
      }
    } catch (error) {
      console.error('Error actualizando modo usuario:', error);
    }
  };

  const initiatePayment = async () => {
    if (!user) {
      Alert.alert('Error', 'No se encontraron datos del usuario');
      return;
    }

    setLoading(true);
    try {
      console.log('💳 Iniciando pago con Mercado Pago...');

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
        
        const paymentUrl = data.init_point;
        const supported = await Linking.canOpenURL(paymentUrl);
        
        if (supported) {
          await Linking.openURL(paymentUrl);
          
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
      router.replace('./login');
    } catch (error) {
      console.error('Error cerrando sesión:', error);
    }
  };

  const goBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#7A9B57" barStyle="light-content" />
      
      {/* Header fijo */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#F5F5DC" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Verificación de Acceso</Text>
      </View>

      {/* Contenido con ScrollView y KeyboardAvoidingView */}
      <KeyboardAvoidingView 
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView 
            style={styles.scrollContainer}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.card}>
              <Icon name="shield-checkmark" size={60} color="#7A9B57" style={styles.mainIcon} />
              
              <Text style={styles.title}>¿Tienes Token de Nutriólogo?</Text>
              <Text style={styles.subtitle}>
                Si tu nutriólogo ya te asignó un token, favor de ingresarlo en la opción de <Text style={styles.black}>Si tengo token</Text>
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
                    returnKeyType="done"
                    onSubmitEditing={verifyToken}
                  />
                  
                  <View style={styles.tokenButtons}>
                    <TouchableOpacity 
                      style={[styles.tokenButton, styles.cancelButton]}
                      onPress={() => {
                        setHasToken(null);
                        setToken('');
                      }}
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
                  <Text style={styles.paymentTitle}>Asignación Automática</Text>
                  <Text style={styles.paymentDescription}>
                    Se te asignará automáticamente un nutriólogo disponible del sistema para brindarte atención personalizada.
                  </Text>

                  <TouchableOpacity 
                    style={styles.autoAssignButton}
                    onPress={autoAssignNutritionist}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <>
                        <Icon name="person-add" size={24} color="white" />
                        <Text style={styles.autoAssignButtonText}>Asignar Nutriólogo Automáticamente</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.backToOptionsButton}
                    onPress={() => setHasToken(null)}
                  >
                    <Text style={styles.backToOptionsText}>← Volver a opciones</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {/* Diálogo de conflicto */}
      {showConflictDialog && conflictData && (
        <View style={styles.overlay}>
          <View style={styles.conflictDialog}>
            <Icon name="warning" size={50} color="#FF9500" style={styles.conflictIcon} />
            <Text style={styles.conflictTitle}>Cambio de Nutriólogo</Text>
            <Text style={styles.conflictMessage}>
              Actualmente estás vinculado con: {conflictData.current_nutritionist}
              {'\n\n'}¿Deseas cambiar a: {conflictData.new_nutritionist}?
            </Text>
            
            <View style={styles.conflictButtons}>
              <TouchableOpacity 
                style={[styles.conflictButton, styles.conflictCancelButton]}
                onPress={() => handleConflictDecision(false)}
              >
                <Text style={styles.conflictCancelText}>Mantener actual</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.conflictButton, styles.conflictConfirmButton]}
                onPress={() => handleConflictDecision(true)}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.conflictConfirmText}>Cambiar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
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
    backgroundColor: '#7A9B57',
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F5F5DC',
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: '#7A9B57',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
    minHeight: '100%',
  },
  black: {
    fontWeight: 'bold'
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
    marginVertical: 20,
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
    paddingVertical: 15,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
    backgroundColor: '#f9f9f9',
    fontWeight: '600',
    letterSpacing: 1,
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
    marginBottom: 30,
    lineHeight: 20,
  },
  autoAssignButton: {
    backgroundColor: '#7A9B57',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    marginBottom: 20,
    gap: 10,
    width: '100%',
  },
  autoAssignButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
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
  // Estilos para el diálogo de conflicto
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  conflictDialog: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    marginHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 20,
    maxWidth: 350,
  },
  conflictIcon: {
    marginBottom: 15,
  },
  conflictTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  conflictMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
  },
  conflictButtons: {
    flexDirection: 'row',
    gap: 15,
    width: '100%',
  },
  conflictButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  conflictCancelButton: {
    backgroundColor: '#6c757d',
  },
  conflictCancelText: {
    color: 'white',
    fontWeight: '500',
  },
  conflictConfirmButton: {
    backgroundColor: '#dc3545',
  },
  conflictConfirmText: {
    color: 'white',
    fontWeight: '600',
  },
});

export default TokenVerificationScreen;