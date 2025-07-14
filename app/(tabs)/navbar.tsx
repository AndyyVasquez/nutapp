import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon2 from 'react-native-vector-icons/AntDesign';
import Icon from 'react-native-vector-icons/FontAwesome6';
import Icon3 from 'react-native-vector-icons/Ionicons';

// Configuración del servidor
const SERVER_API_URL = 'https://nutweb.onrender.com';

const BottomNavbar = ({ activeTab = '' }) => {
  const [menuVisible, setMenuVisible] = useState(false);
  
const handleLogout = async () => {
  try {
    console.log('🚪 Iniciando logout...');
    
    // Llamar al servidor (opcional)
    try {
      await fetch(`${SERVER_API_URL}/api/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (serverError) {
      console.log('Error del servidor (no crítico):', serverError);
    }
    
    // ✅ Limpiar TODA la data local
    await AsyncStorage.multiRemove([
      'user',
      'formularioEnviado', 
      'formularioData',
      'authToken',
      // Agrega cualquier otra key que uses
    ]);
    
    console.log('✅ Datos locales limpiados');
    
    // ✅ Redirigir al login
    router.push('./login'); // o router.push('/login')
    
    Alert.alert('Éxito', 'Sesión cerrada correctamente');
    
  } catch (error) {
    console.error('❌ Error en logout:', error);
    Alert.alert('Error', 'Problema cerrando sesión');
  }
};

  const handleStats = () => {
    router.push('./home');
  };

  const handleCalorias = () => {
    router.push('./calorias');
  };

  const handleAgregar = () => {
    router.push('./agregarComida');
  };

  const handleNutriologo = () => {
    router.push('./solicitarNutriologo');
  };

const handlePasos = () => {
  router.push('./registroPasos');
};
  const handleProfileMenu = () => {
    setMenuVisible(true);
  };

  return (
    <>
      <View style={styles.bottomNav}>
        {/* Estadísticas / Home */}
        <TouchableOpacity 
          style={[
            styles.navItem,
            activeTab === 'stats' && styles.activeNavItem
          ]}
          onPress={handleStats}
        >
          <Icon
            name="chart-line"
            size={24}
            color={activeTab === 'stats' ? "#FFFFFF" : "#000"}
            style={styles.navIcon}
          />
        </TouchableOpacity>
        
        {/* Calendario / Calorías */}
        <TouchableOpacity 
          style={[
            styles.navItem,
            activeTab === 'calendar' && styles.activeNavItem
          ]}
          onPress={handleCalorias}
        >
          <Icon
            name="calendar"
            size={24}
            color={activeTab === 'calendar' ? "#FFFFFF" : "#000"}
            style={styles.navIcon}
          />
        </TouchableOpacity>
        
        {/* Agregar Comida (Botón central) */}
        <TouchableOpacity 
          style={[styles.navItem, styles.addButton]}
          onPress={handleAgregar}
        >
          <Icon2
            name="pluscircleo"
            size={28}
            color="#FFFFFF"
            style={styles.navIcon}
          />
        </TouchableOpacity>
        
        {/* Pasos */}
        <TouchableOpacity 
          style={[
            styles.navItem,
            activeTab === 'steps' && styles.activeNavItem
          ]}
          onPress={handlePasos}
        >
          <Icon3
            name="footsteps-outline"
            size={24}
            color={activeTab === 'steps' ? "#FFFFFF" : "#000"}
            style={styles.navIcon}
          />
        </TouchableOpacity>
        
        {/* Perfil / Menú */}
        <TouchableOpacity 
          style={[
            styles.navItem,
            activeTab === 'profile' && styles.activeNavItem
          ]}
          onPress={handleProfileMenu}
        >
          <Icon2
            name="user"
            size={24}
            color={activeTab === 'profile' ? "#FFFFFF" : "#000"}
            style={styles.navIcon}
          />
        </TouchableOpacity>
      </View>

      {/* Modal de menú */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={menuVisible}
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menuContainer}>
            
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={handleNutriologo}
            >
              <Icon2 name="adduser" size={20} color="#333" />
              <Text style={styles.menuText}>Solicitar Nutriólogo</Text>
            </TouchableOpacity>
            
            <View style={styles.menuSeparator} />
            
            <TouchableOpacity 
              style={[styles.menuItem, styles.logoutMenuItem]}
              onPress={handleLogout}
            >
              <Icon3 name="log-out-outline" size={20} color="#DC3545" />
              <Text style={[styles.menuText, styles.logoutText]}>Cerrar Sesión</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#F5F5DC',
    paddingVertical: 12,
    paddingHorizontal: 10,
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 20,
  },
  activeNavItem: {
    backgroundColor: '#7A9B57',
  },
  addButton: {
    backgroundColor: '#7A9B57',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  navIcon: {
    fontSize: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  menuContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 20,
    marginBottom: 80, // Espacio para el navbar
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
  },
  logoutMenuItem: {
    borderRadius: 8,
  },
  menuText: {
    fontSize: 16,
    marginLeft: 15,
    color: '#333',
    fontWeight: '500',
  },
  logoutText: {
    color: '#DC3545',
    fontWeight: '600',
  },
  menuSeparator: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 5,
  },
});

export default BottomNavbar;