import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { Button, HelperText, SegmentedButtons, Text, TextInput } from 'react-native-paper';

import { userRepository } from '@/data/repositories/userRepository';
import type { Role } from '@/types/enums';
import { ROLE_LABELS } from '@/utils/userDisplay';

import type { UsersStackParamList } from './UsersStack';

type Navigation = NativeStackNavigationProp<UsersStackParamList, 'UserForm'>;

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'operator', label: ROLE_LABELS.operator },
  { value: 'supervisor', label: ROLE_LABELS.supervisor },
  { value: 'admin', label: ROLE_LABELS.admin },
];

export function UserFormScreen() {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<RouteProp<UsersStackParamList, 'UserForm'>>();
  const userId = route.params?.userId;

  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('operator');
  const [email, setEmail] = useState('');
  const [nameError, setNameError] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(userId !== undefined);

  useEffect(() => {
    if (userId === undefined) {
      return;
    }
    userRepository.findById(userId).then((user) => {
      if (user) {
        setName(user.name);
        setRole(user.role);
        setEmail(user.email ?? '');
      }
      setLoading(false);
    });
  }, [userId]);

  const onSubmit = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    let hasError = false;
    if (!trimmedName) {
      setNameError(true);
      hasError = true;
    } else {
      setNameError(false);
    }
    if (trimmedEmail && !/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      setEmailError(true);
      hasError = true;
    } else {
      setEmailError(false);
    }
    if (hasError) {
      return;
    }

    setSubmitting(true);
    try {
      const payload = { name: trimmedName, role, email: trimmedEmail || null };
      if (userId !== undefined) {
        await userRepository.update(userId, payload);
      } else {
        await userRepository.create(payload);
      }
      navigation.goBack();
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TextInput
        label="Nombre"
        value={name}
        onChangeText={setName}
        mode="outlined"
        placeholder="María Pérez"
        style={styles.field}
      />
      {nameError && <HelperText type="error">Ingresa un nombre</HelperText>}

      <TextInput
        label="Email (opcional)"
        value={email}
        onChangeText={setEmail}
        mode="outlined"
        placeholder="maria.perez@empresa.cl"
        keyboardType="email-address"
        autoCapitalize="none"
        style={styles.field}
      />
      {emailError ? (
        <HelperText type="error">El email no tiene un formato válido</HelperText>
      ) : (
        <HelperText type="info">Se usa para poder notificarle por correo (ej. incidencias)</HelperText>
      )}

      <Text variant="bodyMedium" style={styles.label}>
        Rol
      </Text>
      <SegmentedButtons
        value={role}
        onValueChange={(value) => setRole(value as Role)}
        buttons={ROLE_OPTIONS}
        style={styles.field}
      />

      <Button mode="contained" onPress={onSubmit} loading={submitting} disabled={submitting}>
        {userId !== undefined ? 'Guardar cambios' : 'Guardar persona'}
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 4,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  field: {
    marginBottom: 12,
  },
  label: {
    marginBottom: 8,
  },
});
