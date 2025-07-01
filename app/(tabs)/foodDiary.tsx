// components/FoodDiary.js - Para ver el diario de alimentos guardado
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

interface FoodEntry {
  id: string | number;
  date: string;
  portion: number;
  food: {
    name: string;
    calories: number;
    image?: string;
  };
}

const FoodDiary = () => {
  const [foodDiary, setFoodDiary] = useState<FoodEntry[]>([]);
  const [totalCalories, setTotalCalories] = useState(0);

  useEffect(() => {
    loadFoodDiary();
  }, []);

  const loadFoodDiary = async () => {
    try {
      const diaryData = await AsyncStorage.getItem('foodDiary');
      if (diaryData) {
        const diary = JSON.parse(diaryData);
        
        
        const today = new Date().toISOString().split('T')[0];
        const todayEntries = diary.filter((entry: FoodEntry) => entry.date === today);
        
        setFoodDiary(todayEntries);

        const total = todayEntries.reduce((sum: number, entry: FoodEntry) => {
          return sum + (entry.food.calories * entry.portion / 100);
        }, 0);
        setTotalCalories(Math.round(total));
      }
    } catch (error) {
      console.error('Error cargando diario:', error);
    }
  };

  const deleteEntry = async (entryId: string | number) => {
    Alert.alert(
      'Eliminar entrada',
      '¿Estás seguro de que quieres eliminar esta entrada?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const diaryData = await AsyncStorage.getItem('foodDiary');
              if (diaryData) {
                const diary = JSON.parse(diaryData);
                const updatedDiary = diary.filter((entry: FoodEntry) => entry.id !== entryId);
                await AsyncStorage.setItem('foodDiary', JSON.stringify(updatedDiary));
                
                loadFoodDiary();
              }
            } catch (error) {
              console.error('Error eliminando entrada:', error);
            }
          }
        }
      ]
    );
  };

  const renderFoodEntry = ({ item }: { item: FoodEntry }) => (
    <View style={styles.entryCard}>
      <View style={styles.entryContent}>
        {item.food.image ? (
          <Image source={{ uri: item.food.image }} style={styles.entryImage} />
        ) : (
          <View style={styles.entryImagePlaceholder}>
            <Text style={styles.entryImageText}>🍽️</Text>
          </View>
        )}
        
        <View style={styles.entryInfo}>
          <Text style={styles.entryName}>{item.food.name}</Text>
          <Text style={styles.entryPortion}>{item.portion}g</Text>
          <Text style={styles.entryCalories}>
            🔥 {Math.round(item.food.calories * item.portion / 100)} kcal
          </Text>
        </View>
        
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteEntry(item.id)}
        >
          <Text style={styles.deleteButtonText}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mi Diario de Hoy</Text>
        <View style={styles.totalCalories}>
          <Text style={styles.totalCaloriesText}>Total: {totalCalories} kcal</Text>
        </View>
      </View>

      {foodDiary.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            No has registrado alimentos hoy
          </Text>
          <Text style={styles.emptyStateSubtext}>
            ¡Agrega tus comidas para llevar un registro!
          </Text>
        </View>
      ) : (
        <FlatList
          data={foodDiary}
          renderItem={renderFoodEntry}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#7A9B57',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F5F5DC',
  },
  totalCalories: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  totalCaloriesText: {
    color: '#F5F5DC',
    fontWeight: 'bold',
  },
  entryCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginVertical: 5,
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  entryContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  entryImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 15,
  },
  entryImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  entryImageText: {
    fontSize: 20,
  },
  entryInfo: {
    flex: 1,
  },
  entryName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  entryPortion: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  entryCalories: {
    fontSize: 14,
    color: '#CD853F',
    fontWeight: 'bold',
  },
  deleteButton: {
    padding: 10,
  },
  deleteButtonText: {
    fontSize: 18,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});

export default FoodDiary;