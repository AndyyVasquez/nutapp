// hooks/useScale.js - Hook corregido para gestionar la báscula IoT
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

const SERVER_API_URL = 'https://nutweb.onrender.com';

// Interfaces para TypeScript
interface ScaleData {
  connected: boolean;
  weight: number;
  lastUpdate: string | null;
  calibrated: boolean;
  isWeighing: boolean;
  currentFood: any;
  targetWeight: number;
}

interface ScaleAssignment {
  user_id: number;
  user_name: string;
  device_id: string;
  assigned_at: string;
  status: string;
}

interface UseScaleReturn {
  scaleData: ScaleData;
  assignment: ScaleAssignment | null;
  loading: boolean;
  error: string | null;
  
  // Funciones
  checkScaleStatus: () => Promise<void>;
  checkAssignment: () => Promise<void>;
  assignScale: () => Promise<boolean>;
  releaseScale: () => Promise<boolean>;
  startWeighing: (foodData: any) => Promise<boolean>;
  stopWeighing: () => Promise<boolean>;
  tareScale: () => Promise<boolean>;
  refreshData: () => Promise<void>;
}

const useScale = (): UseScaleReturn => {
  const [scaleData, setScaleData] = useState<ScaleData>({
    connected: false,
    weight: 0,
    lastUpdate: null,
    calibrated: false,
    isWeighing: false,
    currentFood: null,
    targetWeight: 0
  });
  
  const [assignment, setAssignment] = useState<ScaleAssignment | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [userName, setUserName] = useState<string>('');

  // Cargar datos del usuario al inicializar
  useEffect(() => {
    loadUserData();
  }, []);

  // Cargar datos del usuario desde AsyncStorage
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
      setError('Error cargando datos del usuario');
    }
  };

  // Función helper para manejar errores de fetch
  const handleFetchError = (error: any, operation: string): void => {
    let errorMessage = `Error en ${operation}`;
    
    if (error.name === 'SyntaxError' && error.message.includes('JSON Parse')) {
      errorMessage = `Servidor devolvió respuesta inválida en ${operation}`;
    } else if (error.message) {
      errorMessage = `${operation}: ${error.message}`;
    }
    
    console.error(`❌ ${errorMessage}:`, error);
    setError(errorMessage);
  };

  // Función helper para hacer requests con mejor manejo de errores
  const makeRequest = async (url: string, options: RequestInit = {}): Promise<any> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const text = await response.text();
      
      // Verificar si es JSON válido
      if (!text.trim()) {
        throw new Error('Respuesta vacía del servidor');
      }

      if (text.startsWith('<')) {
        throw new Error('Servidor devolvió HTML en lugar de JSON (posible error 404/500)');
      }

      try {
        return JSON.parse(text);
      } catch (parseError) {
        console.error('❌ Respuesta no es JSON válido:', text.substring(0, 200));
        throw new Error('Respuesta del servidor no es JSON válido');
      }

    } catch (fetchError : any) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        throw new Error('Timeout: El servidor tardó demasiado en responder');
      }
      
      throw fetchError;
    }
  };

  // Verificar estado de la báscula
  const checkScaleStatus = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      console.log('📱 Verificando estado de báscula...');

      const result = await makeRequest(`${SERVER_API_URL}/api/iot/scale/status`);

      if (result.success) {
        setScaleData({
          connected: result.connected || false,
          weight: result.weight || 0,
          lastUpdate: result.lastUpdate,
          calibrated: result.calibrated || false,
          isWeighing: result.isWeighing || false,
          currentFood: result.currentFood,
          targetWeight: result.targetWeight || 0
        });

        console.log('⚖️ Estado báscula actualizado:', {
          connected: result.connected,
          weight: result.weight,
          isWeighing: result.isWeighing
        });
      } else {
        throw new Error(result.message || 'Error obteniendo estado de báscula');
      }
    } catch (error) {
      handleFetchError(error, 'verificar estado báscula');
    } finally {
      setLoading(false);
    }
  };

  // Verificar asignación actual
  const checkAssignment = async (): Promise<void> => {
    try {
      if (!userId) return;

      console.log('📱 Verificando asignación de báscula...');

      const result = await makeRequest(`${SERVER_API_URL}/api/iot/scale/assignments`);

      if (result.success) {
        const userAssignment = result.assignments.find(
          (a: ScaleAssignment) => a.user_id === userId
        );

        // Asegurar device_id válido
        if (userAssignment && !userAssignment.device_id) {
          userAssignment.device_id = 'default';
        }

        setAssignment(userAssignment || null);
        console.log('⚖️ Verificación asignación:', userAssignment ? 'Asignada' : 'Sin asignar');
      } else {
        console.warn('⚠️ Error en respuesta de asignaciones:', result.message);
      }
    } catch (error) {
      handleFetchError(error, 'verificar asignación báscula');
    }
  };

  // Asignar báscula al usuario
  const assignScale = async (): Promise<boolean> => {
    if (!userId || !userName) {
      setError('Datos de usuario no disponibles');
      return false;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('📱 Asignando báscula...');

      const result = await makeRequest(`${SERVER_API_URL}/api/iot/scale/assign`, {
        method: 'POST',
        body: JSON.stringify({
          user_id: userId,
          user_name: userName,
          device_id: 'default'
        }),
      });

      if (result.success) {
        const newAssignment: ScaleAssignment = {
          ...result.assignment,
          device_id: result.assignment.device_id || 'default'
        };

        setAssignment(newAssignment);
        console.log('✅ Báscula asignada exitosamente');
        return true;
      } else {
        throw new Error(result.message || 'Error asignando báscula');
      }
    } catch (error) {
      handleFetchError(error, 'asignar báscula');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Liberar báscula
  const releaseScale = async (): Promise<boolean> => {
    if (!assignment) {
      setError('No hay báscula asignada');
      return false;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('📱 Liberando báscula...');

      const result = await makeRequest(`${SERVER_API_URL}/api/iot/scale/release`, {
        method: 'POST',
        body: JSON.stringify({
          user_id: userId,
          device_id: assignment.device_id || 'default'
        }),
      });

      if (result.success) {
        setAssignment(null);
        setScaleData(prev => ({
          ...prev,
          isWeighing: false,
          currentFood: null,
          targetWeight: 0
        }));
        console.log('✅ Báscula liberada exitosamente');
        return true;
      } else {
        throw new Error(result.message || 'Error liberando báscula');
      }
    } catch (error) {
      handleFetchError(error, 'liberar báscula');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Iniciar proceso de pesado
  const startWeighing = async (foodData: any): Promise<boolean> => {
    if (!assignment) {
      setError('No hay báscula asignada');
      return false;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('📱 Iniciando pesado...');

      const result = await makeRequest(`${SERVER_API_URL}/api/iot/scale/start-weighing`, {
        method: 'POST',
        body: JSON.stringify({
          user_id: userId,
          device_id: assignment.device_id || 'default',
          food_name: foodData.name,
          target_weight: foodData.targetWeight || 100,
          food_calories_per_100g: foodData.calories,
          food_info: foodData
        }),
      });

      if (result.success) {
        setScaleData(prev => ({
          ...prev,
          isWeighing: true,
          currentFood: result.food_info,
          targetWeight: result.target_weight
        }));
        console.log('✅ Pesado iniciado para:', foodData.name);
        return true;
      } else {
        throw new Error(result.message || 'Error iniciando pesado');
      }
    } catch (error) {
      handleFetchError(error, 'iniciar pesado');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Detener proceso de pesado
  const stopWeighing = async (): Promise<boolean> => {
    if (!assignment) {
      setError('No hay báscula asignada');
      return false;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('📱 Deteniendo pesado...');

      const result = await makeRequest(`${SERVER_API_URL}/api/iot/scale/stop-weighing`, {
        method: 'POST',
        body: JSON.stringify({
          user_id: userId,
          device_id: assignment.device_id || 'default'
        }),
      });

      if (result.success) {
        setScaleData(prev => ({
          ...prev,
          isWeighing: false,
          currentFood: null,
          targetWeight: 0,
          weight: result.final_weight || prev.weight
        }));
        console.log('✅ Pesado detenido, peso final:', result.final_weight);
        return true;
      } else {
        throw new Error(result.message || 'Error deteniendo pesado');
      }
    } catch (error) {
      handleFetchError(error, 'detener pesado');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Tarar báscula
  const tareScale = async (): Promise<boolean> => {
    if (!assignment) {
      setError('No hay báscula asignada');
      return false;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('📱 Enviando comando de tara...');

      const result = await makeRequest(`${SERVER_API_URL}/api/iot/scale/tare`, {
        method: 'POST',
        body: JSON.stringify({
          user_id: userId,
          device_id: assignment.device_id || 'default'
        }),
      });

      if (result.success) {
        console.log('✅ Comando de tara enviado');
        
        // Actualizar estado después de un delay
        setTimeout(() => {
          checkScaleStatus();
        }, 2000);
        
        return true;
      } else {
        throw new Error(result.message || 'Error enviando tara');
      }
    } catch (error) {
      handleFetchError(error, 'enviar tara');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Refrescar todos los datos
  const refreshData = async (): Promise<void> => {
    try {
      console.log('🔄 Refrescando datos de báscula...');
      await Promise.all([
        checkScaleStatus(),
        checkAssignment()
      ]);
    } catch (error) {
      console.error('❌ Error refrescando datos báscula:', error);
    }
  };

  return {
    scaleData,
    assignment,
    loading,
    error,
    
    checkScaleStatus,
    checkAssignment,
    assignScale,
    releaseScale,
    startWeighing,
    stopWeighing,
    tareScale,
    refreshData
  };
};

export default useScale;