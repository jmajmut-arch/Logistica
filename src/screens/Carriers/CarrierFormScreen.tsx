import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { Button, HelperText, TextInput } from 'react-native-paper';

import { carrierRepository } from '@/data/repositories/carrierRepository';

import type { CarriersStackParamList } from './CarriersStack';

type Navigation = NativeStackNavigationProp<CarriersStackParamList, 'CarrierForm'>;

export function CarrierFormScreen() {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<RouteProp<CarriersStackParamList, 'CarrierForm'>>();
  const carrierId = route.params?.carrierId;

  const [name, setName] = useState('');
  const [nameError, setNameError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(carrierId !== undefined);

  useEffect(() => {
    if (carrierId === undefined) {
      return;
    }
    carrierRepository.findById(carrierId).then((carrier) => {
      if (carrier) {
        setName(carrier.name);
      }
      setLoading(false);
    });
  }, [carrierId]);

  const onSubmit = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError(true);
      return;
    }
    setNameError(false);

    setSubmitting(true);
    try {
      if (carrierId !== undefined) {
        await carrierRepository.update(carrierId, { name: trimmedName });
      } else {
        await carrierRepository.create({ name: trimmedName });
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
        placeholder="Empresa Uno"
        style={styles.field}
      />
      {nameError && <HelperText type="error">Ingresa un nombre</HelperText>}

      <Button mode="contained" onPress={onSubmit} loading={submitting} disabled={submitting}>
        {carrierId !== undefined ? 'Guardar cambios' : 'Guardar empresa'}
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
});
