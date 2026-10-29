import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { AppHeader, CustomInput, Avatar } from '../../src/components/ui';
import { PrimaryButton } from '../../src/components/buttons';
import { useAuthStore } from '../../src/store/auth.store';

export default function TeacherProfileScreen() {
  const router = useRouter();
  const { teacher, updateTeacher } = useAuthStore();

  const [fullName, setFullName] = useState(teacher?.fullName || 'Dr. Sarah Mitchell');
  const [department, setDepartment] = useState(teacher?.department || 'Department of Computer Science');
  const [designation, setDesignation] = useState(teacher?.designation || 'Senior Faculty & Dept Head');
  const [employeeCode, setEmployeeCode] = useState(teacher?.employeeCode || 'TCH-1042');

  const handleNext = async () => {
    if (teacher) {
      await updateTeacher({
        ...teacher,
        fullName,
        department,
        designation,
        employeeCode,
      });
    }
    router.push('/(onboarding)/face-registration');
  };

  return (
    <View style={styles.screen}>
      <AppHeader
        title="Faculty Profile Setup"
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/(auth)/welcome'))}
      />

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.avatarSection}>
          <Avatar name={fullName} size={72} />
          <Text style={styles.nameHeader}>{fullName}</Text>
          <Text style={styles.codeBadge}>{employeeCode}</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Institutional Details</Text>
          <CustomInput
            label="Full Name & Title"
            value={fullName}
            onChangeText={setFullName}
            placeholder="e.g. Dr. Jane Doe"
          />
          <CustomInput
            label="Employee ID"
            value={employeeCode}
            onChangeText={setEmployeeCode}
            placeholder="e.g. TCH-1042"
          />
          <CustomInput
            label="Academic Department"
            value={department}
            onChangeText={setDepartment}
            placeholder="e.g. Computer Science"
          />
          <CustomInput
            label="Designation / Role"
            value={designation}
            onChangeText={setDesignation}
            placeholder="e.g. Assistant Professor"
          />
        </View>

        <View style={styles.actionArea}>
          <PrimaryButton
            title="Continue to Face Registration"
            onPress={handleNext}
          />
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
  avatarSection: {
    alignItems: 'center',
    marginVertical: 12,
  },
  nameHeader: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
    marginTop: 10,
  },
  codeBadge: {
    fontSize: 12,
    color: '#818CF8',
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  formCard: {
    backgroundColor: '#131B2E',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginVertical: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 16,
  },
  actionArea: {
    marginTop: 12,
    marginBottom: 20,
  }
});
