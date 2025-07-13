import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  PermissionsAndroid,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import BottomNavbar from './navbar';

const SERVER_API_URL = 'http://10.13.8.70:3001';

// ✅ Importación segura de BluetoothSerial
let BluetoothSerial: any = null;

try {
  BluetoothSerial = require('react-native-bluetooth-serial');
  console.log('✅ BluetoothSerial importado correctamente');
} catch (error) {
  console.warn('⚠️ BluetoothSerial no disponible:', error);
}

interface User {
  id: string;
  nombre: string;
  correo: string;
  userType: string;
}

interface BluetoothDevice {
  id: string;
  name: string;
  address: string;
}

interface PedometerData {
  steps: number;
  calories: number;
  distance: number;
  batteryLevel: number;
  counting: boolean;
  lastUpdate: string | null;
}

const ActivityScreen = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Estados Bluetooth
  const [bluetoothEnabled, setBluetoothEnabled] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<BluetoothDevice | null>(null);
  const [connecting, setConnecting] = useState(false);
  
  // Estados del podómetro
  const [pedometerData, setPedometerData] = useState<PedometerData>({
    steps: 0,
    calories: 0,
    distance: 0,
    batteryLevel: 100,
    counting: false,
    lastUpdate: null
  });
  const [sendingCommand, setSendingCommand] = useState(false);

  useEffect(() => {
    checkAuthentication();
  }, []);

  useEffect(() => {
    if (user) {
      // ✅ Solo inicializar Bluetooth si está disponible
      if (BluetoothSerial && typeof BluetoothSerial === 'object') {
        initializeBluetooth();
      } else {
        console.warn('⚠️ BluetoothSerial no disponible, modo simulado');
        // Modo simulado para desarrollo
        setBluetoothEnabled(false);
        setLoading(false);
      }
    }
  }, [user]);

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
    } catch (error) {
      console.error('❌ Error verificando autenticación:', error);
      router.replace('/login');
    } finally {
      setLoading(false);
    }
  };

  const initializeBluetooth = async () => {
    try {
      // ✅ Verificación robusta de BluetoothSerial
      if (!BluetoothSerial || typeof BluetoothSerial !== 'object') {
        console.warn('⚠️ BluetoothSerial no disponible');
        return;
      }

      // Solicitar permisos en Android
      if (Platform.OS === 'android') {
        try {
          const granted = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          ]);
          console.log('📱 Permisos Bluetooth:', granted);
        } catch (permError) {
          console.warn('⚠️ Error solicitando permisos:', permError);
        }
      }

      // Verificar si Bluetooth está habilitado
      if (BluetoothSerial.isEnabled && typeof BluetoothSerial.isEnabled === 'function') {
        const enabled = await BluetoothSerial.isEnabled();
        setBluetoothEnabled(enabled);
        
        if (!enabled) {
          Alert.alert(
            '🔵 Bluetooth Deshabilitado',
            'Para conectar con el podómetro ESP32, necesitas habilitar Bluetooth.',
            [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Habilitar', onPress: enableBluetooth }
            ]
          );
        } else {
          console.log('✅ Bluetooth habilitado');
          setupBluetoothListeners();
        }
      }

    } catch (error) {
      console.error('❌ Error inicializando Bluetooth:', error);
    }
  };

  const enableBluetooth = async () => {
    try {
      if (BluetoothSerial && BluetoothSerial.enable && typeof BluetoothSerial.enable === 'function') {
        await BluetoothSerial.enable();
        setBluetoothEnabled(true);
        setupBluetoothListeners();
      }
    } catch (error) {
      console.error('❌ Error habilitando Bluetooth:', error);
    }
  };

  const setupBluetoothListeners = () => {
    try {
      // ✅ Verificación robusta antes de configurar listeners
      if (!BluetoothSerial || !BluetoothSerial.on || typeof BluetoothSerial.on !== 'function') {
        console.warn('⚠️ Métodos de BluetoothSerial no disponibles');
        return;
      }

      // Listener para datos recibidos
      BluetoothSerial.on('read', (data: any) => {
        console.log('📨 Datos recibidos del ESP32:', data?.data);
        try {
          if (data?.data) {
            const jsonData = JSON.parse(data.data);
            handleESP32Message(jsonData);
          }
        } catch (error) {
          console.log('📨 Mensaje no JSON del ESP32:', data?.data);
        }
      });

      // Listener para conexión
      BluetoothSerial.on('connectionSuccess', () => {
        console.log('✅ Conectado al ESP32');
        if (user) {
          sendBluetoothMessage({
            type: 'set_user',
            userId: user.id,
            timestamp: Date.now()
          });
        }
      });

      // Listener para desconexión
      BluetoothSerial.on('connectionFailed', () => {
        console.log('❌ Error conectando al ESP32');
        setConnectedDevice(null);
        setConnecting(false);
      });

      BluetoothSerial.on('connectionLost', () => {
        console.log('🔌 Conexión perdida con ESP32');
        setConnectedDevice(null);
      });

      console.log('✅ Listeners de Bluetooth configurados');

    } catch (error) {
      console.error('❌ Error configurando listeners:', error);
    }
  };

  const handleESP32Message = (data: any) => {
    console.log('🔄 Procesando mensaje ESP32:', data);
    
    switch (data.type) {
      case 'connection_confirmed':
        console.log('✅ Conexión confirmada por ESP32');
        break;
        
      case 'steps_update':
        setPedometerData(prev => ({
          ...prev,
          steps: data.steps || 0,
          calories: data.calories || 0,
          distance: data.distance || 0,
          batteryLevel: data.batteryLevel || prev.batteryLevel,
          counting: data.counting || false,
          lastUpdate: new Date().toISOString()
        }));
        
        // Guardar en servidor
        saveStepsToServer(data.steps || 0);
        break;
        
      case 'status_update':
        setPedometerData(prev => ({
          ...prev,
          counting: data.counting || false,
          batteryLevel: data.batteryLevel || prev.batteryLevel
        }));
        break;
        
      case 'battery_update':
        setPedometerData(prev => ({
          ...prev,
          batteryLevel: data.batteryLevel || prev.batteryLevel
        }));
        break;
    }
  };

  const saveStepsToServer = async (steps: number) => {
    if (!user) return;
    
    try {
      const response = await fetch(`${SERVER_API_URL}/api/iot/pedometer/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_cli: user.id,
          steps: steps,
          fecha: new Date().toISOString().split('T')[0]
        })
      });

      const data = await response.json();
      if (data.success) {
        console.log('💾 Pasos guardados en servidor:', steps);
      }
    } catch (error) {
      console.error('❌ Error guardando pasos en servidor:', error);
    }
  };

  const discoverDevices = async () => {
    if (!BluetoothSerial) {
      Alert.alert('❌ Error', 'Bluetooth no disponible en este dispositivo');
      return;
    }

    try {
      setDiscovering(true);
      setDevices([]);
      
      if (BluetoothSerial.list && typeof BluetoothSerial.list === 'function') {
        // Buscar dispositivos emparejados
        const pairedDevices = await BluetoothSerial.list();
        const esp32Devices = pairedDevices.filter((device: any) => 
          device.name && (device.name.includes('ESP32') || device.name.includes('Podometro'))
        );
        
        if (esp32Devices.length > 0) {
          setDevices(esp32Devices);
          console.log('📱 Dispositivos ESP32 encontrados:', esp32Devices);
        } else {
          Alert.alert(
            '🔍 No se encontraron dispositivos',
            'Asegúrate de que el ESP32 esté encendido y emparejado en la configuración de Bluetooth.',
            [
              { text: 'OK' },
              { text: 'Buscar nuevos', onPress: discoverUnpairedDevices }
            ]
          );
        }
      }
    } catch (error) {
      console.error('❌ Error buscando dispositivos:', error);
      Alert.alert('Error', 'Error buscando dispositivos: ' + (error as Error).message);
    } finally {
      setDiscovering(false);
    }
  };

  const discoverUnpairedDevices = async () => {
    if (!BluetoothSerial || !BluetoothSerial.discoverUnpairedDevices) {
      return;
    }

    try {
      setDiscovering(true);
      
      // Descubrir dispositivos no emparejados
      const unpairedDevices = await BluetoothSerial.discoverUnpairedDevices();
      const esp32Devices = unpairedDevices.filter((device: any) => 
        device.name && (device.name.includes('ESP32') || device.name.includes('Podometro'))
      );
      
      if (esp32Devices.length > 0) {
        setDevices(prev => [...prev, ...esp32Devices]);
      }
    } catch (error) {
      console.error('❌ Error en descubrimiento:', error);
    } finally {
      setDiscovering(false);
    }
  };

  const connectToDevice = async (device: BluetoothDevice) => {
    if (!BluetoothSerial) {
      Alert.alert('Error', 'Bluetooth no disponible');
      return;
    }

    try {
      setConnecting(true);
      console.log('🔄 Conectando a:', device.name);
      
      if (BluetoothSerial.connect && typeof BluetoothSerial.connect === 'function') {
        const connected = await BluetoothSerial.connect(device.id);
        if (connected) {
          setConnectedDevice(device);
          console.log('✅ Conectado a ESP32:', device.name);
          
          // Solicitar estado inicial
          setTimeout(() => {
            sendBluetoothMessage({
              type: 'request_status',
              timestamp: Date.now()
            });
          }, 1000);
        }
      }
    } catch (error) {
      console.error('❌ Error conectando:', error);
      Alert.alert('Error', 'No se pudo conectar al dispositivo');
    } finally {
      setConnecting(false);
    }
  };

  const disconnectDevice = async () => {
    try {
      if (BluetoothSerial && BluetoothSerial.disconnect && typeof BluetoothSerial.disconnect === 'function') {
        await BluetoothSerial.disconnect();
      }
      setConnectedDevice(null);
      console.log('🔌 Desconectado del ESP32');
    } catch (error) {
      console.error('❌ Error desconectando:', error);
    }
  };

  const sendBluetoothMessage = async (message: any) => {
    try {
      if (BluetoothSerial && BluetoothSerial.write && typeof BluetoothSerial.write === 'function') {
        const jsonString = JSON.stringify(message);
        await BluetoothSerial.write(jsonString + '\n');
        console.log('📤 Enviado a ESP32:', jsonString);
      }
    } catch (error) {
      console.error('❌ Error enviando mensaje:', error);
    }
  };

  const sendCommand = async (command: string) => {
    if (!connectedDevice) {
      Alert.alert('⚠️ No conectado', 'Conecta primero al podómetro ESP32');
      return;
    }

    try {
      setSendingCommand(true);
      
      await sendBluetoothMessage({
        type: 'pedometer_command',
        command: command,
        userId: user?.id,
        timestamp: Date.now()
      });

      console.log(`🎮 Comando enviado: ${command}`);
      
    } catch (error) {
      console.error('❌ Error enviando comando:', error);
      Alert.alert('Error', 'No se pudo enviar el comando');
    } finally {
      setSendingCommand(false);
    }
  };

  const getStepsStatusColor = () => {
    const progress = (pedometerData.steps / 10000) * 100;
    if (progress >= 100) return '#4CAF50';
    if (progress >= 75) return '#FF9800';
    if (progress >= 50) return '#2196F3';
    return '#9E9E9E';
  };

  const getMotivationalMessage = () => {
    const progress = (pedometerData.steps / 10000) * 100;
    const steps = pedometerData.steps;
    
    if (steps === 0) return "¡Comienza a caminar! Cada paso cuenta 👟";
    if (progress < 25) return `¡Buen inicio! Llevas ${steps.toLocaleString()} pasos 🚶‍♀️`;
    if (progress < 50) return `¡Vas por buen camino! ${progress.toFixed(1)}% completado 💪`;
    if (progress < 75) return `¡Excelente progreso! Solo te falta ${(10000 - steps).toLocaleString()} pasos 🔥`;
    if (progress < 100) return `¡Casi lo logras! Solo ${(10000 - steps).toLocaleString()} pasos más ⭐`;
    return `¡Meta alcanzada! ${steps.toLocaleString()} pasos completados 🎉`;
  };

  const renderDevice = ({ item }: { item: BluetoothDevice }) => (
    <TouchableOpacity
      style={styles.deviceItem}
      onPress={() => connectToDevice(item)}
      disabled={connecting}
    >
      <View style={styles.deviceInfo}>
        <Text style={styles.deviceName}>{item.name || 'Dispositivo desconocido'}</Text>
        <Text style={styles.deviceAddress}>{item.address}</Text>
      </View>
      {connecting ? (
        <ActivityIndicator size="small" color="#7A9B57" />
      ) : (
        <Text style={styles.connectText}>Conectar</Text>
      )}
    </TouchableOpacity>
  );

  // ✅ Pantalla de error si Bluetooth no está disponible
  if (!BluetoothSerial) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor="#7A9B57" barStyle="light-content" />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Podómetro ESP32</Text>
          <Text style={styles.headerSubtitle}>Funcionalidad no disponible</Text>
        </View>
        
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>📱</Text>
          <Text style={styles.errorTitle}>Bluetooth no disponible</Text>
          <Text style={styles.errorText}>
            Esta funcionalidad requiere:
          </Text>
          <Text style={styles.errorText}>• Un dispositivo físico (no emulador)</Text>
          <Text style={styles.errorText}>• Librería react-native-bluetooth-serial</Text>
          <Text style={styles.errorText}>• Permisos de Bluetooth</Text>
          
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>← Volver</Text>
          </TouchableOpacity>
        </View>

        <BottomNavbar activeTab="steps" />
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor="#7A9B57" barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#7A9B57" size="large" />
          <Text style={styles.loadingText}>Cargando actividad...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) return null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#7A9B57" barStyle="light-content" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Podómetro ESP32</Text>
        <Text style={styles.headerSubtitle}>¡Mantente activo con Bluetooth, {user.nombre}!</Text>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={discoverDevices} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Estado de conexión Bluetooth */}
        <View style={[styles.connectionCard, { 
          borderLeftColor: connectedDevice ? '#4CAF50' : '#FF5722',
          borderLeftWidth: 4 
        }]}>
          <View style={styles.connectionHeader}>
            <Text style={styles.connectionTitle}>
              {connectedDevice ? '🟢 ESP32 Conectado' : '🔴 ESP32 Desconectado'}
            </Text>
            {connectedDevice && (
              <Text style={styles.batteryText}>🔋 {pedometerData.batteryLevel}%</Text>
            )}
          </View>
          
          {connectedDevice ? (
            <View style={styles.deviceInfo}>
              <Text style={styles.connectedDeviceName}>{connectedDevice.name}</Text>
              <Text style={styles.deviceStatus}>
                {pedometerData.counting ? '⏱️ Contando pasos...' : '⏸️ En pausa'}
              </Text>
              <TouchableOpacity 
                style={styles.disconnectButton}
                onPress={disconnectDevice}
              >
                <Text style={styles.disconnectText}>Desconectar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.searchContainer}>
              <TouchableOpacity 
                style={styles.searchButton}
                onPress={discoverDevices}
                disabled={discovering}
              >
                {discovering ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.searchButtonText}>🔍 Buscar ESP32</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Lista de dispositivos */}
        {!connectedDevice && devices.length > 0 && (
          <View style={styles.devicesCard}>
            <Text style={styles.devicesTitle}>Dispositivos encontrados:</Text>
            <FlatList
              data={devices}
              renderItem={renderDevice}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          </View>
        )}

        {/* Contador de pasos */}
        {connectedDevice && (
          <>
            <View style={[styles.stepsCard, { borderLeftColor: getStepsStatusColor(), borderLeftWidth: 4 }]}>
              <Text style={styles.stepsTitle}>Pasos de hoy</Text>
              
              <View style={styles.stepsDisplay}>
                <Text style={[styles.stepsCount, { color: getStepsStatusColor() }]}>
                  {pedometerData.steps.toLocaleString()}
                </Text>
                <Text style={styles.stepsGoal}>de 10,000 pasos</Text>
              </View>

              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { 
                  width: `${Math.min((pedometerData.steps / 10000) * 100, 100)}%`,
                  backgroundColor: getStepsStatusColor()
                }]} />
              </View>

              <Text style={styles.progressText}>
                {((pedometerData.steps / 10000) * 100).toFixed(1)}% completado
              </Text>

              <View style={styles.additionalInfo}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Calorías</Text>
                  <Text style={styles.infoValue}>{pedometerData.calories.toFixed(0)}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Distancia</Text>
                  <Text style={styles.infoValue}>{pedometerData.distance.toFixed(2)} km</Text>
                </View>
              </View>
            </View>

            {/* Mensaje motivacional */}
            <View style={styles.motivationCard}>
              <Text style={styles.motivationText}>{getMotivationalMessage()}</Text>
            </View>

            {/* Controles */}
            <View style={styles.controlsCard}>
              <Text style={styles.controlsTitle}>Controles ESP32</Text>
              
              <View style={styles.controlsGrid}>
                <TouchableOpacity 
                  style={[styles.controlButton, styles.startButton]}
                  onPress={() => sendCommand('start')}
                  disabled={sendingCommand}
                >
                  <Text style={styles.controlIcon}>▶️</Text>
                  <Text style={styles.controlText}>Iniciar</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.controlButton, styles.stopButton]}
                  onPress={() => sendCommand('stop')}
                  disabled={sendingCommand}
                >
                  <Text style={styles.controlIcon}>⏸️</Text>
                  <Text style={styles.controlText}>Pausar</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.controlButton, styles.syncButton]}
                  onPress={() => sendCommand('send')}
                  disabled={sendingCommand}
                >
                  <Text style={styles.controlIcon}>🔄</Text>
                  <Text style={styles.controlText}>Sincronizar</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.controlButton, styles.resetButton]}
                  onPress={() => {
                    Alert.alert(
                      '⚠️ Confirmar Reset',
                      '¿Reiniciar el contador de pasos?',
                      [
                        { text: 'Cancelar', style: 'cancel' },
                        { text: 'Reiniciar', onPress: () => sendCommand('reset') }
                      ]
                    );
                  }}
                  disabled={sendingCommand}
                >
                  <Text style={styles.controlIcon}>🔄</Text>
                  <Text style={styles.controlText}>Reset</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Última actualización */}
            {pedometerData.lastUpdate && (
              <View style={styles.lastUpdateCard}>
                <Text style={styles.lastUpdateText}>
                  📅 Última actualización: {new Date(pedometerData.lastUpdate).toLocaleString('es-ES')}
                </Text>
              </View>
            )}
          </>
        )}

        {/* Ayuda para conexión */}
        {!connectedDevice && (
          <View style={styles.helpCard}>
            <Text style={styles.helpTitle}>📱 Cómo conectar tu ESP32:</Text>
            <Text style={styles.helpText}>1. Asegúrate de que el ESP32 esté encendido</Text>
            <Text style={styles.helpText}>2. Ve a Configuración → Bluetooth en tu teléfono</Text>
            <Text style={styles.helpText}>3. Busca &quot;PodometroESP32&quot; y empareja</Text>
            <Text style={styles.helpText}>4. Regresa aquí y presiona &quot;Buscar ESP32&quot;</Text>
            <Text style={styles.helpText}>5. Selecciona tu dispositivo de la lista</Text>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <BottomNavbar activeTab="steps" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#7A9B57',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF5722',
    marginBottom: 15,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: '#7A9B57',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#7A9B57',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    color: '#F5F5DC',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#F5F5DC',
    fontSize: 14,
    opacity: 0.9,
    marginTop: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  connectionCard: {
    backgroundColor: '#F5F5DC',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  connectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  connectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
  },
  batteryText: {
    fontSize: 12,
    color: '#666666',
  },
  deviceInfo: {
    marginTop: 5,
  },
  connectedDeviceName: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 2,
  },
  deviceStatus: {
    fontSize: 12,
    color: '#888888',
    marginBottom: 8,
  },
  disconnectButton: {
    backgroundColor: '#FF5722',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  disconnectText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  searchContainer: {
    marginTop: 10,
  },
  searchButton: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  devicesCard: {
    backgroundColor: '#F5F5DC',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  devicesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 10,
  },
  deviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  deviceName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  deviceAddress: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
  connectText: {
    color: '#2196F3',
    fontSize: 12,
    fontWeight: '600',
  },
  stepsCard: {
    backgroundColor: '#F5F5DC',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stepsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 15,
    textAlign: 'center',
  },
  stepsDisplay: {
    alignItems: 'center',
    marginBottom: 15,
  },
  stepsCount: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  stepsGoal: {
    fontSize: 16,
    color: '#666666',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginVertical: 15,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#666666',
    marginBottom: 15,
  },
  additionalInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  infoItem: {
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  motivationCard: {
    backgroundColor: '#E8F5E8',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  motivationText: {
    fontSize: 14,
    color: '#2E7D32',
    textAlign: 'center',
    lineHeight: 20,
  },
  controlsCard: {
    backgroundColor: '#F5F5DC',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  controlsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 15,
    textAlign: 'center',
  },
  controlsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  controlButton: {
    width: '48%',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  stopButton: {
    backgroundColor: '#FF9800',
  },
  syncButton: {
    backgroundColor: '#2196F3',
  },
  resetButton: {
    backgroundColor: '#FF5722',
  },
  controlIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  controlText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  lastUpdateCard: {
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
  },
  lastUpdateText: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
  },
  helpCard: {
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#E65100',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 12,
    color: '#BF360C',
    marginBottom: 4,
    lineHeight: 16,
  },
  bottomSpacer: {
    height: 100,
  },
});

export default ActivityScreen;