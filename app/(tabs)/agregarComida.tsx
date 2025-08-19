// screens/AgregarComidaScreen.js - Versión integrada con BD, IoT báscula y podómetro
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import ScaleAssignmentModal from './ScaleAssignmentModal'; // Importar modal de báscula
import useFoodAPI from './hooks/useFoodApi';
import useScale from './useScale'; // Importar hook de báscula

// Configuración del servidor
const SERVER_API_URL = 'https://nutweb.onrender.com';

interface User {
  id: string;
  nombre: string;
  correo: string;
  userType: string;
}

type Food = {
  id: string;
  name: string;
  brand?: string;
  image?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  nutriscore?: string;
  novaGroup?: number;
};

type FoodCategory = {
  id: string;
  name: string;
  icon: string;
  searchTerms: string[];
};

const AgregarComidaScreen = () => {
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<FoodCategory | null>(null);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Food[]>([]);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [portionModalVisible, setPortionModalVisible] = useState(false);
  const [portion, setPortion] = useState('100');
  const [isSaving, setIsSaving] = useState(false);
  const [scaleModalVisible, setScaleModalVisible] = useState(false);

  // Hook personalizado para la API de alimentos
  const { loading, error, searchFoods, getPopularCategories, testAPI } = useFoodAPI();

  // Hook personalizado para la báscula IoT
  const {
    scaleData,
    assignment: scaleAssignment,
    loading: scaleLoading,
    error: scaleError,
    checkScaleStatus,
    checkAssignment,
    assignScale,
    releaseScale,
    startWeighing,
    stopWeighing,
    tareScale,
    refreshData: refreshScaleData
  } = useScale();

  // Estados para el proceso de pesado
  const [isWeighingActive, setIsWeighingActive] = useState(false);
  const [weightRecommendation, setWeightRecommendation] = useState<string>('');
  const [weightStatus, setWeightStatus] = useState<'waiting' | 'weighing' | 'target_reached' | 'completed'>('waiting');

  // Verificar autenticación al cargar
  useEffect(() => {
    checkAuthentication();
  }, []);

  // Verificar estado de báscula periódicamente
  useEffect(() => {
    const interval = setInterval(() => {
      if (scaleAssignment) {
        checkScaleStatus();
      }
    }, 3000); // Cada 3 segundos

    return () => clearInterval(interval);
  }, [scaleAssignment]);

  // Verificar asignación de báscula al cargar
  useEffect(() => {
    checkAssignment();
  }, []);

  // Monitorear cambios en el estado de pesado
  useEffect(() => {
    if (scaleData.isWeighing && selectedFood) {
      setIsWeighingActive(true);
      setWeightStatus('weighing');
      
      // Verificar si se alcanzó el peso objetivo
      if (scaleData.weight > 0 && scaleData.targetWeight > 0) {
        const difference = Math.abs(scaleData.weight - scaleData.targetWeight);
        const tolerance = scaleData.targetWeight * 0.1; // 10% de tolerancia
        
        if (difference <= tolerance) {
          setWeightStatus('target_reached');
          setWeightRecommendation(`✅ Peso alcanzado: ${scaleData.weight}g (objetivo: ${scaleData.targetWeight}g)`);
          setPortion(scaleData.weight.toString());
        } else {
          const diff = scaleData.weight - scaleData.targetWeight;
          if (diff > 0) {
            setWeightRecommendation(`⚠️ Sobrepeso: ${scaleData.weight}g (+${diff.toFixed(1)}g del objetivo)`);
          } else {
            setWeightRecommendation(`📉 Faltan: ${Math.abs(diff).toFixed(1)}g para alcanzar ${scaleData.targetWeight}g`);
          }
        }
      }
    } else {
      setIsWeighingActive(false);
      setWeightStatus('waiting');
      setWeightRecommendation('');
    }
  }, [scaleData.isWeighing, scaleData.weight, scaleData.targetWeight, selectedFood]);

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
      setCheckingAuth(false);
    }
  };

  // Iniciar proceso de pesado con báscula IoT
  const startScaleWeighing = async () => {
    if (!selectedFood || !scaleAssignment) {
      Alert.alert('Error', 'Necesitas tener un alimento seleccionado y una báscula asignada');
      return;
    }

    try {
      const targetWeight = parseFloat(portion) || 100;
      
      const foodData = {
        name: selectedFood.name,
        calories: selectedFood.calories,
        protein: selectedFood.protein,
        carbs: selectedFood.carbs,
        fat: selectedFood.fat,
        fiber: selectedFood.fiber,
        targetWeight: targetWeight,
        category: selectedCategory?.name || 'General'
      };

      const success = await startWeighing(foodData);
      
      if (success) {
        setIsWeighingActive(true);
        setWeightStatus('weighing');
        Alert.alert(
          '⚖️ Pesado Iniciado',
          `Coloca ${selectedFood.name} en la báscula.\nObjetivo: ${targetWeight}g\n\nEl peso se actualizará automáticamente.`
        );
      } else {
        Alert.alert('Error', scaleError || 'No se pudo iniciar el pesado');
      }
    } catch (error) {
      console.error('❌ Error iniciando pesado:', error);
      Alert.alert('Error', 'Error iniciando el proceso de pesado');
    }
  };

  // Detener proceso de pesado
  const stopScaleWeighing = async () => {
    try {
      const success = await stopWeighing();
      
      if (success) {
        setIsWeighingActive(false);
        setWeightStatus('completed');
        
        // Usar el peso final de la báscula
        if (scaleData.weight > 0) {
          setPortion(scaleData.weight.toString());
          Alert.alert(
            '✅ Pesado Completado',
            `Peso final: ${scaleData.weight}g\n¿Deseas guardar con este peso?`,
            [
              { text: 'Cancelar', style: 'cancel' },
              { 
                text: 'Guardar', 
                onPress: () => addToFoodDiary(scaleData.weight)
              }
            ]
          );
        }
      }
    } catch (error) {
      console.error('❌ Error deteniendo pesado:', error);
      Alert.alert('Error', 'Error deteniendo el proceso de pesado');
    }
  };

  // Guardar en base de datos relacional (MariaDB)
  const saveToRelationalDB = async (foodData: any) => {
    try {
      const payload = {
        id_cli: user?.id,
        fecha: new Date().toISOString().split('T')[0],
        hora: new Date().toTimeString().split(' ')[0],
        calorias_totales: foodData.adjustedFood.calories,
        grupo_alimenticio: selectedCategory?.name || 'General',
        mensaje_validacion: `${foodData.name} - ${foodData.finalWeight}g registrado ${scaleAssignment ? 'con báscula IoT' : 'manualmente'}`
      };

      const response = await fetch(`${SERVER_API_URL}/api/comidas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Error guardando en base de datos');
      }

      console.log('✅ Guardado en BD relacional exitoso, ID:', result.id_comida);
      return result.id_comida;
    } catch (error) {
      console.error('❌ Error guardando en BD relacional:', error);
      throw error;
    }
  };
// Función de debug temporal
const testScaleEndpoints = async () => {
  try {
    console.log('🧪 Testing endpoints...');
    
    // Test 1: Status
    const response1 = await fetch('https://nutweb.onrender.com/api/iot/scale/status');
    const text1 = await response1.text();
    console.log('Status response:', text1.substring(0, 200));
    
    // Test 2: Assignments
    const response2 = await fetch('https://nutweb.onrender.com/api/iot/scale/assignments');
    const text2 = await response2.text();
    console.log('Assignments response:', text2.substring(0, 200));
    
  } catch (error) {
    console.error('Test error:', error);
  }
};

// Llamar al cargar la pantalla
useEffect(() => {
  testScaleEndpoints();
}, []);
  // Guardar en base de datos no relacional (MongoDB)
  const saveToNoRelationalDB = async (foodData: any, idComida: number) => {
    try {
      const finalWeight = scaleAssignment && scaleData.weight > 0
        ? scaleData.weight
        : foodData.finalWeight;
      const payload = {
        id_cli: user?.id,
        id_comida: idComida,
        nombre_alimento: foodData.name,
        grupo_alimenticio: selectedCategory?.name || 'General',
        gramos_pesados: finalWeight,
        gramos_recomendados: foodData.recommendedWeight || finalWeight,
        calorias_estimadas: foodData.adjustedFood.calories,
        fecha: new Date().toISOString().split('T')[0],
        hora: new Date().toTimeString().split(' ')[0],
        informacion_nutricional: {
          proteinas: foodData.adjustedFood.protein,
          carbohidratos: foodData.adjustedFood.carbs,
          grasas: foodData.adjustedFood.fat,
          fibra: foodData.adjustedFood.fiber,
          nutriscore: foodData.nutriscore,
          novaGroup: foodData.novaGroup
        },
        metodo_pesado: scaleAssignment ? 'bascula_iot' : 'manual',
        bascula_info: scaleAssignment ? {
          device_id: scaleAssignment.device_id,
          peso_objetivo: scaleData.targetWeight,
          peso_real_medido: finalWeight,
          precision_alcanzada: Math.abs(finalWeight - scaleData.targetWeight) <= (scaleData.targetWeight * 0.1),
          diferencia_objetivo: finalWeight - scaleData.targetWeight
        } : null
      };
      const response = await fetch(`${SERVER_API_URL}/api/comidas/mongo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message || 'Error guardando en MongoDB');
      return result.mongoId;
    } catch (error) {
      throw error;
    }
  };

  

  // Función de test para diagnosticar la API
  const runAPITest = async () => {
    console.log('🧪 Ejecutando test de API...');
    try {
      const result = await testAPI();
      Alert.alert(
        'Test de API',
        `Test 1 (ES): ${result.test1?.success ? '✅' : '❌'} - ${result.test1?.count || 0} resultados\nTest 2 (World): ${result.test2?.success ? '✅' : '❌'} - ${result.test2?.count || 0} resultados\n\n${result.error || 'Ver consola para más detalles'}`
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Alert.alert('Error en test', errorMessage);
    }
  };

  // Obtener categorías populares
  const foodCategories = getPopularCategories();

  // Buscar alimentos usando el hook híbrido con filtro NOVA
  const handleSearchFoods = async (query: string, category: FoodCategory | null = null) => {
    if (!query.trim()) {
      Alert.alert('Error', 'Por favor ingresa un término de búsqueda');
      return;
    }

    try {
      const options = {
        pageSize: 50,
        category: category?.searchTerms.join(' OR ')
      };

      const result = await searchFoods(query, options);

      if (result.success) {
        const filteredProducts = result.products
          .filter((product: any) => {
            return product.novaGroup === 1 || product.novaGroup === 2 || !product.novaGroup;
          })
          .sort((a: any, b: any) => {
            const novaA = a.novaGroup || 5;
            const novaB = b.novaGroup || 5;
            
            if (novaA !== novaB) {
              return novaA - novaB;
            }
            
            return a.name.localeCompare(b.name);
          })
          .slice(0, 20);

        console.log('🔍 Productos filtrados por NOVA:', {
          original: result.products.length,
          filtered: filteredProducts.length,
          nova1: filteredProducts.filter((p: any) => p.novaGroup === 1).length,
          nova2: filteredProducts.filter((p: any) => p.novaGroup === 2).length,
          noNova: filteredProducts.filter((p: any) => !p.novaGroup).length
        });

        setSearchResults(filteredProducts);

        if (filteredProducts.length === 0) {
          Alert.alert(
            'Sin resultados', 
            'No se encontraron alimentos poco procesados para tu búsqueda. Intenta con términos más generales o alimentos naturales.'
          );
        }
      } else {
        Alert.alert('Error', 'No se pudo buscar alimentos. Intenta de nuevo más tarde.');
        setSearchResults([]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      Alert.alert('Error', `No se pudo buscar alimentos.\n${errorMessage}`);
      setSearchResults([]);
    }
  };

  // Seleccionar categoría y abrir modal de búsqueda
  const selectCategory = (category: FoodCategory) => {
    setSelectedCategory(category);
    setSearchModalVisible(true);
    setSearchQuery('');
    setSearchResults([]);
    
    const categorySearch = category.searchTerms[0];
    setSearchQuery(categorySearch);
    handleSearchFoods(categorySearch, category);
  };

  // Seleccionar alimento y mostrar información nutricional
  const selectFood = (food: Food) => {
    setSelectedFood(food);
    setPortion('100');
    
    const novaInfo = food.novaGroup 
      ? `\n🏷️ Procesamiento: ${getNovaDescription(food.novaGroup)}`
      : '';
    
    Alert.alert(
      'Información Nutricional',
      `${food.name}\n${food.brand ? `Marca: ${food.brand}\n` : ''}\nPor cada 100g:\n🔥 ${food.calories} kcal\n🥩 Proteínas: ${food.protein}g\n🍞 Carbohidratos: ${food.carbs}g\n🧈 Grasas: ${food.fat}g\n🌾 Fibra: ${food.fiber}g${food.nutriscore ? `\n🏷️ Nutri-Score: ${food.nutriscore.toUpperCase()}` : ''}${novaInfo}`,
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Pesar alimento',
          onPress: () => setPortionModalVisible(true)
        }
      ]
    );
  };

  // Obtener descripción del grupo NOVA
  const getNovaDescription = (novaGroup: number) => {
    const descriptions = {
      1: 'Sin procesar',
      2: 'Poco procesado',
      3: 'Procesado',
      4: 'Ultra-procesado'
    };
    return descriptions[novaGroup as keyof typeof descriptions] || 'No clasificado';
  };

  // Obtener color del grupo NOVA
  const getNovaColor = (novaGroup?: number) => {
    const colors = {
      1: '#4CAF50',
      2: '#8BC34A',
      3: '#FF9800',
      4: '#F44336'
    };
    return colors[novaGroup as keyof typeof colors] || '#9E9E9E';
  };

  // Función para obtener color del Nutri-Score
  const getNutriScoreColor = (score: string) => {
    const colors: { [key: string]: string } = {
      'a': '#038141',
      'b': '#85bb2f',
      'c': '#fecb02',
      'd': '#ee8100',
      'e': '#e63312'
    };
    return colors[score.toLowerCase()] || '#ccc';
  };

  // Agregar al diario con guardado completo
  const addToFoodDiary = async (finalWeight?: number) => {
    if (isSaving) return;
    try {
      setIsSaving(true);
      const portionNum = finalWeight
        || (scaleAssignment && scaleData.weight > 0 ? scaleData.weight : parseFloat(portion));
      if (isNaN(portionNum) || portionNum <= 0) {
        Alert.alert('Error', 'Ingresa una porción válida');
        return;
      }
      if (!selectedFood) {
        Alert.alert('Error', 'No hay alimento seleccionado');
        return;
      }
      const adjustedFood = {
        ...selectedFood,
        calories: Math.round(selectedFood.calories * portionNum / 100),
        protein: Math.round(selectedFood.protein * portionNum / 100 * 10) / 10,
        carbs: Math.round(selectedFood.carbs * portionNum / 100 * 10) / 10,
        fat: Math.round(selectedFood.fat * portionNum / 100 * 10) / 10,
        fiber: Math.round(selectedFood.fiber * portionNum / 100 * 10) / 10
      };
      const foodData = {
        ...selectedFood,
        adjustedFood: adjustedFood,
        finalWeight: portionNum,
        recommendedWeight: parseFloat(portion)
      };
      const currentDiary = await AsyncStorage.getItem('foodDiary');
      const diary = currentDiary ? JSON.parse(currentDiary) : [];
      diary.push({
        id: Date.now(),
        food: selectedFood,
        adjustedFood: adjustedFood,
        date: new Date().toISOString().split('T')[0],
        timestamp: new Date().toISOString(),
        portion: portionNum,
        meal: 'general',
        weighingMethod: scaleAssignment ? 'iot_scale' : 'manual'
      });
      await AsyncStorage.setItem('foodDiary', JSON.stringify(diary));
      if (isWeighingActive) await stopWeighing();
      const idComida = await saveToRelationalDB(foodData);
      await saveToNoRelationalDB(foodData, idComida);
      Alert.alert(
  '✅ Comida agregada',
  `${selectedFood.name} registrada con ${portionNum}g (${adjustedFood.calories} kcal)`
);

setSelectedFood(null); 
setPortion('100');
setPortionModalVisible(false); 

    } catch (error) {
      Alert.alert('Error', 'Ocurrió un error guardando la comida.');
    } finally {
      setIsSaving(false);
    }
  };
  // Renderizar item de resultado de búsqueda
  const renderFoodItem = ({ item }: { item: Food }) => (
    <TouchableOpacity 
      style={styles.foodItem}
      onPress={() => selectFood(item)}
    >
      <View style={styles.foodItemContent}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.foodItemImage} />
        ) : (
          <View style={styles.foodItemImagePlaceholder}>
            <Text style={styles.foodItemImageText}>🍽️</Text>
          </View>
        )}
        
        <View style={styles.foodItemInfo}>
          <Text style={styles.foodItemName} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.foodItemBrand}>{item.brand}</Text>
          <View style={styles.foodItemNutrition}>
            <Text style={styles.foodItemCalories}>🔥 {item.calories} kcal</Text>
            <View style={styles.badgesContainer}>
              {item.nutriscore && (
                <Text style={[styles.nutriScore, { backgroundColor: getNutriScoreColor(item.nutriscore) }]}>
                  {item.nutriscore.toUpperCase()}
                </Text>
              )}
              {item.novaGroup && (
                <Text style={[styles.novaScore, { backgroundColor: getNovaColor(item.novaGroup) }]}>
                  N{item.novaGroup}
                </Text>
              )}
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  // Mostrar loading mientras se verifica la autenticación
  if (checkingAuth) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor="#7A9B57" barStyle="light-content" />
        <View style={styles.loadingScreen}>
          <ActivityIndicator color="#F5F5DC" size="large" />
          <Text style={styles.loadingText}>Verificando acceso...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#7A9B57" barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Agregar Comida</Text>
        <TouchableOpacity onPress={() => setScaleModalVisible(true)}>
          <View style={styles.scaleStatus}>
            <Text style={[styles.scaleIndicator, { 
              color: scaleAssignment && scaleData.connected ? '#4CAF50' : 
                     scaleAssignment ? '#FF9800' : '#F44336' 
            }]}>
              ⚖️ {scaleAssignment ? 
                  (scaleData.connected ? 'Conectada' : 'Asignada') : 
                  'Sin Asignar'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Categories */}
      <KeyboardAvoidingView 
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.sectionTitle}>Categorías de Alimentos</Text>
          
          {/* Botón de test temporal */}
          <TouchableOpacity
            style={styles.testApiButton}
            onPress={runAPITest}
          >
            <Text style={styles.testApiButtonText}>🧪 Test API OpenFoodFacts</Text>
          </TouchableOpacity>
          
          {foodCategories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={styles.categoryCard}
              onPress={() => selectCategory(category)}
            >
              <View style={styles.categoryIcon}>
                <Text style={styles.categoryIconText}>{category.icon}</Text>
              </View>
              <Text style={styles.categoryName}>{category.name}</Text>
              <Text style={styles.categoryArrow}>→</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal de búsqueda */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={searchModalVisible}
        onRequestClose={() => setSearchModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <KeyboardAvoidingView 
            style={styles.keyboardContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setSearchModalVisible(false)}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {selectedCategory ? selectedCategory.name : 'Buscar Alimentos'}
              </Text>
            </View>

            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar alimentos..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={() => handleSearchFoods(searchQuery, selectedCategory)}
              />
              <TouchableOpacity
                style={styles.searchButton}
                onPress={() => handleSearchFoods(searchQuery, selectedCategory)}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.searchButtonText}>🔍</Text>
                )}
              </TouchableOpacity>
            </View>

            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#7A9B57" />
                <Text style={styles.loadingText}>Buscando alimentos poco procesados...</Text>
              </View>
            )}

            <FlatList
              data={searchResults}
              renderItem={renderFoodItem}
              keyExtractor={(item) => item.id}
              style={styles.resultsList}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            />
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Modal para seleccionar porción con báscula IoT */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={portionModalVisible}
        onRequestClose={() => setPortionModalVisible(true)}
      >
        <KeyboardAvoidingView 
          style={styles.portionModalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.portionModalContent}>
            <Text style={styles.portionModalTitle}>Seleccionar Porción</Text>
            
            {selectedFood && (
              <View style={styles.selectedFoodInfo}>
                <Text style={styles.selectedFoodName}>{selectedFood.name}</Text>
                <Text style={styles.selectedFoodBrand}>{selectedFood.brand}</Text>
                {selectedFood.novaGroup && (
                  <View style={styles.novaContainer}>
                    <Text style={[styles.novaIndicator, { backgroundColor: getNovaColor(selectedFood.novaGroup) }]}>
                      NOVA {selectedFood.novaGroup} - {getNovaDescription(selectedFood.novaGroup)}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Estado de la báscula */}
            {scaleAssignment && (
              <View style={styles.scaleSection}>
                <Text style={styles.scaleSectionTitle}>⚖️ Báscula IoT</Text>
                <View style={[styles.scaleStatusCard, {
                  backgroundColor: scaleData.connected ? '#E8F5E8' : '#FFEBEE'
                }]}>
                  <Text style={styles.scaleStatusText}>
                    Estado: {scaleData.connected ? 'Conectada' : 'Desconectada'}
                  </Text>
                  {scaleData.connected && (
                    <Text style={styles.scaleWeightText}>
                      Peso actual: {scaleData.weight}g
                    </Text>
                  )}
                  
                  {isWeighingActive && (
                    <View style={styles.weighingStatus}>
                      <Text style={styles.weighingStatusText}>
                        {weightStatus === 'weighing' && '⏳ Pesando...'}
                        {weightStatus === 'target_reached' && '✅ Peso alcanzado'}
                        {weightStatus === 'completed' && '🎉 Completado'}
                      </Text>
                      {weightRecommendation && (
                        <Text style={styles.weightRecommendation}>
                          {weightRecommendation}
                        </Text>
                      )}
                    </View>
                  )}
                </View>

                {/* Botones de control de báscula */}
                <View style={styles.scaleControls}>
                  {!isWeighingActive ? (
                    <>
                 
                    </>
                  ) : (
                    <TouchableOpacity
                      style={[styles.scaleControlButton, styles.stopWeighingButton]}
                      onPress={stopScaleWeighing}
                      disabled={scaleLoading}
                    >
                      <Icon name="stop" size={16} color="#FFFFFF" />
                      <Text style={styles.scaleControlText}>Detener Pesado</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            <View style={styles.portionInputContainer}>
              
              <View style={styles.portionInputRow}>
               
                {!scaleAssignment && (
                  <TouchableOpacity
                    style={styles.assignScaleButton}
                    onPress={() => setScaleModalVisible(true)}
                  >
                    <Text style={styles.assignScaleButtonText}>📟 Asignar Báscula</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {selectedFood && portion && !isNaN(parseFloat(portion)) && (
              <View style={styles.nutritionPreview}>
                <Text style={styles.nutritionPreviewTitle}>Información nutricional:</Text>
                <Text style={styles.nutritionPreviewText}>
                  🔥 {Math.round(selectedFood.calories * parseFloat(portion) / 100)} kcal
                </Text>
                <Text style={styles.nutritionPreviewText}>
                  🥩 {Math.round(selectedFood.protein * parseFloat(portion) / 100 * 10) / 10}g proteínas
                </Text>
                <Text style={styles.nutritionPreviewText}>
                  🍞 {Math.round(selectedFood.carbs * parseFloat(portion) / 100 * 10) / 10}g carbohidratos
                </Text>
                <Text style={styles.nutritionPreviewText}>
                  🧈 {Math.round(selectedFood.fat * parseFloat(portion) / 100 * 10) / 10}g grasas
                </Text>
              </View>
            )}

            <View style={styles.portionModalButtons}>
              <TouchableOpacity
                style={[styles.portionModalButton, styles.cancelButton]}
                onPress={() => {
                  setPortionModalVisible(false);
                  if (isWeighingActive) {
                    stopWeighing();
                  }
                }}
                disabled={isSaving}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.portionModalButton, styles.addButton, isSaving && styles.disabledButton]}
                onPress={() => addToFoodDiary()}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.addButtonText}>Registrar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal de asignación de báscula */}
      <ScaleAssignmentModal
        visible={scaleModalVisible}
        onClose={() => setScaleModalVisible(false)}
        onAssigned={(assignment) => {
          console.log('✅ Báscula asignada:', assignment);
          refreshScaleData();
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#7A9B57',
  },
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  backButton: {
    color: '#F5F5DC',
    fontSize: 16,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F5F5DC',
  },
  scaleStatus: {
    alignItems: 'center',
  },
  scaleIndicator: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F5F5DC',
    marginBottom: 20,
    textAlign: 'center',
  },
  testApiButton: {
    backgroundColor: '#FF6B6B',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    alignItems: 'center',
  },
  testApiButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 245, 220, 0.9)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#7A9B57',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  categoryIconText: {
    fontSize: 24,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  categoryArrow: {
    fontSize: 18,
    color: '#7A9B57',
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#7A9B57',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  modalCloseButton: {
    padding: 10,
    marginRight: 10,
  },
  modalCloseText: {
    color: '#F5F5DC',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F5F5DC',
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 20,
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#F5F5DC',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    marginRight: 10,
  },
  searchButton: {
    backgroundColor: '#CD853F',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    minWidth: 50,
    alignItems: 'center',
  },
  searchButtonText: {
    fontSize: 18,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    color: '#F5F5DC',
    marginTop: 10,
    fontSize: 16,
  },
  resultsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  foodItem: {
    backgroundColor: 'rgba(245, 245, 220, 0.9)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  foodItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  foodItemImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 15,
  },
  foodItemImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  foodItemImageText: {
    fontSize: 20,
  },
  foodItemInfo: {
    flex: 1,
  },
  foodItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  foodItemBrand: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  foodItemNutrition: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  foodItemCalories: {
    fontSize: 14,
    color: '#CD853F',
    fontWeight: 'bold',
  },
  badgesContainer: {
    flexDirection: 'row',
    gap: 5,
  },
  nutriScore: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  novaScore: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  portionModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  portionModalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    margin: 20,
    maxWidth: 350,
    width: '90%',
    maxHeight: '90%',
  },
  portionModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 15,
  },
  selectedFoodInfo: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
  },
  selectedFoodName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  selectedFoodBrand: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  novaContainer: {
    alignItems: 'flex-start',
  },
  novaIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  // Estilos para la sección de báscula
  scaleSection: {
    marginBottom: 15,
  },
  scaleSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  scaleStatusCard: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  scaleStatusText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 5,
  },
  scaleWeightText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    textAlign: 'center',
    marginBottom: 5,
  },
  weighingStatus: {
    backgroundColor: '#FFF3E0',
    borderRadius: 6,
    padding: 8,
    marginTop: 5,
  },
  weighingStatusText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#E65100',
    textAlign: 'center',
    marginBottom: 5,
  },
  weightRecommendation: {
    fontSize: 12,
    color: '#E65100',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  scaleControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 10,
  },
  scaleControlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  tareButton: {
    backgroundColor: '#2196F3',
  },
  startWeighingButton: {
    backgroundColor: '#4CAF50',
  },
  stopWeighingButton: {
    backgroundColor: '#F44336',
  },
  scaleControlText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  portionInputContainer: {
    marginBottom: 15,
  },
  portionLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  portionInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  portionInput: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#7A9B57',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 18,
    textAlign: 'center',
  },
  assignScaleButton: {
    backgroundColor: '#FF9800',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  assignScaleButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  nutritionPreview: {
    backgroundColor: '#f0f8f0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  nutritionPreviewTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  nutritionPreviewText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 2,
  },
  portionModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  portionModalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '500',
  },
  addButton: {
    backgroundColor: '#7A9B57',
  },
  addButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
});

export default AgregarComidaScreen;