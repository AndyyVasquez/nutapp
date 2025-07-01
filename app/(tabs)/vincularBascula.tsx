import { router } from 'expo-router';
import React from 'react';
import {
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import BottomNavbar from './navbar';

const BasculaScreen = () => {
  const handleScanBarcode = () => {
    
    console.log('Abrir escáner de código de barras');
  };

  const handleLinkScale = () => {
    
    console.log('Vincular báscula');
  };

  const handleAgregar = () => {
    router.push('./agregarComida');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#7A9B57" barStyle="light-content" />
      
      
      <View style={styles.header}>
      </View>

      
      <View style={styles.content}>
        
        <Text style={styles.title}>Agregar Comida</Text>

        
        <View style={styles.scannerCard}>
          
          <View style={styles.scannerIconContainer}>
            <View style={styles.scannerFrame}>
              
              <View style={styles.cornerTopLeft} />
              <View style={styles.cornerTopRight} />
              <View style={styles.cornerBottomLeft} />
              <View style={styles.cornerBottomRight} />
              
              
              <View style={styles.barcodeContainer}>
                <View style={styles.barcodeIcon}>
                  <View style={styles.barcodeLine1} />
                  <View style={styles.barcodeLine2} />
                  <View style={styles.barcodeLine3} />
                  <View style={styles.barcodeLine4} />
                </View>
              </View>
            </View>
          </View>
        </View>

        
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.linkButton}
            onPress={handleLinkScale}
          >
            <Text style={styles.linkButtonText}>Vincular Báscula</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.registerButton}
            onPress={handleAgregar}
          >
            <Text style={styles.registerButtonText}>Registrar comida</Text>
          </TouchableOpacity>
        </View>
      </View>

      
      <BottomNavbar activeTab="add" />
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
  },
  scannerCard: {
    backgroundColor: '#F5F5DC',
    borderRadius: 12,
    padding: 30,
    marginBottom: 40,
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
  scannerIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerFrame: {
    width: 200,
    height: 200,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cornerTopLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 30,
    height: 30,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#7A9B57',
  },
  cornerTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 30,
    height: 30,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: '#7A9B57',
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#7A9B57',
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: '#7A9B57',
  },
  barcodeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  barcodeIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  barcodeLine1: {
    width: 3,
    height: 40,
    backgroundColor: '#333333',
  },
  barcodeLine2: {
    width: 2,
    height: 40,
    backgroundColor: '#333333',
  },
  barcodeLine3: {
    width: 4,
    height: 40,
    backgroundColor: '#333333',
  },
  barcodeLine4: {
    width: 2,
    height: 40,
    backgroundColor: '#333333',
  },
  buttonContainer: {
    width: '100%',
    gap: 15,
  },
  linkButton: {
    backgroundColor: '#F5F5DC',
    borderRadius: 8,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  linkButtonText: {
    color: '#333333',
    fontSize: 16,
    fontWeight: '600',
  },
  registerButton: {
    backgroundColor: '#7A9B57',
    borderRadius: 8,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default BasculaScreen;