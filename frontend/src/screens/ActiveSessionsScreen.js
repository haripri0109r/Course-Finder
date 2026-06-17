import React, { useEffect, useState, useContext } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../context/ThemeContext';
import { SPACING, FONTS, RADIUS } from '../utils/theme';
import api from '../utils/api';
import { showToast } from '../components/Toast';

export default function ActiveSessionsScreen({ navigation }) {
  const { colors } = useAppTheme();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const { data } = await api.get('/auth/sessions');
      setSessions(data.data);
    } catch (e) {
      showToast({ message: 'Failed to fetch sessions', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = (sessionId) => {
    Alert.alert(
      "Revoke Session",
      "Are you sure you want to log out this device?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Revoke", 
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`/auth/sessions/${sessionId}`);
              showToast({ message: 'Session revoked', type: 'success' });
              fetchSessions(); // Refresh list
            } catch (e) {
              showToast({ message: 'Failed to revoke session', type: 'error' });
            }
          }
        }
      ]
    );
  };

  const handleLogoutAll = () => {
    Alert.alert(
      "Log Out All Devices",
      "This will log you out of every device including this one.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Log Out All", 
          style: "destructive",
          onPress: async () => {
            try {
              await api.post('/auth/logout-all');
              // The AuthContext interceptor might kick in, or we navigate manually
              navigation.replace('Login');
            } catch (e) {
              showToast({ message: 'Failed to logout all devices', type: 'error' });
            }
          }
        }
      ]
    );
  };

  const renderItem = ({ item }) => {
    const isCurrent = false; // We could match by IP or a stored local sessionId if we had one
    
    return (
      <View style={[styles.sessionCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
        <View style={styles.sessionInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="phone-portrait-outline" size={24} color={colors.textPrimary} style={{ marginRight: 8 }} />
            <Text style={[styles.deviceText, { color: colors.textPrimary }]}>{item.deviceInfo}</Text>
          </View>
          <Text style={[styles.ipText, { color: colors.textSecondary }]}>IP: {item.ipAddress}</Text>
          <Text style={[styles.dateText, { color: colors.textSecondary }]}>
            Started: {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.revokeButton} 
          onPress={() => handleRevoke(item._id)}
        >
          <Text style={styles.revokeText}>Revoke</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Active Sessions</Text>
        <TouchableOpacity onPress={handleLogoutAll}>
          <Text style={{ color: '#EF4444', fontWeight: 'bold' }}>Log out all</Text>
        </TouchableOpacity>
      </View>
      
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No active sessions found.</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  headerTitle: { ...FONTS.h3 },
  list: { padding: SPACING.md },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.sm,
  },
  sessionInfo: { flex: 1 },
  deviceText: { ...FONTS.bodyBold, marginBottom: 4 },
  ipText: { ...FONTS.small, marginBottom: 2 },
  dateText: { ...FONTS.small },
  revokeButton: {
    backgroundColor: '#EF444420',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
  },
  revokeText: { color: '#EF4444', fontWeight: 'bold' },
  emptyText: { textAlign: 'center', marginTop: SPACING.xl },
});
