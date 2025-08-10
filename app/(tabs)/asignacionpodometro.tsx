import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const SERVER_API_URL = 'https://nutweb.onrender.com';

// Interfaces para TypeScript
interface Assignment {
  user_id: number;
  user_name: string;
  device_id: string;
  assigned_at: string;
  status: string;
  duration_minutes?: number;
}

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  onAssigned?: (assignment: Assignment) => void;
}

const PedometerAssignmentModal: React.FC<ModalProps> = ({ visible, onClose, onAssigned }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [availableDevices, setAvailableDevices] = useState<number>(0);
  const [currentAssignment, setCurrentAssignment] = useState<Assignment | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [userName, setUserName] = useState<string>('');

  useEffect(() => {
    if (visible) {
      loadUserData();
      checkAvailableDevices();
      checkCurrentAssignment();
    }
  }, [visible]);

  const loadUserData = async (): Promise<void> => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        setUserId(user.id || user.id_cli);
        setUserName(user.nombre || user.nombre_completo || 'Usuario');
      }
    } catch (error) {
      console.error('Error cargando datos del usuario:', error);
    }
  };

  const checkAvailableDevices = async (): Promise<void> => {
    try {
      const response = await fetch(`${SERVER_API_URL}/api/iot/pedometer/available`);
      const result = await response.json();
      
      if (result.success) {
        setAvailableDevices(result.available_devices || 0);
      }
    } catch (error) {
      console.error('Error verificando dispositivos:', error);
    }
  };

  const checkCurrentAssignment = async (): Promise<void> => {
    try {
      const response = await fetch(`${SERVER_API_URL}/api/iot/pedometer/assignments`);
      const result = await response.json();
      
      if (result.success) {
        const myAssignment = result.assignments.find((a: Assignment) => a.user_id === userId);
        setCurrentAssignment(myAssignment || null);
      }
    } catch (error) {
      console.error('Error verificando asignación:', error);
    }
  };

  const assignPedometer = async (): Promise<void> => {
    if (!userId || !userName) {
      Alert.alert('Error', 'No se pudieron cargar los datos del usuario');
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch(`${SERVER_API_URL}/api/iot/pedometer/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          user_name: userName,
          device_id: 'default' // Usar 'default' como device_id estándar
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Asegurar que la asignación tiene device_id
        const assignment: Assignment = {
          ...result.assignment,
          device_id: result.assignment.device_id || 'default'
        };
        
        Alert.alert(
          '✅ Podómetro Asignado',
          `Podómetro vinculado exitosamente a ${userName}`,
          [
            {
              text: 'OK',
              onPress: () => {
                setCurrentAssignment(assignment);
                onAssigned && onAssigned(assignment);
                onClose();
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', result.message || 'No se pudo asignar el podómetro');
      }

    } catch (error) {
      console.error('Error asignando podómetro:', error);
      Alert.alert('Error', 'Error de conexión al servidor');
    } finally {
      setLoading(false);
    }
  };

  const releasePedometer = async (): Promise<void> => {
    if (!currentAssignment) return;

    Alert.alert(
      'Liberar Podómetro',
      '¿Estás seguro de que quieres liberar el podómetro? Se perderán los datos no guardados.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Liberar', 
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            
            try {
              const response = await fetch(`${SERVER_API_URL}/api/iot/pedometer/release`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  user_id: userId,
                  device_id: currentAssignment.device_id || 'default'
                }),
              });

              const result = await response.json();

              if (result.success) {
                setCurrentAssignment(null);
                Alert.alert('✅ Liberado', 'Podómetro liberado exitosamente');
                checkAvailableDevices();
              } else {
                Alert.alert('Error', result.message || 'No se pudo liberar el podómetro');
              }

            } catch (error) {
              console.error('Error liberando podómetro:', error);
              Alert.alert('Error', 'Error de conexión al servidor');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const sendCommand = async (command: string): Promise<void> => {
    if (!currentAssignment) return;

    setLoading(true);
    
    try {
      const response = await fetch(`${SERVER_API_URL}/api/iot/pedometer/command`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          command: command,
          user_id: userId,
          device_id: currentAssignment.device_id || 'default'
        }),
      });

      const result = await response.json();

      if (result.success) {
        Alert.alert('✅ Comando Enviado', `Comando '${command}' enviado al podómetro`);
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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Gestión de Podómetro</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Información del usuario */}
          <View style={styles.userInfo}>
            <Icon name="person-circle" size={40} color="#7A9B57" />
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{userName}</Text>
              <Text style={styles.userId}>ID: {userId}</Text>
            </View>
          </View>

          {/* Estado actual */}
          <View style={styles.statusSection}>
            <Text style={styles.sectionTitle}>Estado Actual</Text>
            
            {currentAssignment ? (
              <View style={styles.assignedCard}>
                <View style={styles.statusRow}>
                  <Icon name="watch" size={20} color="#4CAF50" />
                  <Text style={styles.statusText}>Podómetro Asignado</Text>
                </View>
                <Text style={styles.assignmentDetails}>
                  Dispositivo: {currentAssignment.device_id}
                </Text>
                <Text style={styles.assignmentDetails}>
                  Asignado: {new Date(currentAssignment.assigned_at).toLocaleString('es-ES')}
                </Text>
                
                {/* Controles del podómetro */}
                
              </View>
            ) : (
              <View style={styles.unassignedCard}>
                <View style={styles.statusRow}>
                  <Icon name="watch-outline" size={20} color="#F44336" />
                  <Text style={styles.statusText}>Sin Podómetro Asignado</Text>
                </View>
                <Text style={styles.availableText}>
                  Dispositivos disponibles: {availableDevices}
                </Text>
              </View>
            )}
          </View>

          {/* Botones de acción */}
          <View style={styles.actionButtons}>
            {currentAssignment ? (
              <TouchableOpacity
                style={[styles.actionButton, styles.releaseButton]}
                onPress={releasePedometer}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Icon name="unlink" size={20} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Liberar Podómetro</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.actionButton, styles.assignButton]}
                onPress={assignPedometer}
                disabled={loading || availableDevices === 0}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Icon name="link" size={20} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>
                      {availableDevices > 0 ? 'Asignar Podómetro' : 'No Hay Dispositivos'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={[styles.actionButton, styles.refreshButton]}
              onPress={() => {
                checkAvailableDevices();
                checkCurrentAssignment();
              }}
              disabled={loading}
            >
              <Icon name="refresh-outline" size={20} color="#666" />
              <Text style={[styles.actionButtonText, { color: '#666' }]}>
                Actualizar Estado
              </Text>
            </TouchableOpacity>
          </View>

          {/* Información adicional */}
          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>💡 Información</Text>
            <Text style={styles.infoText}>
              • El podómetro se libera automáticamente después de 6 horas de inactividad
            </Text>
            <Text style={styles.infoText}>
              • Los datos se sincronizan cada 30 segundos cuando está activo
            </Text>
            <Text style={styles.infoText}>
              • Asegúrate de tener el dispositivo ESP32 encendido y conectado
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
  },
  userDetails: {
    marginLeft: 15,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  userId: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  statusSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  assignedCard: {
    backgroundColor: '#E8F5E8',
    borderRadius: 10,
    padding: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  unassignedCard: {
    backgroundColor: '#FFEBEE',
    borderRadius: 10,
    padding: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
    color: '#333',
  },
  assignmentDetails: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  availableText: {
    fontSize: 12,
    color: '#666',
  },
  controlButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 15,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    flex: 1,
    marginHorizontal: 5,
    justifyContent: 'center',
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
    marginLeft: 4,
  },
  actionButtons: {
    gap: 10,
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    gap: 8,
  },
  assignButton: {
    backgroundColor: '#7A9B57',
  },
  releaseButton: {
    backgroundColor: '#F44336',
  },
  refreshButton: {
    backgroundColor: '#E0E0E0',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  infoSection: {
    backgroundColor: '#E3F2FD',
    borderRadius: 10,
    padding: 15,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#1976D2',
    lineHeight: 18,
    marginBottom: 4,
  },
});

export default PedometerAssignmentModal;