import { router } from 'expo-router';
import React from 'react';
import {
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import BottomNavbar from './navbar';

const SolicitarNutriologoScreen = () => {
  const handleSolicitar = () => {
    router.push('./formularioNutriologo');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#7A9B57" barStyle="light-content" />
      
      <View style={styles.header}>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>
          Profesional{'\n'}de la Salud
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Solicitar Nutriólogo</Text>
          
          <View style={styles.iconContainer}>
            <View style={styles.userIcon}>
              <View style={styles.userHead}></View>
              <View style={styles.userBody}></View>
            </View>
          </View>
          
          <Text style={styles.description}>
            Obtén asesoramiento personalizado{'\n'}de un profesional de la nutrición
          </Text>
          
          <TouchableOpacity 
            style={styles.solicitarButton}
            onPress={handleSolicitar}
          >
            <Text style={styles.solicitarButtonText}>Solicitar Nutriólogo</Text>
          </TouchableOpacity>
        </View>
      </View>

      <BottomNavbar activeTab="profile" />
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
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 40,
    textAlign: 'center',
    lineHeight: 38,
  },
  card: {
    backgroundColor: '#F5F5DC',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    width: '90%',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 30,
    textAlign: 'center',
  },
  iconContainer: {
    marginBottom: 30,
  },
  userIcon: {
    alignItems: 'center',
  },
  userHead: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333333',
    marginBottom: 5,
  },
  userBody: {
    width: 60,
    height: 40,
    borderRadius: 30,
    backgroundColor: '#333333',
  },
  description: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 20,
  },
  solicitarButton: {
    backgroundColor: '#7A9B57',
    borderRadius: 8,
    paddingVertical: 15,
    paddingHorizontal: 30,
    width: '100%',
    alignItems: 'center',
  },
  solicitarButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SolicitarNutriologoScreen;