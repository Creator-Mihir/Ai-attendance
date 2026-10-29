import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { AppHeader, CustomInput } from '../../src/components/ui';
import { PrimaryButton, SecondaryButton } from '../../src/components/buttons';
import { AlertBanner } from '../../src/components/feedback';
import { useAuthStore } from '../../src/store/auth.store';

export default function OtpVerificationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const phoneNumber = (params.phone as string) || '+1 (555) 234-5678';
  const { verifyOtp, isLoading, error } = useAuthStore();
  const [otp, setOtp] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(45);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (secondsLeft > 0) {
      const t = setTimeout(() => setSecondsLeft(secondsLeft - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [secondsLeft]);

  const handleVerify = async () => {
    if (otp.length < 6) {
      setLocalError('Please enter the complete 6-digit OTP');
      return;
    }
    setLocalError('');
    const success = await verifyOtp(phoneNumber, otp);
    if (success) {
      router.push('/(auth)/device-setup');
    }
  };

  const fillDemoOtp = () => {
    setOtp('123456');
  };

  return (
    <View style={styles.screen}>
      <AppHeader
        title="Verify OTP"
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/(auth)/login'))}
      />

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Enter 6-Digit Code</Text>
          <Text style={styles.subtitle}>
            A verification code was sent to <Text style={styles.phoneHighlight}>{phoneNumber}</Text>
          </Text>

          {(error || localError) ? (
            <AlertBanner
              title="Verification Issue"
              message={localError || error || ''}
              type="error"
            />
          ) : null}

          <CustomInput
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            placeholder="• • • • • •"
            style={styles.otpInput}
          />

          <PrimaryButton
            title="Confirm & Authenticate"
            onPress={handleVerify}
            loading={isLoading}
            style={{ marginTop: 12 }}
          />

          <SecondaryButton
            title="Auto-fill Demo Code (123456)"
            onPress={fillDemoOtp}
            style={{ marginTop: 10 }}
          />

          <View style={styles.timerRow}>
            {secondsLeft > 0 ? (
              <Text style={styles.timerText}>Resend code in {secondsLeft}s</Text>
            ) : (
              <Text style={styles.resendLink} onPress={() => setSecondsLeft(60)}>
                Resend SMS Code
              </Text>
            )}
          </View>
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
  card: {
    backgroundColor: '#131B2E',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 20,
    lineHeight: 20,
  },
  phoneHighlight: {
    color: '#818CF8',
    fontWeight: '600',
  },
  otpInput: {
    marginVertical: 10,
  },
  timerRow: {
    marginTop: 20,
    alignItems: 'center',
  },
  timerText: {
    color: '#64748B',
    fontSize: 13,
  },
  resendLink: {
    color: '#818CF8',
    fontWeight: '700',
    fontSize: 13,
  }
});
