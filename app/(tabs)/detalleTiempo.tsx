import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import BottomNavbar from './navbar';

const SERVER_API_URL = 'https://nutweb.onrender.com';

type Alimento = {
  id_alimento_dieta: number;
  nombre_alimento: string;
  cantidad_gramos: number;
  calorias: number;
  grupo_alimenticio: string;
};

type TiempoDetalle = {
  id_tiempo: number;
  nombre_tiempo: string;
  alimentos: Alimento[];
};

const DetalleTiempoScreen = () => {
  const params = useLocalSearchParams();
  const router = useRouter();
  const [tiempo, setTiempo] = useState<TiempoDetalle | null>(null);
  const [nombreTiempo, setNombreTiempo] = useState<string>('');
  const [isConsumed, setIsConsumed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // ✅ SOLUCIONADO: useEffect con dependencias correctas
  useEffect(() => {
    console.log('useEffect ejecutándose con params:', params);
    
    if (params.tiempoData && params.nombreTiempo) {
      try {
        const tiempoDataString = params.tiempoData as string;
        const nombreTiempoString = params.nombreTiempo as string;
        
        console.log('Parseando datos:', tiempoDataString);
        
        const tiempoData = JSON.parse(tiempoDataString);
        
        console.log('Datos parseados exitosamente:', tiempoData);
        
        setTiempo(tiempoData);
        setNombreTiempo(nombreTiempoString);
        setIsLoading(false);
        
      } catch (error) {
        console.error('Error parsing tiempo data:', error);
        Alert.alert('Error', 'Error al cargar los datos del tiempo de comida');
        router.back();
      }
    } else {
      console.log('Faltan parámetros:', { 
        tiempoData: !!params.tiempoData, 
        nombreTiempo: !!params.nombreTiempo 
      });
      setIsLoading(false);
    }
  }, [params.tiempoData, params.nombreTiempo]); // ✅ Dependencias específicas

  const getGrupoColor = (grupo: string) => {
    const colores: Record<string, string> = {
      'Cereales': '#FFB74D',
      'Cereal': '#FFB74D',
      'Verduras': '#81C784',
      'Verdura': '#81C784',
      'Frutas': '#FF8A65',
      'Fruta': '#FF8A65',
      'Lácteos': '#64B5F6',
      'Lácteo': '#64B5F6',
      'Proteínas': '#F06292',
      'Proteína': '#F06292',
      'Leguminosas': '#A1887F',
      'Grasas saludables': '#FFD54F',
      'Grasa saludable': '#FFD54F',
      'Suplemento': '#BA68C8',
      'Endulzante natural': '#FFD54F',
      'Tubérculo': '#D4AC0D',
      'No definido': '#BDBDBD'
    };
    return colores[grupo] || colores['No definido'];
  };

  const getTotalCalorias = () => {
    if (!tiempo) return '0';
    return tiempo.alimentos.reduce((total, alimento) => 
      total + parseFloat(alimento.calorias.toString()), 0
    ).toFixed(0);
  };

  const getTotalGramos = () => {
    if (!tiempo) return '0';
    return tiempo.alimentos.reduce((total, alimento) => 
      total + parseFloat(alimento.cantidad_gramos.toString()), 0
    ).toFixed(0);
  };

  const getTiempoIcon = (nombreTiempo: string) => {
    const iconos: Record<string, string> = {
      'Desayuno': 'sunny-outline',
      'Colación Matutina': 'cafe-outline',
      'Comida': 'restaurant-outline',
      'Colación Vespertina': 'nutrition-outline',
      'Cena': 'moon-outline'
    };
    return iconos[nombreTiempo] || 'restaurant-outline';
  };

  const marcarComoConsumido = async () => {
    try {
      // Obtener datos del usuario
      const userData = await AsyncStorage.getItem('user');
      if (!userData) {
        Alert.alert('Error', 'No se pudo identificar el usuario');
        return;
      }

      const user = JSON.parse(userData);
      
      // Aquí podrías hacer una llamada al servidor para registrar el consumo
      /*
      const response = await fetch(`${SERVER_API_URL}/api/registrar-consumo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idCliente: user.id_cli || user.id,
          idTiempo: tiempo?.id_tiempo,
          fecha: new Date().toISOString().split('T')[0]
        })
      });
      */

      setIsConsumed(true);
      
      Alert.alert(
        'Éxito', 
        `${nombreTiempo} marcado como consumido`,
        [
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ]
      );
    } catch (error) {
      console.error('Error marcando como consumido:', error);
      Alert.alert('Error', 'No se pudo marcar como consumido');
    }
  };

  // ✅ MEJORADO: Loading state más claro
  if (isLoading) {
    return (
      <>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Cargando detalles...</Text>
        </View>
        <BottomNavbar activeTab="calendar" />
      </>
    );
  }

  // ✅ MEJORADO: Manejo de error si no hay datos
  if (!tiempo) {
    return (
      <>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>No se pudieron cargar los datos</Text>
          <TouchableOpacity 
            style={styles.backButtonError}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonErrorText}>Regresar</Text>
          </TouchableOpacity>
        </View>
        <BottomNavbar activeTab="calendar" />
      </>
    );
  }

  // Agrupar alimentos por grupo alimenticio
  const groupedByCategory = tiempo.alimentos.reduce((groups, alimento) => {
    const grupo = alimento.grupo_alimenticio || 'No definido';
    if (!groups[grupo]) {
      groups[grupo] = [];
    }
    groups[grupo].push(alimento);
    return groups;
  }, {} as Record<string, Alimento[]>);

  return (
    <>
      <ScrollView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          
          <View style={styles.headerContent}>
            <Ionicons 
              name={getTiempoIcon(nombreTiempo) as any} 
              size={32} 
              color="white" 
            />
            <Text style={styles.headerTitle}>{nombreTiempo}</Text>
          </View>
        </View>

        <View style={styles.content}>
          {/* Resumen del tiempo */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Calorías</Text>
                <Text style={styles.summaryValue}>{getTotalCalorias()}</Text>
                <Text style={styles.summaryUnit}>kcal</Text>
              </View>
              
              <View style={styles.summaryDivider} />
              
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Gramos</Text>
                <Text style={styles.summaryValue}>{getTotalGramos()}</Text>
                <Text style={styles.summaryUnit}>gr</Text>
              </View>
              
              <View style={styles.summaryDivider} />
              
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Alimentos</Text>
                <Text style={styles.summaryValue}>{tiempo.alimentos.length}</Text>
                <Text style={styles.summaryUnit}>items</Text>
              </View>
            </View>
          </View>

          {/* Lista de alimentos por grupo */}
          {Object.entries(groupedByCategory).map(([grupo, alimentos], groupIndex) => (
            <View key={groupIndex} style={styles.groupCard}>
              <View style={styles.groupHeader}>
                <View 
                  style={[
                    styles.groupIndicator, 
                    { backgroundColor: getGrupoColor(grupo) }
                  ]} 
                />
                <Text style={styles.groupTitle}>{grupo}</Text>
                <Text style={styles.groupCount}>
                  ({alimentos.length} {alimentos.length === 1 ? 'alimento' : 'alimentos'})
                </Text>
              </View>

              {alimentos.map((alimento, index) => (
                <View key={index} style={styles.alimentoItem}>
                  <View style={styles.alimentoInfo}>
                    <Text style={styles.alimentoNombre}>
                      {alimento.nombre_alimento}
                    </Text>
                    <Text style={styles.alimentoCantidad}>
                      {parseFloat(alimento.cantidad_gramos.toString()).toFixed(0)}g
                    </Text>
                  </View>
                  
                  <View style={styles.alimentoCaloriesContainer}>
                    <Text style={styles.alimentoCalorias}>
                      {parseFloat(alimento.calorias.toString()).toFixed(0)}
                    </Text>
                    <Text style={styles.alimentoCaloriasUnit}>kcal</Text>
                  </View>
                </View>
              ))}

              {/* Subtotal del grupo */}
              <View style={styles.groupSubtotal}>
                <Text style={styles.subtotalText}>
                  Subtotal: {alimentos.reduce((sum, a) => 
                    sum + parseFloat(a.calorias.toString()), 0
                  ).toFixed(0)} kcal
                </Text>
              </View>
            </View>
          ))}

          {/* Instrucciones adicionales */}
          <View style={styles.instructionsCard}>
            <View style={styles.instructionHeader}>
              <Ionicons name="information-circle-outline" size={20} color="#7FB069" />
              <Text style={styles.instructionTitle}>Instrucciones</Text>
            </View>
            
            <View style={styles.instructionItem}>
              <Ionicons name="checkmark-circle-outline" size={16} color="#666" />
              <Text style={styles.instructionText}>
                Consume todos los alimentos listados en las cantidades indicadas
              </Text>
            </View>
            
            <View style={styles.instructionItem}>
              <Ionicons name="time-outline" size={16} color="#666" />
              <Text style={styles.instructionText}>
                Respeta los horarios sugeridos para cada tiempo de comida
              </Text>
            </View>
            
            <View style={styles.instructionItem}>
              <Ionicons name="water-outline" size={16} color="#666" />
              <Text style={styles.instructionText}>
                Acompaña con abundante agua natural
              </Text>
            </View>
          </View>



          {/* Espacio para el navbar */}
          <View style={styles.bottomSpacing} />
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
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  backButtonError: {
    backgroundColor: '#7FB069',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonErrorText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    backgroundColor: '#7FB069',
    paddingTop: 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  backButton: {
    padding: 8,
    marginBottom: 10,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  content: {
    padding: 20,
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#7FB069',
  },
  summaryUnit: {
    fontSize: 12,
    color: '#999',
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 10,
  },
  groupCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  groupIndicator: {
    width: 4,
    height: 20,
    borderRadius: 2,
    marginRight: 10,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  groupCount: {
    fontSize: 12,
    color: '#666',
  },
  alimentoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f8f8',
  },
  alimentoInfo: {
    flex: 1,
  },
  alimentoNombre: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  alimentoCantidad: {
    fontSize: 12,
    color: '#666',
  },
  alimentoCaloriesContainer: {
    alignItems: 'flex-end',
  },
  alimentoCalorias: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#7FB069',
  },
  alimentoCaloriasUnit: {
    fontSize: 10,
    color: '#666',
  },
  groupSubtotal: {
    paddingTop: 10,
    marginTop: 5,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    alignItems: 'flex-end',
  },
  subtotalText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#7FB069',
  },
  instructionsCard: {
    backgroundColor: '#F0F4C3',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  instructionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    gap: 8,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 10,
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    lineHeight: 20,
  },
  markButton: {
    backgroundColor: '#7FB069',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 12,
    gap: 10,
    marginBottom: 20,
  },
  markButtonConsumed: {
    backgroundColor: '#4CAF50',
  },
  markButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bottomSpacing: {
    height: 100, // Espacio para el navbar
  },
});

export default DetalleTiempoScreen;