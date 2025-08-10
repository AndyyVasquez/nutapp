import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import BottomNavbar from './navbar';

// Configuración del servidor
const SERVER_API_URL = 'https://nutweb.onrender.com';

type Alimento = {
  nombre_alimento: string;
  calorias: string;
  cantidad_gramos: number;
  grupo_alimenticio: string;
};

type Tiempo = {
  id_tiempo: number;
  nombre_tiempo: keyof ConsumoHoy;
  alimentos: Alimento[];
};

type DietaActual = {
  id_dieta: number;
  nombre_dieta: string;
  objetivo_dieta: string;
  porcentaje_proteinas: number;
  porcentaje_carbs: number;
  porcentaje_grasas: number;
  calorias_objetivo: number;
  caloriasConsumidas?: number;
  tiempos: Tiempo[];
  recomendaciones?: string;
  fecha_creacion: string;
};

type ConsumoHoy = {
  desayuno: boolean;
  colacion1: boolean;
  comida: boolean;
  colacion2: boolean;
  cena: boolean;
};

const CaloriasDiariasScreen = () => {
  // Usar useLocalSearchParams en lugar de route.params
  const params = useLocalSearchParams();
  const router = useRouter();
  
  const [dietaActual, setDietaActual] = useState<DietaActual | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [idCliente, setIdCliente] = useState<string | null>(null);
  const [consumoHoy, setConsumoHoy] = useState<ConsumoHoy>({
    desayuno: false,
    colacion1: false,
    comida: false,
    colacion2: false,
    cena: false
  });

  // Obtener ID del cliente desde parámetros o AsyncStorage
  useEffect(() => {
    const obtenerIdCliente = async () => {
      try {
        // Primero intentar desde parámetros
        if (params?.idCliente) {
          setIdCliente(params.idCliente as string);
          return;
        }

        // Si no hay parámetros, obtener desde AsyncStorage
        const userData = await AsyncStorage.getItem('user');
        if (userData) {
          const user = JSON.parse(userData);
          setIdCliente(user.id_cli || user.id || null);
        }
      } catch (error) {
        console.error('Error obteniendo ID del cliente:', error);
        Alert.alert('Error', 'No se pudo identificar el usuario');
      }
    };

    obtenerIdCliente();
  }, [params]);

  useEffect(() => {
    if (idCliente) {
      cargarDietaActual();
    }
  }, [idCliente]);

  const cargarDietaActual = async () => {
    if (!idCliente) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('🍽️ Cargando dieta para cliente:', idCliente);
      
      // Llamada real a tu API
      const response = await fetch(`${SERVER_API_URL}/api/dieta-actual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idCliente: parseInt(idCliente) })
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data) {
          console.log('✅ Dieta cargada:', data);
          setDietaActual(data);
          // Calcular calorías consumidas basado en los tiempos completados
          calcularCaloriasConsumidas(data);
        } else {
          console.log('ℹ️ No hay dieta asignada');
          setDietaActual(null);
        }
      } else {
        console.error('❌ Error en respuesta del servidor:', response.status);
        Alert.alert('Error', 'No se pudo cargar la dieta actual');
      }
    } catch (error) {
      console.error('❌ Error al cargar dieta:', error);
      Alert.alert('Error', 'Error de conexión con el servidor');
      
      // Mostrar datos de ejemplo en caso de error para pruebas
      const dietaSimulada: DietaActual = {
        id_dieta: 1,
        nombre_dieta: 'Dieta Balanceada',
        objetivo_dieta: 'Mantener peso saludable',
        porcentaje_proteinas: 30,
        porcentaje_carbs: 50,
        porcentaje_grasas: 20,
        calorias_objetivo: 2000,
        fecha_creacion: new Date().toISOString(),
        tiempos: [
          {
            id_tiempo: 1,
            nombre_tiempo: 'desayuno',
            alimentos: [
              { nombre_alimento: 'Avena', calorias: '150', cantidad_gramos: 50, grupo_alimenticio: 'Cereales' },
              { nombre_alimento: 'Plátano', calorias: '90', cantidad_gramos: 100, grupo_alimenticio: 'Frutas' }
            ]
          },
          {
            id_tiempo: 2,
            nombre_tiempo: 'colacion1',
            alimentos: [
              { nombre_alimento: 'Yogurt natural', calorias: '100', cantidad_gramos: 125, grupo_alimenticio: 'Lácteos' }
            ]
          },
          {
            id_tiempo: 3,
            nombre_tiempo: 'comida',
            alimentos: [
              { nombre_alimento: 'Pechuga de pollo', calorias: '250', cantidad_gramos: 150, grupo_alimenticio: 'Proteínas' },
              { nombre_alimento: 'Arroz integral', calorias: '200', cantidad_gramos: 100, grupo_alimenticio: 'Cereales' },
              { nombre_alimento: 'Brócoli', calorias: '35', cantidad_gramos: 100, grupo_alimenticio: 'Verduras' }
            ]
          },
          {
            id_tiempo: 4,
            nombre_tiempo: 'colacion2',
            alimentos: [
              { nombre_alimento: 'Manzana', calorias: '80', cantidad_gramos: 150, grupo_alimenticio: 'Frutas' }
            ]
          },
          {
            id_tiempo: 5,
            nombre_tiempo: 'cena',
            alimentos: [
              { nombre_alimento: 'Ensalada mixta', calorias: '120', cantidad_gramos: 200, grupo_alimenticio: 'Verduras' },
              { nombre_alimento: 'Salmón', calorias: '200', cantidad_gramos: 100, grupo_alimenticio: 'Proteínas' }
            ]
          }
        ],
        recomendaciones: 'Bebe al menos 2 litros de agua al día y evita azúcares añadidos. Realiza actividad física moderada.'
      };
      setDietaActual(dietaSimulada);
    } finally {
      setLoading(false);
    }
  };

  const calcularCaloriasConsumidas = (dieta: DietaActual) => {
    if (!dieta || !dieta.tiempos) return;

    let totalConsumido = 0;
    dieta.tiempos.forEach((tiempo: Tiempo) => {
      if (consumoHoy[tiempo.nombre_tiempo]) {
        totalConsumido += tiempo.alimentos.reduce(
          (sum: number, alimento: Alimento) => sum + parseFloat(alimento.calorias),
          0
        );
      }
    });

    setDietaActual(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        caloriasConsumidas: totalConsumido
      };
    });
  };

  const toggleTiempoComida = (nombreTiempo: keyof ConsumoHoy) => {
    setConsumoHoy(prev => {
      const nuevo: ConsumoHoy = { ...prev, [nombreTiempo]: !prev[nombreTiempo] };

      // Recalcular calorías
      if (dietaActual && dietaActual.tiempos) {
        let totalConsumido = 0;
        dietaActual.tiempos.forEach((tiempo: Tiempo) => {
          if (nuevo[tiempo.nombre_tiempo]) {
            totalConsumido += tiempo.alimentos.reduce(
              (sum: number, alimento: Alimento) => sum + parseFloat(alimento.calorias),
              0
            );
          }
        });

        setDietaActual(prevDieta => {
          if (!prevDieta) return prevDieta;
          return {
            ...prevDieta,
            caloriasConsumidas: totalConsumido
          };
        });
      }

      return nuevo;
    });
  };
    
  const onRefresh = async () => {
    setRefreshing(true);
    await cargarDietaActual();
    setRefreshing(false);
  };

  const getTiempoDisplayName = (nombreTiempo: keyof ConsumoHoy) => {
    const nombres: Record<keyof ConsumoHoy, string> = {
      desayuno: 'Desayuno',
      colacion1: 'Colación Matutina', 
      comida: 'Comida',
      colacion2: 'Colación Vespertina',
      cena: 'Cena'
    };
    return nombres[nombreTiempo] || nombreTiempo;
  };

  const getTiempoIcon = (nombreTiempo: keyof ConsumoHoy) => {
    const iconos: Record<keyof ConsumoHoy, string> = {
      desayuno: 'sunny-outline',
      colacion1: 'cafe-outline',
      comida: 'restaurant-outline',
      colacion2: 'nutrition-outline',
      cena: 'moon-outline'
    };
    return iconos[nombreTiempo] || 'restaurant-outline';
  };

  const navigateToDetalle = (tiempo: Tiempo, nombreTiempo: string) => {
    router.push({
      pathname: './detalleTiempo',
      params: { 
        tiempoData: JSON.stringify(tiempo),
        nombreTiempo: nombreTiempo
      }
    });
  };

  // Si no hay ID de cliente, mostrar error
  if (!idCliente && !loading) {
    return (
      <>
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={80} color="#dc3545" />
          <Text style={styles.emptyTitle}>Error de Acceso</Text>
          <Text style={styles.emptyText}>
            No se pudo identificar el cliente. Por favor, inicia sesión nuevamente.
          </Text>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={() => router.push('./login')}
          >
            <Text style={styles.refreshButtonText}>Ir al Login</Text>
          </TouchableOpacity>
        </View>
        <BottomNavbar activeTab="calendar" />
      </>
    );
  }

  if (loading) {
    return (
      <>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7FB069" />
          <Text style={styles.loadingText}>Cargando tu dieta...</Text>
        </View>
        <BottomNavbar activeTab="calendar" />
      </>
    );
  }

  if (!dietaActual) {
    return (
      <>
        <View style={styles.emptyContainer}>
          <Ionicons name="nutrition-outline" size={80} color="#ccc" />
          <Text style={styles.emptyTitle}>Sin dieta asignada</Text>
         <Text style={styles.emptyText}>
  Tu nutriólogo aún no te ha asignado una dieta personalizada. 
  </Text>
          <Text style={styles.emptyText}>
  Por favor, solicita uno en el apartado de{' '}
  <Text style={{ fontWeight: 'bold', color: '#000' }}>
    Solicitar Nutriólogo
  </Text>.
</Text>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={cargarDietaActual}
          >
            <Text style={styles.refreshButtonText}>Actualizar</Text>
          </TouchableOpacity>
        </View>
        <BottomNavbar activeTab="calendar" />
      </>
    );
  }

  const caloriasRestantes = dietaActual.calorias_objetivo - (dietaActual.caloriasConsumidas || 0);
  const porcentajeConsumido = ((dietaActual.caloriasConsumidas || 0) / dietaActual.calorias_objetivo) * 100;

  return (
    <>
      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#7FB069']}
          />
        }
      >
        {/* Header Verde */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* Título */}
          <Text style={styles.title}>Calorías Diarias</Text>

       

          {/* Información de la Dieta */}
          <View style={styles.dietInfoCard}>
            <Text style={styles.dietName}>{dietaActual.nombre_dieta}</Text>
            <Text style={styles.dietObjective}>{dietaActual.objetivo_dieta}</Text>
            
            <View style={styles.macrosContainer}>
              <View style={styles.macroItem}>
                <Text style={styles.macroLabel}>Proteínas</Text>
                <Text style={styles.macroValue}>{dietaActual.porcentaje_proteinas}%</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={styles.macroLabel}>Carbos</Text>
                <Text style={styles.macroValue}>{dietaActual.porcentaje_carbs}%</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={styles.macroLabel}>Grasas</Text>
                <Text style={styles.macroValue}>{dietaActual.porcentaje_grasas}%</Text>
              </View>
            </View>
          </View>

          {/* Lista de Tiempos de Comida */}
          <View style={styles.mealsCard}>
            <Text style={styles.mealsTitle}>Dieta</Text>
            
            {dietaActual.tiempos && dietaActual.tiempos.map((tiempo, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.mealItem,
                  consumoHoy[tiempo.nombre_tiempo] && styles.mealItemCompleted
                ]}
                onPress={() => navigateToDetalle(tiempo, getTiempoDisplayName(tiempo.nombre_tiempo))}
              >
                <View style={styles.mealHeader}>
                  <View style={styles.mealTitleContainer}>
                    <Ionicons 
                      name={getTiempoIcon(tiempo.nombre_tiempo) as any} 
                      size={20} 
                      color="#7FB069" 
                    />
                    <Text style={styles.mealName}>
                      {getTiempoDisplayName(tiempo.nombre_tiempo)}
                    </Text>
                  </View>
                  
                  <View style={styles.mealActions}>
                    <TouchableOpacity
                      onPress={() => toggleTiempoComida(tiempo.nombre_tiempo)}
                      style={styles.checkButton}
                    >
                      <Ionicons 
                        name={consumoHoy[tiempo.nombre_tiempo] ? "checkmark-circle" : "checkmark-circle-outline"} 
                        size={24} 
                        color={consumoHoy[tiempo.nombre_tiempo] ? "#4CAF50" : "#ccc"} 
                      />
                    </TouchableOpacity>
                    
                    <Ionicons name="chevron-forward" size={20} color="#ccc" />
                  </View>
                </View>

                <Text style={styles.mealCalories}>
                  {tiempo.alimentos.reduce((sum, alimento) => 
                    sum + parseFloat(alimento.calorias), 0
                  ).toFixed(0)} cal
                </Text>

                <Text style={styles.mealFoods} numberOfLines={2}>
                  {tiempo.alimentos.map(alimento => alimento.nombre_alimento).join(', ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Recomendaciones */}
          {dietaActual.recomendaciones && (
            <View style={styles.recommendationsCard}>
              <Text style={styles.recommendationsTitle}>Recomendaciones</Text>
              <Text style={styles.recommendationsText}>
                {dietaActual.recomendaciones}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
      
      <BottomNavbar activeTab="calendar" />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  refreshButton: {
    backgroundColor: '#7FB069',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    backgroundColor: '#7FB069',
    height: 100,
    paddingTop: 40,
    paddingHorizontal: 20,
  },
  backButton: {
    padding: 8,
  },
  content: {
    padding: 20,
    marginTop: -20,
    paddingBottom: 100, // Espacio para el navbar
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  summaryCard: {
    backgroundColor: '#F0F4C3',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  caloriesContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  caloriesNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#7FB069',
  },
  caloriesSubtext: {
    fontSize: 16,
    color: '#666',
  },
  remainingCalories: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 15,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#7FB069',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    minWidth: 35,
  },
  dietInfoCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  dietName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  dietObjective: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  macrosContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  macroItem: {
    alignItems: 'center',
  },
  macroLabel: {
    fontSize: 12,
    color: '#666',
  },
  macroValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#7FB069',
  },
  mealsCard: {
    backgroundColor: '#F0F4C3',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
  },
  mealsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  mealItem: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  mealItemCompleted: {
    backgroundColor: '#E8F5E8',
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  mealTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mealName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  mealActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkButton: {
    padding: 5,
  },
  mealCalories: {
    fontSize: 14,
    color: '#7FB069',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  mealFoods: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  recommendationsCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  recommendationsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  recommendationsText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

export default CaloriasDiariasScreen;