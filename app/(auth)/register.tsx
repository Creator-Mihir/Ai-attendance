import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { AppHeader, CustomInput } from '../../src/components/ui';
import { PrimaryButton, SecondaryButton } from '../../src/components/buttons';
import { AlertBanner } from '../../src/components/feedback';
import { useAuthStore } from '../../src/store/auth.store';

export default function RegisterScreen() {
  const router = useRouter();
  const { register, isLoading, error } = useAuthStore();

  const [fullName, setFullName] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [department, setDepartment] = useState('Department of Computer Science');
  const [designation, setDesignation] = useState('Assistant Professor');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const handleRegister = async () => {
    setLocalError('');

    if (!fullName.trim()) {
      setLocalError('Please enter your full name & academic title.');
      return;
    }
    if (!employeeCode.trim()) {
      setLocalError('Please enter your unique Employee Code (e.g. TCH-2045).');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setLocalError('Please enter a valid institutional email address.');
      return;
    }
    if (!password) {
      setLocalError('Please choose a secure account password.');
      return;
    }
    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match. Please re-enter.');
      return;
    }

    const success = await register({
      fullName: fullName.trim(),
      employeeCode: employeeCode.trim().toUpperCase(),
      email: email.trim().toLowerCase(),
      phoneNumber: phoneNumber.trim(),
      department: department.trim(),
      designation: designation.trim(),
      password,
      schoolBranchId: 'branch-main-01',
      schoolBranchName: 'Metropolitan Science Academy - Main Campus',
    });

    if (success) {
      // Direct newly registered faculty to biometric facial enrollment
      router.push('/(onboarding)/face-registration');
    }
  };

  return (
    <View style={styles.screen}>
      <AppHeader
        title="Faculty Registration"
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/(auth)/welcome'))}
      />

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.heroBox}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>🎓</Text>
          </View>
          <Text style={styles.heroTitle}>Create Faculty Profile</Text>
          <Text style={styles.heroSubtitle}>
            Register your institution credentials to enroll your biometric profile into the secure campus database.
          </Text>
        </View>

        {(error || localError) ? (
          <AlertBanner
            title="Registration Notice"
            message={localError || error || ''}
            type="error"
          />
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardSectionHeader}>Identity & Credentials</Text>

          <CustomInput
            label="Full Name & Title *"
            value={fullName}
            onChangeText={setFullName}
            placeholder="e.g. Dr. Arthur Pendelton"
          />

          <CustomInput
            label="Employee ID / Faculty Code *"
            value={employeeCode}
            onChangeText={setEmployeeCode}
            placeholder="e.g. TCH-2090"
            autoCapitalize="characters"
          />

          <CustomInput
            label="Institutional Email *"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            placeholder="arthur.pendelton@academy.edu"
            autoCapitalize="none"
          />

          <CustomInput
            label="Phone Number"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
            placeholder="+1 (555) 012-3456"
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardSectionHeader}>Department & Role</Text>

          <CustomInput
            label="Academic Department"
            value={department}
            onChangeText={setDepartment}
            placeholder="e.g. Department of Physics"
          />

          <CustomInput
            label="Designation / Role"
            value={designation}
            onChangeText={setDesignation}
            placeholder="e.g. Associate Professor"
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardSectionHeader}>Account Security</Text>

          <CustomInput
            label="Password (min 6 characters) *"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Choose a password"
          />

          <CustomInput
            label="Confirm Password *"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            placeholder="Re-enter password"
          />
        </View>

        <View style={styles.actions}>
          <PrimaryButton
            title="Register & Enroll Biometrics"
            onPress={handleRegister}
            loading={isLoading}
            style={{ marginBottom: 14 }}
          />

          <SecondaryButton
            title="Already have an account? Sign In"
            onPress={() => router.push('/(auth)/login')}
          />
        </View>

        <View style={styles.securityNotice}>
          <Text style={styles.securityTitle}>🔒 Database Profile Security</Text>
          <Text style={styles.securityDesc}>
            Passwords are cryptographically salted & hashed with PBKDF2-SHA512. Live biometric neural embeddings will be bound to this verified record upon completion.
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
    paddingBottom: 40,
  },
  heroBox: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1E1B4B',
    borderWidth: 1.5,
    borderColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  iconText: {
    fontSize: 28,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 6,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  card: {
    backgroundColor: '#131B2E',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 16,
  },
  cardSectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#818CF8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  actions: {
    marginTop: 8,
    marginBottom: 20,
  },
  securityNotice: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  securityTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38BDF8',
    marginBottom: 4,
  },
  securityDesc: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
  },
});
