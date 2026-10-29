import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { AppHeader, CustomInput } from '../../src/components/ui';
import { PrimaryButton, SecondaryButton } from '../../src/components/buttons';
import { AlertBanner } from '../../src/components/feedback';
import { useAuthStore } from '../../src/store/auth.store';
import { apiClient } from '../../src/api/client';

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading, error } = useAuthStore();
  const [authMode, setAuthMode] = useState<'ID' | 'PHONE'>('ID');
  const [employeeCode, setEmployeeCode] = useState('TCH-1042');
  const [password, setPassword] = useState('password123');
  const [phoneNumber, setPhoneNumber] = useState('+1 (555) 234-5678');
  const [localError, setLocalError] = useState('');

  const handleLoginWithId = async () => {
    if (!employeeCode.trim()) {
      setLocalError('Please enter your Employee Code');
      return;
    }
    setLocalError('');
    const success = await login(employeeCode.trim(), password);
    if (success) {
      router.push('/(auth)/device-setup');
    }
  };

  const handleSendOtp = async () => {
    if (!phoneNumber.trim()) {
      setLocalError('Please enter your registered phone number');
      return;
    }
    setLocalError('');
    try {
      await apiClient.sendOtp({ phoneNumber });
      router.push({
        pathname: '/(auth)/otp',
        params: { phone: phoneNumber }
      });
    } catch (err: any) {
      setLocalError(err.message || 'Failed to dispatch OTP');
    }
  };

  const [showServerConfig, setShowServerConfig] = useState(false);
  const [customServerUrl, setCustomServerUrl] = useState(apiClient.getBaseUrl());

  const handleUpdateServerUrl = () => {
    if (customServerUrl.trim()) {
      apiClient.setBaseUrl(customServerUrl.trim());
      setShowServerConfig(false);
      setLocalError('');
    }
  };

  return (
    <View style={styles.screen}>
      <AppHeader
        title="Faculty Sign In"
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/(auth)/welcome'))}
      />

      <ScrollView contentContainerStyle={styles.container}>
        {/* Server Endpoint Status Badge */}
        <TouchableOpacity
          style={styles.serverBadge}
          onPress={() => setShowServerConfig(!showServerConfig)}
        >
          <View style={styles.statusDot} />
          <Text style={styles.serverBadgeText}>
            Server: {apiClient.getBaseUrl().replace('http://', '').replace('/api', '')} (Tap to change)
          </Text>
        </TouchableOpacity>

        {showServerConfig && (
          <View style={styles.serverConfigCard}>
            <Text style={styles.serverConfigTitle}>Backend Server Configuration</Text>
            <Text style={styles.serverConfigDesc}>
              Set the IP address of your computer running "npm run server" on your Wi-Fi:
            </Text>
            <CustomInput
              label="API Base URL"
              value={customServerUrl}
              onChangeText={setCustomServerUrl}
              placeholder="http://192.168.1.xxx:3001/api"
              autoCapitalize="none"
            />
            <PrimaryButton
              title="Save & Connect"
              onPress={handleUpdateServerUrl}
              style={{ marginTop: 6 }}
            />
          </View>
        )}

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, authMode === 'ID' && styles.activeTab]}
            onPress={() => setAuthMode('ID')}
          >
            <Text style={[styles.tabText, authMode === 'ID' && styles.activeTabText]}>
              Employee ID
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, authMode === 'PHONE' && styles.activeTab]}
            onPress={() => setAuthMode('PHONE')}
          >
            <Text style={[styles.tabText, authMode === 'PHONE' && styles.activeTabText]}>
              Mobile & OTP
            </Text>
          </TouchableOpacity>
        </View>

        {(error || localError) ? (
          <AlertBanner
            title="Authentication Notice"
            message={localError || error || ''}
            type="error"
          />
        ) : null}

        {authMode === 'ID' ? (
          <View style={styles.formContainer}>
            <Text style={styles.formDesc}>
              Enter your assigned faculty code to verify credentials against the database.
            </Text>
            <CustomInput
              label="Employee Code / ID"
              value={employeeCode}
              onChangeText={setEmployeeCode}
              placeholder="e.g. TCH-1042"
              autoCapitalize="characters"
            />
            <CustomInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Enter password"
            />
            <PrimaryButton
              title="Verify & Continue"
              onPress={handleLoginWithId}
              loading={isLoading}
              style={{ marginTop: 8 }}
            />
          </View>
        ) : (
          <View style={styles.formContainer}>
            <Text style={styles.formDesc}>
              We will send a 6-digit one-time security passkey to your registered phone.
            </Text>
            <CustomInput
              label="Phone Number"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              placeholder="+1 555-0100"
            />
            <PrimaryButton
              title="Send Verification Passkey"
              onPress={handleSendOtp}
              style={{ marginTop: 8 }}
            />
          </View>
        )}

        <View style={styles.registerPrompt}>
          <Text style={styles.registerPromptText}>New faculty member?</Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text style={styles.registerLink}> Create an account</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footerNote}>
          <Text style={styles.noteTitle}>Campus Security Policy</Text>
          <Text style={styles.noteBody}>
            Attendance can only be logged on authorized faculty hardware bound with hardware TPM keys.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
  container: {
    padding: 20,
  },
  serverBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 8,
  },
  serverBadgeText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  serverConfigCard: {
    backgroundColor: '#1E1B4B',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#4338CA',
  },
  serverConfigTitle: {
    color: '#E0E7FF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  serverConfigDesc: {
    color: '#C7D2FE',
    fontSize: 12,
    marginBottom: 12,
    lineHeight: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#131B2E',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: '#4F46E5',
  },
  tabText: {
    color: '#94A3B8',
    fontWeight: '600',
    fontSize: 14,
  },
  activeTabText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  formContainer: {
    backgroundColor: '#131B2E',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 20,
  },
  formDesc: {
    color: '#94A3B8',
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 18,
  },
  registerPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  registerPromptText: {
    color: '#94A3B8',
    fontSize: 14,
  },
  registerLink: {
    color: '#6366F1',
    fontSize: 14,
    fontWeight: '700',
  },
  footerNote: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  noteTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#818CF8',
    marginBottom: 4,
  },
  noteBody: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  }
});
