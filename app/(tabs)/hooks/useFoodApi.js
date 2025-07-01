import { useState } from 'react';

const FOOD_API_URL = 'https://es.openfoodfacts.org';

export const useFoodAPI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const formatProduct = (product) => {
    let calories = 0;
    if (product.nutriments) {
      calories = product.nutriments['energy-kcal_100g'] || 
                product.nutriments['energy-kcal'] || 
                product.nutriments['energy_100g'] || 
                (product.nutriments['energy-kj_100g'] ? Math.round(product.nutriments['energy-kj_100g'] / 4.184) : 0);
    }

    return {
      id: product._id || product.code || `temp_${Date.now()}_${Math.random()}`,
      name: product.product_name || product.product_name_es || product.generic_name || 'Producto sin nombre',
      brand: product.brands || product.brand_owner || 'Sin marca',
      categories: product.categories || '',
      
      calories: Math.round(calories),
      protein: Math.round((product.nutriments?.proteins_100g || product.nutriments?.proteins || 0) * 10) / 10,
      carbs: Math.round((product.nutriments?.carbohydrates_100g || product.nutriments?.carbohydrates || 0) * 10) / 10,
      sugars: Math.round((product.nutriments?.sugars_100g || product.nutriments?.sugars || 0) * 10) / 10,
      fat: Math.round((product.nutriments?.fat_100g || product.nutriments?.fat || 0) * 10) / 10,
      saturatedFat: Math.round((product.nutriments?.['"saturated-fat_100g"'] || product.nutriments?.['saturated-fat'] || 0) * 10) / 10,
      fiber: Math.round((product.nutriments?.fiber_100g || product.nutriments?.fiber || 0) * 10) / 10,
      sodium: Math.round((product.nutriments?.sodium_100g || product.nutriments?.sodium || 0) * 1000), // convertir a mg
      salt: Math.round((product.nutriments?.salt_100g || product.nutriments?.salt || 0) * 10) / 10,
      
      
      servingSize: product.serving_size || '100g',
      ingredientsText: product.ingredients_text || product.ingredients_text_es || '',
      allergens: product.allergens || '',
      
      
      image: product.image_front_small_url || 
             product.image_front_url || 
             product.image_url || 
             product.image_front_thumb_url || 
             null,
      imageNutrition: product.image_nutrition_url || null,
      
      
      novaGroup: product.nova_group || null,
      ecoscore: product.ecoscore_grade || null,
      nutriscore: product.nutriscore_grade || product.nutrition_grade_fr || null,
      
      
      barcode: product.code || null,
      countries: product.countries || '',
      stores: product.stores || '',
      
      
      fetchedAt: new Date().toISOString()
    };
  };

  
  const searchFoods = async (query, options = {}) => {
    if (!query.trim()) {
      throw new Error('El término de búsqueda es requerido');
    }

    setLoading(true);
    setError(null);

    try {
      
      let searchUrl = `${FOOD_API_URL}/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=${options.pageSize || 50}&lang=es`;
      
      
      searchUrl += '&tagtype_0=categories&tag_contains_0=contains&tag_0=en:fresh-foods,en:fruits,en:vegetables,en:raw-foods,en:dairy,en:fresh-meat,en:fish,en:eggs,en:nuts,en:seeds,en:oils,en:cereals';

      console.log('🔍 Búsqueda 1 - Alimentos naturales:', searchUrl);

      const response = await fetch(searchUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'NutralisApp/1.0'
        }
      });
      
      console.log('📡 Status de respuesta 1:', response.status);
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📋 Resultados naturales encontrados:', data.count || 0);
      
      let filteredProducts = [];
      
      if (data.products && data.products.length > 0) {
        
        filteredProducts = data.products
          .filter((product, index) => {
            const hasNutriments = product.nutriments;
            const hasName = product.product_name;
            const hasCalories = product.nutriments && (
              product.nutriments['energy-kcal_100g'] || 
              product.nutriments['energy-kcal'] ||
              product.nutriments['energy_100g']
            );
            
            
            const productName = (product.product_name || '').toLowerCase();
            const categories = (product.categories || '').toLowerCase();
            const brands = (product.brands || '').toLowerCase();
            
            
            const isSimpleFood = productName.split(' ').length <= 3;
            
            
            const excludeTerms = ['chocolate', 'candy', 'cookie', 'cake', 'ice cream', 'soda', 'chip', 'snack', 'frozen', 'prepared', 'sauce', 'dressing', 'spread'];
            const isProcessed = excludeTerms.some(term => productName.includes(term) || categories.includes(term));
            
            
            const naturalCategories = ['fruit', 'vegetable', 'meat', 'fish', 'dairy', 'egg', 'nut', 'seed', 'oil', 'cereal', 'grain'];
            const isNatural = naturalCategories.some(cat => categories.includes(cat));
            
            if (index < 3) {
              console.log(`📋 Producto ${index}:`, {
                name: productName,
                categories: categories,
                isSimple: isSimpleFood,
                isNatural: isNatural,
                isProcessed: isProcessed,
                hasCalories: !!hasCalories
              });
            }
            
            return hasNutriments && hasName && hasCalories && !isProcessed;
          })
          .map(product => formatProduct(product))
          .sort((a, b) => {
            
            const aWords = a.name.split(' ').length;
            const bWords = b.name.split(' ').length;
            return aWords - bWords;
          });
      }

      
      if (filteredProducts.length < 3) {
        console.log('🔄 Pocos resultados naturales, intentando búsqueda general...');
        
        const generalUrl = `${FOOD_API_URL}/cgi/search.pl?search_terms=${encodeURIComponent(query)}&action=process&json=1&page_size=30`;
        
        const generalResponse = await fetch(generalUrl);
        const generalData = await generalResponse.json();
        
        console.log('🔄 Resultados generales:', generalData.count || 0);
        
        if (generalData.products && generalData.products.length > 0) {
          const generalFiltered = generalData.products
            .filter(product => 
              product.nutriments && 
              product.product_name &&
              (product.nutriments['energy-kcal_100g'] || product.nutriments['energy-kcal'])
            )
            .map(product => formatProduct(product))
            .sort((a, b) => {
              
              const aWords = a.name.split(' ').length;
              const bWords = b.name.split(' ').length;
              return aWords - bWords;
            });

          
          filteredProducts = [...filteredProducts, ...generalFiltered]
            .filter((product, index, self) => 
              index === self.findIndex(p => p.name === product.name)
            )
            .slice(0, 100); 
        }
      }

      console.log('📋 Productos finales filtrados:', filteredProducts.length);

      return {
        success: true,
        products: filteredProducts,
        total: filteredProducts.length
      };

    } catch (err) {
      console.error('❌ Error completo en búsqueda de alimentos:', err);
      console.error('❌ Error stack:', err.stack);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getProductByBarcode = async (barcode) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${FOOD_API_URL}/api/v0/product/${barcode}.json`);
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.status === 1 && data.product) {
        return {
          success: true,
          product: formatProduct(data.product)
        };
      } else {
        return {
          success: false,
          message: 'Producto no encontrado'
        };
      }
    } catch (err) {
      console.error('❌ Error obteniendo producto:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };


  const searchByCategory = async (category, options = {}) => {
    setLoading(true);
    setError(null);

    try {
      let searchUrl = `${FOOD_API_URL}/cgi/search.pl?action=process&json=1&page_size=${options.pageSize || 20}&lang=es`;
      searchUrl += `&tagtype_0=categories&tag_contains_0=contains&tag_0=${encodeURIComponent(category)}`;

      const response = await fetch(searchUrl);
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.products && data.products.length > 0) {
        const filteredProducts = data.products
          .filter(product => 
            product.nutriments && 
            product.product_name && 
            product.nutriments['energy-kcal_100g']
          )
          .map(product => formatProduct(product));

        return {
          success: true,
          products: filteredProducts,
          total: data.count || 0
        };
      } else {
        return {
          success: true,
          products: [],
          total: 0
        };
      }
    } catch (err) {
      console.error('❌ Error en búsqueda por categoría:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  
  const getPopularCategories = () => {
    return [
      {
        id: 'cereales',
        name: 'Cereales y Granos',
        searchTerms: ['cereales', 'arroz', 'avena', 'quinoa', 'trigo'],
        icon: '🌾'
      },
      {
        id: 'frutas',
        name: 'Frutas',
        searchTerms: ['frutas', 'manzana', 'naranja', 'plátano', 'fresa'],
        icon: '🍎'
      },
      {
        id: 'verduras',
        name: 'Verduras y Hortalizas',
        searchTerms: ['verduras', 'lechuga', 'tomate', 'zanahoria', 'brócoli'],
        icon: '🥬'
      },
      {
        id: 'lacteos',
        name: 'Lácteos',
        searchTerms: ['leche', 'yogurt', 'queso', 'mantequilla', 'crema'],
        icon: '🥛'
      },
      {
        id: 'carnes',
        name: 'Carnes y Aves',
        searchTerms: ['carne', 'pollo', 'res', 'cerdo', 'pavo'],
        icon: '🍖'
      },
      {
        id: 'pescados',
        name: 'Pescados y Mariscos',
        searchTerms: ['pescado', 'salmón', 'atún', 'camarón', 'mariscos'],
        icon: '🐟'
      },
      {
        id: 'legumbres',
        name: 'Legumbres',
        searchTerms: ['frijoles', 'lentejas', 'garbanzos', 'habas', 'legumbres'],
        icon: '🫘'
      },
      {
        id: 'frutos-secos',
        name: 'Frutos Secos',
        searchTerms: ['nueces', 'almendras', 'cacahuates', 'pistaches', 'frutos secos'],
        icon: '🥜'
      },
      {
        id: 'aceites',
        name: 'Aceites y Grasas',
        searchTerms: ['aceite', 'oliva', 'girasol', 'coco', 'manteca'],
        icon: '🫒'
      },
      {
        id: 'bebidas',
        name: 'Bebidas',
        searchTerms: ['agua', 'jugo', 'refresco', 'té', 'café'],
        icon: '🥤'
      }
    ];
  };

  
  const getQuickSuggestions = async (query) => {
    if (query.length < 2) return [];

    try {
      const response = await fetch(
        `${FOOD_API_URL}/cgi/suggest.pl?tagtype=categories&string=${encodeURIComponent(query)}&lang=es`
      );
      
      if (response.ok) {
        const data = await response.json();
        return data.suggestions || [];
      }
    } catch (err) {
      console.warn('Error obteniendo sugerencias:', err);
    }
    
    return [];
  };

  
  const getMexicanFoods = async () => {
    const mexicanTerms = [
      'tortilla', 'frijoles', 'arroz', 'maíz', 'chile', 
      'aguacate', 'tomate', 'cebolla', 'limón', 'nopal'
    ];
    
    try {
      const randomTerm = mexicanTerms[Math.floor(Math.random() * mexicanTerms.length)];
      return await searchFoods(randomTerm, { pageSize: 10 });
    } catch (err) {
      console.error('Error obteniendo alimentos mexicanos:', err);
      return { success: false, products: [] };
    }
  };

  
  const testAPI = async () => {
    console.log('🧪 Iniciando test de API...');
    
    try {
      
      const testUrl1 = 'https://es.openfoodfacts.org/cgi/search.pl?search_terms=arroz&action=process&json=1&page_size=5';
      console.log('🧪 Test 1 - URL básica:', testUrl1);
      
      const response1 = await fetch(testUrl1);
      console.log('🧪 Test 1 - Status:', response1.status);
      
      const data1 = await response1.json();
      console.log('🧪 Test 1 - Respuesta:', {
        count: data1.count,
        products_length: data1.products ? data1.products.length : 'No products',
        first_product_name: data1.products?.[0]?.product_name || 'No name'
      });

      
      const testUrl2 = 'https://world.openfoodfacts.org/cgi/search.pl?search_terms=rice&action=process&json=1&page_size=5';
      console.log('🧪 Test 2 - API mundial:', testUrl2);
      
      const response2 = await fetch(testUrl2);
      console.log('🧪 Test 2 - Status:', response2.status);
      
      const data2 = await response2.json();
      console.log('🧪 Test 2 - Respuesta:', {
        count: data2.count,
        products_length: data2.products ? data2.products.length : 'No products',
        first_product_name: data2.products?.[0]?.product_name || 'No name'
      });

      return {
        test1: { success: response1.ok, count: data1.count || 0 },
        test2: { success: response2.ok, count: data2.count || 0 }
      };

    } catch (error) {
      console.error('🧪 Error en test API:', error);
      return { error: error.message };
    }
  };

  return {
    loading,
    error,
    searchFoods,
    getProductByBarcode,
    searchByCategory,
    getPopularCategories,
    getQuickSuggestions,
    getMexicanFoods,
    formatProduct,
    testAPI  
  };
};

export default useFoodAPI;