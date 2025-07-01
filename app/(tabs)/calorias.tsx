import React from 'react';
import {
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import BottomNavbar from './navbar';

const CaloriasScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#7A9B57" barStyle="light-content" />
      
      <View style={styles.header}>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Calorías Diarias</Text>

        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>
            Calorías consumidas vs{'\n'}recomendadas
          </Text>
          <View style={styles.chartPlaceholder}>
          </View>
        </View>

        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Calorías gastadas</Text>
          <View style={styles.chartPlaceholder}>
          </View>
        </View>

        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>
            Distribución por grupo de{'\n'}alimentos
          </Text>
          <View style={styles.chartPlaceholder}>
          </View>
        </View>
      </ScrollView>

      <BottomNavbar activeTab="calendar" />
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
    paddingVertical: 25,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 30,
    textAlign: 'left',
  },
  chartCard: {
    backgroundColor: '#F5F5DC',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 22,
  },
  chartPlaceholder: {
    height: 120,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
});

export default CaloriasScreen;