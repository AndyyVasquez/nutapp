import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, toZonedTime } from 'date-fns-tz';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Icon2 from 'react-native-vector-icons/AntDesign';
import Icon from 'react-native-vector-icons/FontAwesome6';
import Icon3 from 'react-native-vector-icons/Ionicons';
import PedometerAssignmentModal from './asignacionpodometro'; // Importar el nuevo modal
import BottomNavbar from './navbar';


const timezone = 'America/Mexico_City';
const now = new Date();
const zonedDate = toZonedTime(now, timezone);
const formattedTime = format(zonedDate, 'HH:mm:ss', { timeZone: timezone });


const { width } = Dimensions.get('window');

// Configuración del servidor
const SERVER_API_URL = 'https://nutweb.onrender.com';

// Interfaces para TypeScript
interface PedometerData {
  pasos: number;
  calorias_gastadas: number;
  distancia_km: number;
  meta_diaria: number;
  dispositivo: string;
  connected: boolean;
  lastUpdate: string | null;
}

interface DeviceAssignment {
  user_id: number;
  user_name: string;
  device_id: string;
  assigned_at: string;
  status: string;
  duration_minutes?: number;
}

const RegistroPasos = () => {
  const [pedometerData, setPedometerData] = useState<PedometerData>({
    pasos: 0,
    calorias_gastadas: 0,
    distancia_km: 0,
    meta_diaria: 10000,
    dispositivo: 'Podómetro ESP32',
    connected: false,
    lastUpdate: null
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [assignmentModalVisible, setAssignmentModalVisible] = useState<boolean>(false);
  const [deviceAssignment, setDeviceAssignment] = useState<DeviceAssignment | null>(null);

  // Obtener ID del usuario desde AsyncStorage
  const getUserId = async (): Promise<number> => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        const id = user.id || user.id_cli || 1;
        setUserId(id);
        return id;
      }
      return 1;
    } catch (error) {
      console.error('Error obteniendo usuario:', error);
      return 1;
    }
  };

  // Verificar si el usuario tiene un podómetro asignado
  const checkDeviceAssignment = async (): Promise<DeviceAssignment | null> => {
    try {
      const currentUserId = userId || await getUserId();
      
      const response = await fetch(`${SERVER_API_URL}/api/iot/pedometer/assignments`);
      const result = await response.json();
      
      if (result.success) {
        const userAssignment = result.assignments.find(
          (a: DeviceAssignment) => a.user_id === currentUserId
        );
        
        // Asegurar que la asignación tiene un device_id válido
        if (userAssignment && !userAssignment.device_id) {
          userAssignment.device_id = 'default';
        }
        
        setDeviceAssignment(userAssignment || null);
        return userAssignment || null;
      }
      return null;
    } catch (error) {
      console.error('Error verificando asignación:', error);
      return null;
    }
  };

  // Función para obtener datos de MongoDB
  const fetchPedometerData = async (showLoader: boolean = true): Promise<void> => {
    try {
      if (showLoader) setLoading(true);
      
      const currentUserId = userId || await getUserId();
      
      // FORZAR fecha actual del sistema
      const today = new Date();
      const todayString = today.getFullYear() + '-' + 
                         String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                         String(today.getDate()).padStart(2, '0');
      
      console.log('📱 Obteniendo datos de pasos para usuario:', currentUserId, 'fecha:', todayString);
      
      const fullUrl = `${SERVER_API_URL}/api/iot/pedometer/steps/mongo/${currentUserId}?fecha=${todayString}`;
      console.log('🌐 URL completa:', fullUrl);
      
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('📱 Respuesta del servidor:', result);
      
      if (result.success && result.data && Object.keys(result.data).length > 1) {
        // Hay datos para hoy
        console.log('✅ Procesando datos encontrados...');
        
        const newData: Partial<PedometerData> = {
          pasos: result.data.pasos || 0,
          calorias_gastadas: result.data.calorias_gastadas || 0,
          distancia_km: result.data.distancia_km || 0,
          dispositivo: result.data.dispositivo || 'Podómetro ESP32',
          connected: (result.data.pasos || 0) > 0,
        //  lastUpdate: result.data.hora_ultima_actualizacion || formattedTime
};

        
        console.log('📊 Nuevos datos calculados:', newData);
        
        setPedometerData(prevData => ({
          ...prevData,
          ...newData
        }));
        
        console.log('✅ Datos actualizados:', result.data.pasos, 'pasos');
      } else {
        // No hay datos para hoy
        console.log('📱 No hay datos para hoy');
        
        setPedometerData(prevData => ({
          ...prevData,
          pasos: 0,
          calorias_gastadas: 0,
          distancia_km: 0,
          connected: false,
          lastUpdate: null
        }));
      }
      
      setError(null);
    } catch (error) {
      console.error('❌ Error obteniendo datos:', error);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : String(error);
      
      console.log("Error al obtener datos:", errorMessage);
      setError('No se pudieron cargar los datos del podómetro');
      Alert.alert('Error', 'No se pudieron cargar los datos del podómetro');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Función corregida para enviar comandos al podómetro
  const sendPedometerCommand = async (command: string): Promise<void> => {
    // Verificar que hay un dispositivo asignado
    if (!deviceAssignment) {
      Alert.alert('Sin Dispositivo', 'Primero debes asignar un podómetro');
      return;
    }

    // Verificar que el dispositivo tiene un device_id válido
    if (!deviceAssignment.device_id) {
      Alert.alert('Error', 'El dispositivo asignado no tiene un ID válido');
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch(`${SERVER_API_URL}/api/iot/pedometer/command`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          command: command,
          user_id: userId,
          device_id: deviceAssignment.device_id || 'default' // Fallback a 'default'
        }),
      });

      const result = await response.json();

      if (result.success) {
        Alert.alert('✅ Comando Enviado', `Comando '${command}' enviado exitosamente`);
        
        // Actualizar datos después de enviar comando
        setTimeout(() => {
          fetchPedometerData(false);
        }, 2000);
      } else {
        Alert.alert('Error', result.message || 'No se pudo enviar el comando');
      }

    } catch (error) {
      console.error('Error enviando comando:', error);
      Alert.alert('Error', 'Error de conexión al servidor');
    } finally {
      setLoading(false);
    }
  };

  // Función para manejar la vinculación/gestión del dispositivo
  const handleDeviceManagement = (): void => {
    setAssignmentModalVisible(true);
  };

  // Callback cuando se asigna un dispositivo
  const handleDeviceAssigned = (assignment: DeviceAssignment): void => {
    // Asegurar que la asignación tiene un device_id válido
    if (assignment && !assignment.device_id) {
      assignment.device_id = 'default';
    }
    
    setDeviceAssignment(assignment);
    setPedometerData(prevData => ({
      ...prevData,
      connected: true,
      dispositivo: `ESP32 (${assignment?.device_id || 'default'})`
    }));
  };

  // Función para refrescar datos
  const onRefresh = (): void => {
    setRefreshing(true);
    fetchPedometerData(false);
    checkDeviceAssignment();
  };

  // Cargar datos al iniciar
  useEffect(() => {
    const initializeData = async (): Promise<void> => {
      await getUserId();
      await checkDeviceAssignment();
      fetchPedometerData();
    };
    
    initializeData();
  }, []);

  // Verificar asignación periódicamente
  useEffect(() => {
    const interval = setInterval(() => {
      checkDeviceAssignment();
    }, 30000); // Cada 30 segundos

    return () => clearInterval(interval);
  }, [userId]);

  // Calcular estadísticas
  const progressPercentage = Math.min((pedometerData.pasos / pedometerData.meta_diaria) * 100, 100);
  const remainingSteps = Math.max(pedometerData.meta_diaria - pedometerData.pasos, 0);
  const isGoalReached = pedometerData.pasos >= pedometerData.meta_diaria;

  if (loading && !pedometerData.pasos) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7A9B57" />
        <Text style={styles.loadingText}>Cargando datos del podómetro...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Actividad Física</Text>
      </View>

      <ScrollView 
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#7A9B57']}
            tintColor="#7A9B57"
          />
        }
      >
        <View style={styles.content}>
          {/* Título */}
          <Text style={styles.title}>Pasos diarios</Text>
          
          {/* Contador principal */}
          <View style={styles.mainCounter}>
            <Text style={styles.stepsNumber}>
              {pedometerData.pasos.toLocaleString()}
            </Text>
            <Text style={styles.stepsLabel}>pasos de hoy</Text>
            
            {/* Barra de progreso */}
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill,
                    { 
                      width: `${progressPercentage}%`,
                      backgroundColor: isGoalReached ? '#4CAF50' : '#7A9B57'
                    }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>
                Meta: {pedometerData.meta_diaria.toLocaleString()} pasos ({progressPercentage.toFixed(1)}%)
              </Text>
              
              {isGoalReached ? (
                <Text style={styles.goalReached}>🎉 ¡Meta alcanzada!</Text>
              ) : (
                <Text style={styles.remainingSteps}>
                  Faltan {remainingSteps.toLocaleString()} pasos
                </Text>
              )}
            </View>
          </View>

          {/* Estadísticas adicionales */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{Math.round(pedometerData.calorias_gastadas)}</Text>
              <Text style={styles.statLabel}>Calorías</Text>
              <Icon name="fire-flame-curved" size={20} color="#FF6B35" />
            </View>
            
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{pedometerData.distancia_km.toFixed(2)} km</Text>
              <Text style={styles.statLabel}>Distancia</Text>
              <Icon3 name="location-outline" size={20} color="#2196F3" />
            </View>
          </View>

          {/* Estado del dispositivo */}
          <View style={styles.deviceCard}>
            <View style={styles.deviceHeader}>
              <View>
                <Text style={styles.deviceTitle}>
                  {deviceAssignment ? 'Podómetro Asignado' : 'Gestionar Podómetro'}
                </Text>
                <Text style={styles.deviceSubtitle}>
                  {deviceAssignment ? 
                    `Dispositivo: ${deviceAssignment.device_id}` : 
                    'Sin dispositivo asignado'
                  }
                </Text>
              </View>
              <View style={[
                styles.statusIndicator,
                { backgroundColor: deviceAssignment ? '#4CAF50' : '#F44336' }
              ]} />
            </View>
            
            {/* Imagen del dispositivo */}
            <View style={styles.deviceImageContainer}>
              <View style={styles.deviceImage}>
                <Text style={styles.deviceDisplay}>
                  {pedometerData.pasos.toLocaleString()}
                </Text>
                <Text style={styles.deviceDisplayLabel}>STEPS</Text>
                <Text style={styles.deviceIcon}>🚶‍♂️</Text>
              </View>
            </View>
            
            {/* Info del estado */}
            <View style={styles.deviceStatus}>
              <Text style={styles.statusText}>
                Estado: {deviceAssignment ? 
                  (pedometerData.connected ? 'Conectado y Activo' : 'Asignado') : 
                  'Sin Asignar'
                }
              </Text>
              
              {pedometerData.lastUpdate && (
                <Text style={styles.lastUpdate}>
                  {/* Última actualización: {pedometerData.lastUpdate} */}
                </Text>
              )}

              {deviceAssignment && (
                <Text style={styles.assignmentInfo}>
                  Asignado: {new Date(deviceAssignment.assigned_at).toLocaleString('es-ES')}
                </Text>
              )}
            </View>
            
            {/* Botón de gestión */}
            <TouchableOpacity
              style={[
                styles.connectButton,
                deviceAssignment ? styles.manageButton : styles.assignButton
              ]}
              onPress={handleDeviceManagement}
            >
              <Icon3 
                name={deviceAssignment ? "settings" : "link"} 
                size={16} 
                color="#FFFFFF" 
                style={{ marginRight: 8 }} 
              />
              <Text style={styles.connectButtonText}>
                {deviceAssignment ? 'Gestionar Dispositivo' : 'Asignar Podómetro'}
              </Text>
            </TouchableOpacity>
          </View>



          {/* Botones de acción */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => fetchPedometerData(true)}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Icon2 name="reload1" size={18} color="#FFFFFF" />
              )}
              <Text style={styles.actionButtonText}>Actualizar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={() => {
                checkDeviceAssignment();
                fetchPedometerData(false);
              }}
            >
              <Icon3 name="sync-outline" size={18} color="#666" />
              <Text style={[styles.actionButtonText, { color: '#666' }]}>Sincronizar</Text>
            </TouchableOpacity>
          </View>

          {/* Espacio para el navbar */}
          <View style={styles.navbarSpace} />
        </View>
      </ScrollView>

      {/* Modal de asignación de podómetro */}
      <PedometerAssignmentModal
        visible={assignmentModalVisible}
        onClose={() => setAssignmentModalVisible(false)}
        onAssigned={handleDeviceAssigned}
      />

      {/* Bottom Navigation */}
      <BottomNavbar activeTab="steps" />
    </View>
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
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#7A9B57',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  mainCounter: {
    alignItems: 'center',
    marginBottom: 30,
  },
  stepsNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  stepsLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  progressBarContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 12,
    backgroundColor: '#E0E0E0',
    borderRadius: 6,
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
    minWidth: 8,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  goalReached: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  remainingSteps: {
    fontSize: 12,
    color: '#999',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    gap: 15,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  deviceCard: {
    backgroundColor: '#FFF8DC',
    borderWidth: 2,
    borderColor: '#F0E68C',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  deviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  deviceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  deviceSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  deviceImageContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  deviceImage: {
    width: 100,
    height: 140,
    backgroundColor: '#E8E8E8',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD',
  },
  deviceDisplay: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  deviceDisplayLabel: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
  deviceIcon: {
    fontSize: 20,
    marginTop: 8,
  },
  deviceStatus: {
    alignItems: 'center',
    marginBottom: 15,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  lastUpdate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  assignmentInfo: {
    fontSize: 11,
    color: '#999',
  },
  connectButton: {
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  assignButton: {
    backgroundColor: '#7A9B57',
  },
  manageButton: {
    backgroundColor: '#2196F3',
  },
  connectButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  controlsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  controlsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  controlButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 10,
  },
  controlButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  pauseButton: {
    backgroundColor: '#FF9800',
  },
  resetButton: {
    backgroundColor: '#F44336',
  },
  controlButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 15,
    marginBottom: 20,
  },
  actionButton: {
    backgroundColor: '#7A9B57',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  secondaryButton: {
    backgroundColor: '#E0E0E0',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  navbarSpace: {
    height: 20,
  },
});

export default RegistroPasos;