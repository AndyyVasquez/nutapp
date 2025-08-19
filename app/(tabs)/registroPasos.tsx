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
  sincronizado_desde?: string;
  entry_id_thingspeak?: number;
}

interface UserAssignment {
  user_id: number;
  user_name: string;
  device_id: string;
  assigned_at: string;
  device_type: string;
  connection_type?: string;
}

interface SyncStats {
  total_documents: number;
  thingspeak_documents: number;
  sync_percentage: string;
  last_sync: {
    fecha: string;
    pasos: number;
    sincronizado_en: string;
    entry_id: number;
  } | null;
}

const RegistroPasos = () => {
  const [pedometerData, setPedometerData] = useState<PedometerData>({
    pasos: 0,
    calorias_gastadas: 0,
    distancia_km: 0,
    meta_diaria: 10000,
    dispositivo: 'Podómetro ESP32 (ThingSpeak)',
    connected: false,
    lastUpdate: null
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [userAssignment, setUserAssignment] = useState<UserAssignment | null>(null);
  const [syncStats, setSyncStats] = useState<SyncStats | null>(null);

  // Obtener ID del usuario desde AsyncStorage
  const getUserData = async (): Promise<{id: number, name: string}> => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        const id = user.id || user.id_cli || 3;
        const name = user.nombre || user.nombre_completo || `Usuario ${id}`;
        setUserId(id);
        setUserName(name);
        return { id, name };
      }
      return { id: 3, name: 'Usuario 3' };
    } catch (error) {
      console.error('Error obteniendo usuario:', error);
      return { id: 3, name: 'Usuario 3' };
    }
  };

  // 🔄 RUTA ACTUALIZADA: Verificar si este usuario específico está asignado
  const checkUserAssignment = async (): Promise<void> => {
    try {
      if (!userId) return;
      
      console.log('🔍 Verificando asignación de usuario...');
      
      // ✅ NUEVA RUTA: Verificar asignación específica del usuario
      const response = await fetch(`${SERVER_API_URL}/api/iot/pedometer/user-assignment/${userId}`);
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('🔍 Resultado verificación asignación:', result);
      
      if (result.success && result.is_assigned && result.assignment) {
        setUserAssignment({
          user_id: userId,
          user_name: userName,
          device_id: result.assignment.device_id,
          assigned_at: result.assignment.assigned_at,
          device_type: result.assignment.device_type || 'ESP32 + ThingSpeak',
          connection_type: result.assignment.connection_type || 'thingspeak'
        });
        console.log('✅ Usuario asignado al podómetro');
      } else {
        setUserAssignment(null);
        console.log('📱 Usuario NO está asignado al podómetro');
      }
    } catch (error) {
      console.error('❌ Error verificando asignación:', error);
      setUserAssignment(null);
    }
  };

  // 🔄 RUTA ACTUALIZADA: Asignar usuario al podómetro ThingSpeak
  const assignUserToPedometer = async (): Promise<void> => {
    try {
      if (!userId || !userName) {
        Alert.alert('Error', 'No se pudieron cargar los datos del usuario');
        return;
      }

      setLoading(true);
      
      console.log('📱 Asignando usuario al podómetro...', { userId, userName });

      // ✅ RUTA MANTENIDA PERO VERIFICADA
      const response = await fetch(`${SERVER_API_URL}/api/iot/pedometer/assign-to-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          user_name: userName,
          device_id: 'thingspeak_esp32'
        }),
      });

      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setUserAssignment(result.assignment);
        Alert.alert(
          '✅ Podómetro Asignado',
          `El podómetro ThingSpeak ha sido asignado a ${userName}. Los datos de pasos se sincronizarán automáticamente.`,
          [
            {
              text: 'OK',
              onPress: () => {
                // Actualizar datos después de la asignación
                fetchPedometerData(false);
                fetchSyncStats();
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', result.message || 'No se pudo asignar el podómetro');
      }

    } catch (error) {
      console.error('❌ Error asignando usuario:', error);
      Alert.alert('Error', 'Error de conexión al servidor');
    } finally {
      setLoading(false);
    }
  };

  // 🔄 RUTA ACTUALIZADA: Liberar asignación del podómetro
  const releaseUserAssignment = async (): Promise<void> => {
    try {
      Alert.alert(
        'Liberar Podómetro',
        '¿Estás seguro de que quieres liberar el podómetro? Otros usuarios podrán usarlo.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Liberar', 
            style: 'destructive',
            onPress: async () => {
              setLoading(true);
              
              try {
                // ✅ RUTA MANTENIDA
                const response = await fetch(`${SERVER_API_URL}/api/iot/pedometer/release-assignment`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    user_id: userId
                  }),
                });

                if (!response.ok) {
                  throw new Error(`Error del servidor: ${response.status}`);
                }

                const result = await response.json();

                if (result.success) {
                  setUserAssignment(null);
                  Alert.alert('✅ Liberado', 'Podómetro liberado exitosamente');
                  // Refrescar datos
                  await checkUserAssignment();
                } else {
                  Alert.alert('Error', result.message || 'No se pudo liberar el podómetro');
                }

              } catch (error) {
                console.error('❌ Error liberando asignación:', error);
                Alert.alert('Error', 'Error de conexión al servidor');
              } finally {
                setLoading(false);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('❌ Error en liberación:', error);
    }
  };

  // 🔄 RUTA ACTUALIZADA: Obtener datos de pasos desde MongoDB
  const fetchPedometerData = async (showLoader: boolean = true): Promise<void> => {
    try {
      if (showLoader) setLoading(true);
      
      const currentUserId = userId || (await getUserData()).id;
      
      // FORZAR fecha actual del sistema
      const today = new Date();
      const todayString = today.getFullYear() + '-' + 
                         String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                         String(today.getDate()).padStart(2, '0');
      
      console.log('📱 Obteniendo datos de pasos (ThingSpeak→MongoDB) para usuario:', currentUserId, 'fecha:', todayString);
      
      // ✅ RUTA MANTENIDA - Funciona correctamente
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
      
      // ✅ LÓGICA ACTUALIZADA: Verificar si hay datos válidos
      if (result.pasos !== undefined && result.pasos !== null) {
        // Hay datos para hoy (incluso si son 0)
        console.log('✅ Procesando datos encontrados...');
        
        const newData: Partial<PedometerData> = {
          pasos: result.pasos || 0,
          calorias_gastadas: result.calorias_gastadas || 0,
          distancia_km: result.distancia_km || 0,
          dispositivo: 'ESP32 (ThingSpeak)',
          connected: result.pasos > 0 || result.hora_ultima_actualizacion !== null,
          lastUpdate: result.hora_ultima_actualizacion || null,
          sincronizado_desde: 'thingspeak'
        };
        
        console.log('📊 Nuevos datos calculados:', newData);
        
        setPedometerData(prevData => ({
          ...prevData,
          ...newData
        }));
        
        console.log('✅ Datos actualizados:', result.pasos, 'pasos desde ThingSpeak');
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
      
      // No mostrar alerta en refresh automático
      if (showLoader) {
        Alert.alert('Error', 'No se pudieron cargar los datos del podómetro');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 🔄 RUTA ACTUALIZADA: Obtener estadísticas de sincronización
  const fetchSyncStats = async (): Promise<void> => {
    try {
      // ✅ RUTA MANTENIDA
      const response = await fetch(`${SERVER_API_URL}/api/sync/stats`);
      
      if (!response.ok) {
        console.warn('No se pudieron obtener estadísticas de sync');
        return;
      }
      
      const result = await response.json();
      
      if (result.success) {
        setSyncStats(result.stats);
        console.log('📊 Estadísticas de sincronización:', result.stats);
      }
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas de sync:', error);
    }
  };

  // 🔄 RUTA ACTUALIZADA: Forzar sincronización manual
  const forceSyncFromThingSpeak = async (): Promise<void> => {
    try {
      setLoading(true);
      
      console.log('🔄 Iniciando sincronización manual desde ThingSpeak...');
      
      // ✅ RUTA MANTENIDA
      const response = await fetch(`${SERVER_API_URL}/api/sync/thingspeak`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          results: 50,
          user_id: userId
        }),
      });

      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        Alert.alert(
          '✅ Sincronización Exitosa', 
          `Se procesaron ${result.processed} registros de ThingSpeak.\n\nErrores: ${result.errors || 0}`,
          [
            {
              text: 'OK',
              onPress: () => {
                // Actualizar datos después de la sincronización
                fetchPedometerData(false);
                fetchSyncStats();
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', result.message || 'No se pudo sincronizar con ThingSpeak');
      }

    } catch (error) {
      console.error('❌ Error en sincronización manual:', error);
      Alert.alert('Error', 'Error de conexión al servidor durante la sincronización');
    } finally {
      setLoading(false);
    }
  };

  // 🆕 NUEVA FUNCIÓN: Verificar estado del sistema
  const checkSystemStatus = async (): Promise<void> => {
    try {
      console.log('🔍 Verificando estado del sistema...');
      
      // ✅ NUEVA RUTA: Estado del sistema
      const response = await fetch(`${SERVER_API_URL}/api/iot/pedometer/system-status`);
      
      if (response.ok) {
        const result = await response.json();
        console.log('📊 Estado del sistema:', result);
        
        // Puedes usar esta información para mostrar alertas o recomendaciones
        if (result.recommendations && result.recommendations.length > 0) {
         const errorRecommendations = result.recommendations.filter((r: any) => r.type === 'error');
          if (errorRecommendations.length > 0) {
            console.warn('⚠️ Problemas del sistema:', errorRecommendations);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error verificando estado del sistema:', error);
    }
  };

  // Función para refrescar datos
  const onRefresh = (): void => {
    setRefreshing(true);
    fetchPedometerData(false);
    fetchSyncStats();
    checkUserAssignment();
    checkSystemStatus();
  };

  // Cargar datos al iniciar
  useEffect(() => {
    const initializeData = async (): Promise<void> => {
      await getUserData();
      await checkUserAssignment();
      fetchPedometerData();
      fetchSyncStats();
      checkSystemStatus();
    };
    
    initializeData();
  }, []);

  // Verificar asignación cuando cambie el userId
  useEffect(() => {
    if (userId) {
      checkUserAssignment();
    }
  }, [userId]);

  // Actualizar datos periódicamente cada 60 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('⏰ Actualizando datos automáticamente...');
      fetchPedometerData(false);
      fetchSyncStats();
      // No verificar asignación tan frecuentemente para evitar spam
    }, 60000); // Cada minuto

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
        <Text style={styles.loadingSubText}>Sincronizando desde ThingSpeak</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Actividad Física</Text>
        <Text style={styles.headerUser}>Usuario: {userName}</Text>
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

          {/* Estado de asignación del usuario */}
          <View style={styles.assignmentCard}>
            <View style={styles.assignmentHeader}>
              <View>
                <Text style={styles.assignmentTitle}>
                  {userAssignment ? 'Podómetro Asignado' : 'Gestionar Podómetro'}
                </Text>
                <Text style={styles.assignmentSubtitle}>
                  {userAssignment ? 
                    `Asignado a: ${userAssignment.user_name}` : 
                    'Ningún usuario asignado'
                  }
                </Text>
              </View>
              <View style={[
                styles.assignmentIndicator,
                { backgroundColor: userAssignment ? '#4CAF50' : '#FF9800' }
              ]} />
            </View>
            
            {/* Información del dispositivo ThingSpeak */}
            <View style={styles.deviceImageContainer}>
              <View style={styles.deviceImage}>
                <Text style={styles.deviceDisplay}>
                  {pedometerData.pasos.toLocaleString()}
                </Text>
                <Text style={styles.deviceDisplayLabel}>STEPS</Text>
                <Text style={styles.deviceIcon}>📶</Text>
              </View>
            </View>
            
            {/* Info del estado */}
            <View style={styles.assignmentStatus}>
              <Text style={styles.statusText}>
                Estado: {userAssignment ? 
                  (pedometerData.connected ? 'Datos Recibidos' : 'Esperando Datos') : 
                  'Sin Asignar'
                }
              </Text>
              
              {pedometerData.lastUpdate && (
                <Text style={styles.lastUpdate}>
                  Última actualización: {pedometerData.lastUpdate}
                </Text>
              )}

              {userAssignment && (
                <Text style={styles.assignmentInfo}>
                  Asignado: {new Date(userAssignment.assigned_at).toLocaleString('es-ES')}
                </Text>
              )}

             
            </View>
            
            {/* Botón de gestión */}
            <TouchableOpacity
              style={[
                styles.assignmentButton,
                userAssignment ? styles.releaseButton : styles.assignButton
              ]}
              onPress={userAssignment ? releaseUserAssignment : assignUserToPedometer}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Icon3 
                    name={userAssignment ? "unlink" : "link"} 
                    size={16} 
                    color="#FFFFFF" 
                    style={{ marginRight: 8 }} 
                  />
                  <Text style={styles.assignmentButtonText}>
                    {userAssignment ? 'Liberar Podómetro' : 'Asignar Podómetro'}
                  </Text>
                </>
              )}
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
              style={[styles.actionButton, styles.syncButton]}
              onPress={forceSyncFromThingSpeak}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Icon3 name="cloud-download-outline" size={18} color="#FFFFFF" />
              )}
              <Text style={styles.actionButtonText}>Sincronizar</Text>
            </TouchableOpacity>
          </View>

         

          {/* Espacio para el navbar */}
          <View style={styles.navbarSpace} />
        </View>
      </ScrollView>

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
  loadingSubText: {
    marginTop: 8,
    fontSize: 12,
    color: '#999',
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
  headerSubTitle: {
    fontSize: 12,
    color: '#E8F5E8',
    marginTop: 4,
  },
  headerUser: {
    fontSize: 11,
    color: '#D4E6C7',
    marginTop: 2,
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
  assignmentCard: {
    backgroundColor: '#E8F4FD',
    borderWidth: 2,
    borderColor: '#2196F3',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  assignmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  assignmentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  assignmentSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  assignmentIndicator: {
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
    backgroundColor: '#F0F8FF',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2196F3',
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
  assignmentStatus: {
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
    marginBottom: 3,
  },
  syncInfo: {
    fontSize: 11,
    color: '#2196F3',
    marginTop: 5,
  },
  assignmentButton: {
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
  releaseButton: {
    backgroundColor: '#F44336',
  },
  assignmentButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  syncStatsCard: {
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
  },
  syncStatsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  syncStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  syncStatItem: {
    alignItems: 'center',
  },
  syncStatNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF8F00',
  },
  syncStatLabel: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
  syncLastUpdate: {
    fontSize: 11,
    color: '#FF8F00',
    textAlign: 'center',
    marginTop: 5,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
  },
  actionButton: {
    backgroundColor: '#7A9B57',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    justifyContent: 'center',
  },
  syncButton: {
    backgroundColor: '#2196F3',
  },
  secondaryButton: {
    backgroundColor: '#E0E0E0',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#E8F5E8',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#2E7D32',
    lineHeight: 18,
    marginBottom: 4,
  },
  navbarSpace: {
    height: 20,
  },
});

export default RegistroPasos;