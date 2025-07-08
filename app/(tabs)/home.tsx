import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import BottomNavbar from './navbar';



const SERVER_API_URL = 'https://integradora1.com/'; 

console.log('🌍 Usando servidor:', SERVER_API_URL);

interface User {
  id: string;
  nombre: string;
  correo: string;
  userType: string;
}

interface ComidaRegistrada {
  id_comida: number;
  fecha: string;
  hora: string;
  calorias_totales: number;
  grupo_alimenticio: string;
  mensaje_validacion: string;
}

interface EstadisticasDiarias {
  fecha: string;
  totalCalorias: number;
  totalComidas: number;
  grupos: string[];
}

interface ResumenSemanal {
  lunes: number;
  martes: number;
  miercoles: number;
  jueves: number;
  viernes: number;
  sabado: number;
  domingo: number;
}

const HomeScreen = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  
  // Datos reales de estadísticas
  const [comidasHoy, setComidasHoy] = useState<ComidaRegistrada[]>([]);
  const [caloriasHoy, setCaloriasHoy] = useState(0);
  const [metaCaloriasDiarias, setMetaCaloriasDiarias] = useState(2000);
  const [resumenSemanal, setResumenSemanal] = useState<ResumenSemanal>({
    lunes: 0, martes: 0, miercoles: 0, jueves: 0, viernes: 0, sabado: 0, domingo: 0
  });
  const [gruposAlimentarios, setGruposAlimentarios] = useState<string[]>([]);

  useEffect(() => {
    checkAuthentication();
  }, []);

  useEffect(() => {
    if (user) {
      loadUserStats();
    }
  }, [user]);

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
      setLoading(false);
    }
  };

  const loadUserStats = async () => {
    if (!user) return;
    
    try {
      setLoadingStats(true);
      console.log('📊 Cargando estadísticas para usuario:', user.id);

      // Usar endpoint optimizado para obtener resumen completo
      await loadCompleteStats();
      
    } catch (error) {
      console.error('❌ Error cargando estadísticas:', error);
      Alert.alert('Error', 'No se pudieron cargar las estadísticas');
    } finally {
      setLoadingStats(false);
    }
  };

  // Función para probar conectividad con el servidor
  const testServerConnection = async () => {
    try {
      console.log('🔗 Probando conexión con servidor:', SERVER_API_URL);
      
      const response = await fetch(`${SERVER_API_URL}/api/test`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        ////timeout: 10000, // 10 segundos de //timeout
      });

      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Servidor conectado exitosamente');
        return true;
      } else {
        console.log('❌ Servidor respondió pero con error:', data);
        return false;
      }
    } catch (error) {
      console.error('❌ Error de conexión al servidor:', error);
      Alert.alert(
        'Error de Conexión',
        `No se puede conectar al servidor.\n\nVerifica:\n• Que el servidor esté corriendo\n• La IP correcta: ${SERVER_API_URL}\n• Que estés en la misma red WiFi\n\nError: ${error instanceof Error ? error.message : String(error)}`,
        [
          { text: 'Reintentar', onPress: () => testServerConnection() },
          { text: 'Cancelar', style: 'cancel' }
        ]
      );
      return false;
    }
  };

  const loadCompleteStats = async () => {
    try {
      // Primero probar la conexión
      const isConnected = await testServerConnection();
      if (!isConnected) {
        console.log('⚠️ Sin conexión al servidor, usando datos offline');
        await loadOfflineData();
        return;
      }

      console.log('📊 Cargando estadísticas completas...');

      // Obtener resumen completo del usuario
      if (!user) {
        throw new Error('Usuario no definido');
      }
      const summaryResponse = await fetch(`${SERVER_API_URL}/api/comidas/summary/${user.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        //timeout: 15000,
      });

      if (!summaryResponse.ok) {
        throw new Error(`HTTP error! status: ${summaryResponse.status}`);
      }

      const summaryData = await summaryResponse.json();

      if (summaryData.success) {
        const { resumen_hoy, grupos_favoritos } = summaryData;
        
        // Actualizar estadísticas de hoy
        setCaloriasHoy(resumen_hoy.calorias_hoy || 0);
        
        if (resumen_hoy.grupos_hoy) {
          const grupos = resumen_hoy.grupos_hoy.split(',').filter(Boolean);
          setGruposAlimentarios(grupos);
        }

        console.log('📊 Resumen cargado:', {
          calorias_hoy: resumen_hoy.calorias_hoy,
          comidas_hoy: resumen_hoy.comidas_hoy,
          grupos: resumen_hoy.grupos_hoy
        });
      }

      // Obtener resumen semanal
      const weeklyResponse = await fetch(`${SERVER_API_URL}/api/comidas/weekly/${user.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        //timeout: 15000,
      });

      if (weeklyResponse.ok) {
        const weeklyData = await weeklyResponse.json();
        if (weeklyData.success) {
          setResumenSemanal(weeklyData.semana);
          console.log('📅 Resumen semanal:', weeklyData.semana);
        }
      }

      // Obtener comidas de hoy para mostrar detalles
      const today = new Date().toISOString().split('T')[0];
      const todayResponse = await fetch(`${SERVER_API_URL}/api/comidas/${user.id}?fecha=${today}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        //timeout: 15000,
      });

      if (todayResponse.ok) {
        const todayData = await todayResponse.json();
        if (todayData.success) {
          setComidasHoy(todayData.comidas || []);
        }
      }

      // Obtener perfil para meta calórica
      const profileResponse = await fetch(`${SERVER_API_URL}/api/user/profile/${user.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        //timeout: 15000,
      });

      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        if (profileData.success) {
          setMetaCaloriasDiarias(profileData.usuario.meta_calorica_calculada || 2000);
          console.log('🎯 Meta calórica calculada:', profileData.usuario.meta_calorica_calculada);
        }
      }

    } catch (error) {
      console.error('❌ Error en loadCompleteStats:', error);
      
      // Mostrar error específico al usuario
      Alert.alert(
        'Error cargando datos',
        `No se pudieron cargar las estadísticas.\n\nDetalles técnicos:\n${error.message}\n\n¿Quieres reintentar?`,
        [
          { text: 'Usar datos offline', onPress: () => loadOfflineData() },
          { text: 'Reintentar', onPress: () => loadCompleteStats() }
        ]
      );
      
      // Fallback a datos offline
      await loadOfflineData();
    }
  };

  // Función para cargar datos offline del AsyncStorage
  const loadOfflineData = async () => {
    try {
      console.log('📱 Cargando datos offline...');
      
      const offlineData = await AsyncStorage.getItem('foodDiary');
      if (offlineData) {
        const diary = JSON.parse(offlineData);
        const today = new Date().toISOString().split('T')[0];
        
        // Filtrar comidas de hoy
        const todayMeals = diary.filter((entry: any) => entry.date === today);
        
        // Calcular calorías del día
        const todayCalories = todayMeals.reduce((total: number, entry: any) => {
          return total + (entry.adjustedFood?.calories || 0);
        }, 0);
        
        setCaloriasHoy(todayCalories);
        
        // Simular estructura de comidas registradas
        const formattedMeals = todayMeals.map((entry: any) => ({
          id_comida: entry.id,
          fecha: entry.date,
          hora: new Date(entry.timestamp).toTimeString().split(' ')[0],
          calorias_totales: entry.adjustedFood?.calories || 0,
          grupo_alimenticio: entry.meal || 'General',
          mensaje_validacion: `${entry.food?.name} registrado offline`
        }));
        
        setComidasHoy(formattedMeals);
        
        console.log('📱 Datos offline cargados:', {
          comidas: todayMeals.length,
          calorias: todayCalories
        });
      }
    } catch (error) {
      console.error('❌ Error cargando datos offline:', error);
    }
  };

  const loadTodayStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const response = await fetch(`${SERVER_API_URL}/api/comidas/${user.id}?fecha=${today}`);
      const data = await response.json();

      if (data.success) {
        const comidasDelDia = data.comidas || [];
        setComidasHoy(comidasDelDia);

        // Calcular calorías totales del día
        const totalCalorias = comidasDelDia.reduce((total: number, comida: ComidaRegistrada) => {
          return total + (comida.calorias_totales || 0);
        }, 0);
        
        setCaloriasHoy(totalCalorias);

        // Extraer grupos alimentarios únicos
        const grupos = [...new Set(comidasDelDia.map((c: ComidaRegistrada) => c.grupo_alimenticio))];
        setGruposAlimentarios(grupos);

        console.log('📊 Estadísticas de hoy:', {
          comidas: comidasDelDia.length,
          calorias: totalCalorias,
          grupos: grupos
        });
      }
    } catch (error) {
      console.error('❌ Error obteniendo comidas de hoy:', error);
    }
  };

  const loadWeeklyStats = async () => {
    try {
      // Obtener fechas de la semana actual
      const today = new Date();
      const currentDay = today.getDay(); // 0 = domingo, 1 = lunes, etc.
      const monday = new Date(today);
      monday.setDate(today.getDate() - (currentDay === 0 ? 6 : currentDay - 1));

      const weekDates = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        weekDates.push(date.toISOString().split('T')[0]);
      }

      console.log('📅 Fechas de la semana:', weekDates);

      // Obtener datos para cada día de la semana
      const weeklyData = { lunes: 0, martes: 0, miercoles: 0, jueves: 0, viernes: 0, sabado: 0, domingo: 0 };
      const dayNames = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

      for (let i = 0; i < 7; i++) {
        try {
          const response = await fetch(`${SERVER_API_URL}/api/comidas/${user.id}?fecha=${weekDates[i]}`);
          const data = await response.json();

          if (data.success) {
            const calorias = data.comidas.reduce((total: number, comida: ComidaRegistrada) => {
              return total + (comida.calorias_totales || 0);
            }, 0);
            
            weeklyData[dayNames[i] as keyof ResumenSemanal] = calorias;
          }
        } catch (error) {
          console.warn(`⚠️ Error obteniendo datos del ${dayNames[i]}:`, error);
        }
      }

      setResumenSemanal(weeklyData);
      console.log('📊 Resumen semanal:', weeklyData);

    } catch (error) {
      console.error('❌ Error obteniendo resumen semanal:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserStats();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    try {
      console.log('🚪 Cerrando sesión...');
      await AsyncStorage.removeItem('user');
      router.replace('/login');
    } catch (error) {
      console.error('❌ Error al cerrar sesión:', error);
    }
  };

  const getCaloriesStatus = () => {
    const percentage = (caloriasHoy / metaCaloriasDiarias) * 100;
    const remaining = Math.max(0, metaCaloriasDiarias - caloriasHoy);
    
    let statusColor = '#7A9B57'; // Verde normal
    let statusText = 'En progreso';
    
    if (percentage >= 100) {
      statusColor = '#FF6B6B'; // Rojo si excede
      statusText = 'Meta superada';
    } else if (percentage >= 80) {
      statusColor = '#FFA500'; // Naranja si está cerca
      statusText = 'Cerca de la meta';
    }

    return { percentage, remaining, statusColor, statusText };
  };

  const getMealTimeRecommendation = () => {
    const now = new Date();
    const hour = now.getHours();
    const comidasCount = comidasHoy.length;
    
    if (hour < 10) {
      return comidasCount === 0 ? "¡Buenos días! ¿Ya desayunaste? 🌅" : "¡Buen desayuno! ¿Algo más? ☕";
    }
    if (hour < 14) {
      return comidasCount < 2 ? "Es hora del almuerzo 🍽️" : "¡Perfecto! Ya llevas buen ritmo 👏";
    }
    if (hour < 18) {
      const caloriasRestantes = metaCaloriasDiarias - caloriasHoy;
      if (caloriasRestantes > 300) {
        return "¿Qué tal una merienda saludable? 🥜";
      } else {
        return "¡Vas excelente con tus comidas! 🌟";
      }
    }
    if (hour < 21) {
      return "Hora de una cena ligera 🌙";
    }
    return "¡Buen trabajo hoy! Descansa bien 💪";
  };

  const getMotivationalMessage = () => {
    const percentage = (caloriasHoy / metaCaloriasDiarias) * 100;
    const comidasCount = comidasHoy.length;
    
    if (comidasCount === 0) {
      return "¡Comienza a registrar tus comidas para trackear tu progreso! 🚀";
    }
    
    if (percentage < 50) {
      return `Has registrado ${comidasCount} comidas. ¡Sigue así para alcanzar tu meta! 💪`;
    } else if (percentage < 80) {
      return `¡Excelente! Ya llevas ${percentage.toFixed(0)}% de tu meta diaria. 🎯`;
    } else if (percentage < 100) {
      return `¡Casi lo logras! Solo faltan ${(metaCaloriasDiarias - caloriasHoy).toFixed(0)} calorías. 🔥`;
    } else if (percentage <= 110) {
      return `¡Meta alcanzada perfectamente! Mantén este equilibrio. ⭐`;
    } else {
      return `Has superado tu meta. Considera comidas más ligeras mañana. 🌱`;
    }
  };

  const getHealthTip = () => {
    const tips = [
      "💧 Recuerda beber al menos 8 vasos de agua al día",
      "🥗 Incluye vegetales en cada comida principal",
      "🚶‍♀️ Camina al menos 30 minutos diarios",
      "😴 Duerme entre 7-8 horas para mejor metabolismo",
      "🍎 Las frutas son ideales como snacks saludables",
      "🥜 Los frutos secos aportan grasas saludables",
      "🐟 El pescado es excelente fuente de omega-3",
      "🧘‍♀️ El estrés puede afectar tu digestión"
    ];
    
    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    return randomTip;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor="#7A9B57" barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#7A9B57" size="large" />
          <Text style={styles.loadingText}>Cargando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return null;
  }

  const screenWidth = Dimensions.get('window').width;
  const { percentage, remaining, statusColor, statusText } = getCaloriesStatus();

  // Preparar datos para la gráfica con validación
  const chartData = {
    labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
    datasets: [
      {
        data: [
          Math.max(0, resumenSemanal.lunes || 0),
          Math.max(0, resumenSemanal.martes || 0),
          Math.max(0, resumenSemanal.miercoles || 0),
          Math.max(0, resumenSemanal.jueves || 0),
          Math.max(0, resumenSemanal.viernes || 0),
          Math.max(0, resumenSemanal.sabado || 0),
          Math.max(0, resumenSemanal.domingo || 0)
        ],
        strokeWidth: 3,
        color: (opacity = 1) => `rgba(122, 155, 87, ${opacity})`,
      },
    ],
  };

  // Verificar si hay datos para mostrar la gráfica
  const hasWeeklyData = Object.values(resumenSemanal).some(value => value > 0);
  
  console.log('📊 Datos para gráfica:', {
    chartData: chartData.datasets[0].data,
    hasData: hasWeeklyData,
    resumenSemanal
  });

  const chartConfig = {
    backgroundGradientFrom: '#F5F5DC',
    backgroundGradientTo: '#F5F5DC',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(122, 155, 87, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    propsForDots: {
      r: '5',
      strokeWidth: '2',
      stroke: '#7A9B57',
      fill: '#7A9B57',
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: '#E0E0E0',
      strokeWidth: 1,
    },
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#7A9B57" barStyle="light-content" />

      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.welcomeText}>¡Hola, {user.nombre}!</Text>
            <Text style={styles.recommendationText}>{getMealTimeRecommendation()}</Text>
          </View>
          <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
            <Text style={styles.refreshButtonText}>🔄</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Panel de Nutrición</Text>

        {/* Resumen de Hoy */}
        <View style={[styles.summaryCard, { borderLeftColor: statusColor, borderLeftWidth: 4 }]}>
          <Text style={styles.summaryTitle}>Resumen de Hoy</Text>

          <View style={styles.caloriesContainer}>
            <Text style={[styles.caloriesNumber, { color: statusColor }]}>{caloriasHoy}</Text>
            <Text style={styles.caloriesLabel}>de {metaCaloriasDiarias} calorías</Text>
          </View>

          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { 
              width: `${Math.min(percentage, 100)}%`, 
              backgroundColor: statusColor 
            }]} />
          </View>

          <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
          
          {remaining > 0 ? (
            <Text style={styles.remainingCalories}>{remaining} calorías restantes</Text>
          ) : (
            <Text style={styles.remainingCalories}>¡Meta alcanzada! 🎉</Text>
          )}

          {/* Información adicional */}
          <View style={styles.additionalInfo}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Comidas:</Text>
              <Text style={styles.infoValue}>{comidasHoy.length}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Grupos:</Text>
              <Text style={styles.infoValue}>{gruposAlimentarios.length}</Text>
            </View>
          </View>
        </View>

        {/* Grupos Alimentarios de Hoy */}
        {gruposAlimentarios.length > 0 && (
          <View style={styles.groupsCard}>
            <Text style={styles.groupsTitle}>Grupos Alimentarios Consumidos Hoy</Text>
            <View style={styles.groupsContainer}>
              {gruposAlimentarios.map((grupo, index) => (
                <View key={index} style={styles.groupBadge}>
                  <Text style={styles.groupText}>{grupo}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Gráfica Semanal */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Consumo esta semana</Text>
          
          {loadingStats ? (
            <View style={styles.chartLoading}>
              <ActivityIndicator color="#7A9B57" size="large" />
              <Text style={styles.chartLoadingText}>Cargando estadísticas...</Text>
            </View>
          ) : hasWeeklyData ? (
            <>
              <LineChart
                data={chartData}
                width={screenWidth - 60}
                height={220}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
              />
              
              {/* Estadísticas de la semana */}
              <View style={styles.weekStats}>
                <Text style={styles.weekStatsTitle}>Esta semana:</Text>
                <Text style={styles.weekStatsText}>
                  Promedio: {Math.round(Object.values(resumenSemanal).reduce((a, b) => a + b, 0) / 7)} kcal/día
                </Text>
                <Text style={styles.weekStatsText}>
                  Total: {Object.values(resumenSemanal).reduce((a, b) => a + b, 0)} kcal
                </Text>
              </View>
            </>
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataIcon}>📊</Text>
              <Text style={styles.noDataTitle}>No hay datos esta semana</Text>
              <Text style={styles.noDataText}>
                Comienza a registrar tus comidas para ver tu progreso semanal
              </Text>
              <TouchableOpacity 
                style={styles.addMealButton}
                onPress={() => router.push('/agregarComida')}
              >
                <Text style={styles.addMealButtonText}>Registrar Primera Comida</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Comidas de Hoy */}
        {comidasHoy.length > 0 && (
          <View style={styles.mealsCard}>
            <Text style={styles.mealsTitle}>Comidas de Hoy ({comidasHoy.length})</Text>
            {comidasHoy.slice(0, 3).map((comida, index) => (
              <View key={index} style={styles.mealItem}>
                <View style={styles.mealInfo}>
                  <Text style={styles.mealTime}>{comida.hora}</Text>
                  <Text style={styles.mealGroup}>{comida.grupo_alimenticio}</Text>
                </View>
                <Text style={styles.mealCalories}>{comida.calorias_totales} kcal</Text>
              </View>
            ))}
            {comidasHoy.length > 3 && (
              <Text style={styles.moreText}>Y {comidasHoy.length - 3} más...</Text>
            )}
          </View>
        )}

        {/* Mensaje motivacional y consejos */}
        <View style={styles.motivationCard}>
          <Text style={styles.motivationTitle}>💪 ¡Sigue así!</Text>
          <Text style={styles.motivationText}>{getMotivationalMessage()}</Text>
        </View>

        {/* Consejo de salud diario */}
        <View style={styles.tipCard}>
          <Text style={styles.tipTitle}>💡 Consejo del día</Text>
          <Text style={styles.tipText}>{getHealthTip()}</Text>
        </View>

        {/* Botones de acción rápida */}
        <View style={styles.quickActions}>
          <Text style={styles.quickActionsTitle}>Acciones rápidas</Text>
          
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/agregar-comida')}
            >
              <Text style={styles.actionButtonIcon}>🍽️</Text>
              <Text style={styles.actionButtonText}>Agregar Comida</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionButton}
              onPress={onRefresh}
            >
              <Text style={styles.actionButtonIcon}>🔄</Text>
              <Text style={styles.actionButtonText}>Actualizar</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={() => router.push('/stats')}
            >
              <Text style={styles.actionButtonIcon}>📊</Text>
              <Text style={styles.actionButtonText}>Ver Stats</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <BottomNavbar activeTab="stats" />
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
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeText: {
    color: '#F5F5DC',
    fontSize: 20,
    fontWeight: 'bold',
  },
  recommendationText: {
    color: '#F5F5DC',
    fontSize: 14,
    opacity: 0.9,
    marginTop: 4,
  },
  refreshButton: {
    padding: 8,
  },
  refreshButtonText: {
    fontSize: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333333',
    marginTop: 20,
    marginBottom: 20,
    textAlign: 'left',
  },
  summaryCard: {
    backgroundColor: '#F5F5DC',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 15,
  },
  caloriesContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  caloriesNumber: {
    fontSize: 42,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  caloriesLabel: {
    fontSize: 16,
    color: '#666666',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginVertical: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 5,
  },
  remainingCalories: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
  additionalInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 15,
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
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  groupsCard: {
    backgroundColor: '#F5F5DC',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  groupsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 10,
  },
  groupsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  groupBadge: {
    backgroundColor: '#7A9B57',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  groupText: {
    color: '#F5F5DC',
    fontSize: 12,
    fontWeight: '500',
  },
  chartCard: {
    backgroundColor: '#F5F5DC',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 15,
  },
  chart: {
    borderRadius: 12,
  },
  chartLoading: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  chartLoadingText: {
    color: '#666666',
    marginTop: 10,
  },
  weekStats: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  weekStatsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 5,
  },
  weekStatsText: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 2,
  },
  mealsCard: {
    backgroundColor: '#F5F5DC',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mealsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
  },
  mealItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  mealInfo: {
    flex: 1,
  },
  mealTime: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
  },
  mealGroup: {
    fontSize: 12,
    color: '#666666',
  },
  mealCalories: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#7A9B57',
  },
  moreText: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  motivationCard: {
    backgroundColor: '#E8F5E8',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#7A9B57',
  },
  motivationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 5,
  },
  motivationText: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  tipCard: {
    backgroundColor: '#FFF7E6',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#FFA500',
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 5,
  },
  tipText: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  quickActions: {
    backgroundColor: '#F5F5DC',
    borderRadius: 12,
    padding: 15,
    marginBottom: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#7A9B57',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    minHeight: 70,
    justifyContent: 'center',
  },
  secondaryButton: {
    backgroundColor: '#CD853F',
  },
  actionButtonIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  actionButtonText: {
    color: '#F5F5DC',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  noDataContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  noDataIcon: {
    fontSize: 48,
    marginBottom: 15,
  },
  noDataTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
    textAlign: 'center',
  },
  noDataText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  addMealButton: {
    backgroundColor: '#7A9B57',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  addMealButtonText: {
    color: '#F5F5DC',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
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

export default HomeScreen;