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

const ActivityScreen = () => {
  const handleLinkPedometer = () => {
    console.log('Vincular podómetro');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#7A9B57" barStyle="light-content" />
      
      
      <View style={styles.header}>
      </View>

      
      <View style={styles.content}>
        
        <Text style={styles.title}>Actividad Física</Text>

        
        <View style={styles.stepsSection}>
          <Text style={styles.stepsTitle}>Pasos diarios</Text>
          <Text style={styles.stepsCount}>5348 pasos de hoy</Text>
        </View>

        
        <View style={styles.pedometerCard}>
          <View style={styles.pedometerContainer}>
            
            <View style={styles.pedometerDevice}>
              
              <View style={styles.deviceBody}>
                
                <View style={styles.deviceScreen}>
                  <Text style={styles.screenTime}>10:50</Text>
                  <Text style={styles.screenDate}>2/03</Text>
                </View>
                
                
                <View style={styles.buttonRow}>
                  <View style={styles.deviceButton}>
                    <Text style={styles.buttonText}>MODE</Text>
                  </View>
                  <View style={styles.deviceButton}>
                    <Text style={styles.buttonText}>SET</Text>
                  </View>
                </View>
                
                <View style={styles.buttonRow}>
                  <View style={styles.deviceButton}>
                    <Text style={styles.buttonText}>START</Text>
                  </View>
                  <View style={styles.deviceButton}>
                    <Text style={styles.buttonText}>RESET</Text>
                  </View>
                </View>
              </View>
              
              
              <View style={styles.brandArea}>
                <Text style={styles.brandText}>OMRON</Text>
              </View>
            </View>
          </View>
          
          
          <TouchableOpacity 
            style={styles.linkButton}
            onPress={handleLinkPedometer}
          >
            <Text style={styles.linkButtonText}>Vincular Podómetro</Text>
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
  },
  stepsSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  stepsTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 10,
  },
  stepsCount: {
    fontSize: 16,
    color: '#666666',
  },
  pedometerCard: {
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
  pedometerContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  pedometerDevice: {
    width: 140,
    height: 180,
    backgroundColor: '#B8C5D1',
    borderRadius: 20,
    padding: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  deviceBody: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
  },
  deviceScreen: {
    width: '90%',
    height: 50,
    backgroundColor: '#2C3E50',
    borderRadius: 8,
    marginBottom: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTime: {
    color: '#00FF00',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  screenDate: {
    color: '#00FF00',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 8,
  },
  deviceButton: {
    width: 45,
    height: 20,
    backgroundColor: '#34495E',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: 'bold',
  },
  brandArea: {
    marginTop: 10,
    alignItems: 'center',
  },
  brandText: {
    color: '#2C3E50',
    fontSize: 12,
    fontWeight: 'bold',
  },
  linkButton: {
    backgroundColor: '#F5F5DC',
    borderWidth: 1,
    borderColor: '#D4D4AA',
    borderRadius: 8,
    paddingVertical: 15,
    paddingHorizontal: 30,
    alignItems: 'center',
    width: '100%',
  },
  linkButtonText: {
    color: '#333333',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ActivityScreen;