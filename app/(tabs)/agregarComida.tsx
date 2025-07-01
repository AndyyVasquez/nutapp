// screens/AgregarComidaScreen.js - Versión corregida con KeyboardAvoidingView y filtro NOVA
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
import useFoodAPI from './hooks/useFoodApi';

// Configuración del servidor
const SERVER_API_URL = 'http://10.13.3.211:3001';

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

  // Hook personalizado para la API de alimentos
  const { loading, error, searchFoods, getPopularCategories, testAPI } = useFoodAPI();

  // Verificar autenticación al cargar
  useEffect(() => {
    checkAuthentication();
  }, []);

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
        pageSize: 50, // Aumentamos para tener más productos antes de filtrar
        category: category?.searchTerms.join(' OR ')
      };

      const result = await searchFoods(query, options);

      if (result.success) {
        // Aplicar filtro NOVA aquí - priorizamos alimentos menos procesados
        const filteredProducts = result.products
          .filter((product: any) => {
            // Priorizar productos con NOVA group 1 (sin procesar) y 2 (poco procesados)
            return product.novaGroup === 1 || product.novaGroup === 2 || !product.novaGroup;
          })
          .sort((a: any, b: any) => {
            // Ordenar por NOVA group: primero los menos procesados
            const novaA = a.novaGroup || 5;
            const novaB = b.novaGroup || 5;
            
            if (novaA !== novaB) {
              return novaA - novaB;
            }
            
            // Si tienen el mismo NOVA group, ordenar por nombre
            return a.name.localeCompare(b.name);
          })
          .slice(0, 20); // Limitar a 20 resultados finales

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
    
    // Buscar automáticamente con términos de la categoría
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
          text: 'Elegir porción',
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
      1: '#4CAF50', // Verde - sin procesar
      2: '#8BC34A', // Verde claro - poco procesado
      3: '#FF9800', // Naranja - procesado
      4: '#F44336'  // Rojo - ultra-procesado
    };
    return colors[novaGroup as keyof typeof colors] || '#9E9E9E';
  };

  // Agregar al diario con porción personalizada
  const addToFoodDiary = async () => {
    try {
      const portionNum = parseFloat(portion);
      if (isNaN(portionNum) || portionNum <= 0) {
        Alert.alert('Error', 'Ingresa una porción válida');
        return;
      }

      const currentDiary = await AsyncStorage.getItem('foodDiary');
      const diary = currentDiary ? JSON.parse(currentDiary) : [];
      
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
      
      const newEntry = {
        id: Date.now(),
        food: selectedFood,
        adjustedFood: adjustedFood,
        date: new Date().toISOString().split('T')[0],
        timestamp: new Date().toISOString(),
        portion: portionNum,
        meal: 'general'
      };
      
      diary.push(newEntry);
      await AsyncStorage.setItem('foodDiary', JSON.stringify(diary));
      
      Alert.alert(
        '¡Agregado!', 
        `${selectedFood.name} (${portionNum}g) se agregó a tu diario\n🔥 ${adjustedFood.calories} kcal`,
        [
          {
            text: 'Agregar otro',
            onPress: () => {
              setPortionModalVisible(false);
            }
          },
          {
            text: 'Finalizar',
            onPress: () => {
              setPortionModalVisible(false);
              setSearchModalVisible(false);
            }
          }
        ]
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error guardando en diario:', errorMessage);
      Alert.alert('Error', `No se pudo guardar en el diario.\n${errorMessage}`);
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

  // Si no hay usuario después del loading, no mostrar nada 
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

      {/* Modal para seleccionar porción */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={portionModalVisible}
        onRequestClose={() => setPortionModalVisible(false)}
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

            <View style={styles.portionInputContainer}>
              <Text style={styles.portionLabel}>Cantidad (gramos):</Text>
              <TextInput
                style={styles.portionInput}
                value={portion}
                onChangeText={setPortion}
                keyboardType="numeric"
                placeholder="100"
              />
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
                onPress={() => setPortionModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.portionModalButton, styles.addButton]}
                onPress={addToFoodDiary}
              >
                <Text style={styles.addButtonText}>Agregar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  userInfo: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  userWelcome: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F5F5DC',
    marginBottom: 5,
  },
  userDetails: {
    fontSize: 14,
    color: '#F5F5DC',
    opacity: 0.8,
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
  portionInputContainer: {
    marginBottom: 15,
  },
  portionLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  portionInput: {
    borderWidth: 2,
    borderColor: '#7A9B57',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 18,
    textAlign: 'center',
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
});

export default AgregarComidaScreen;