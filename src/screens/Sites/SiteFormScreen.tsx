import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { Button, HelperText, SegmentedButtons, Text, TextInput } from 'react-native-paper';

import { siteRepository } from '@/data/repositories/siteRepository';
import type { SiteType } from '@/types/enums';
import { SITE_TYPE_LABELS } from '@/utils/siteDisplay';

import type { SitesStackParamList } from './SitesStack';

type Navigation = NativeStackNavigationProp<SitesStackParamList, 'SiteForm'>;

const SITE_TYPE_OPTIONS: { value: SiteType; label: string }[] = [
  { value: 'bodega', label: SITE_TYPE_LABELS.bodega },
  { value: 'patio', label: SITE_TYPE_LABELS.patio },
];

export function SiteFormScreen() {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<RouteProp<SitesStackParamList, 'SiteForm'>>();
  const siteId = route.params?.siteId;

  const [name, setName] = useState('');
  const [type, setType] = useState<SiteType>('bodega');
  const [nameError, setNameError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(siteId !== undefined);

  useEffect(() => {
    if (siteId === undefined) {
      return;
    }
    siteRepository.findById(siteId).then((site) => {
      if (site) {
        setName(site.name);
        setType(site.type);
      }
      setLoading(false);
    });
  }, [siteId]);

  const onSubmit = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError(true);
      return;
    }
    setNameError(false);

    setSubmitting(true);
    try {
      if (siteId !== undefined) {
        await siteRepository.update(siteId, { name: trimmedName, type });
      } else {
        await siteRepository.create({ name: trimmedName, type });
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
        placeholder="Bodega Central"
        style={styles.field}
      />
      {nameError && <HelperText type="error">Ingresa un nombre</HelperText>}

      <Text variant="bodyMedium" style={styles.label}>
        Tipo
      </Text>
      <SegmentedButtons
        value={type}
        onValueChange={(value) => setType(value as SiteType)}
        buttons={SITE_TYPE_OPTIONS}
        style={styles.field}
      />

      <Button mode="contained" onPress={onSubmit} loading={submitting} disabled={submitting}>
        {siteId !== undefined ? 'Guardar cambios' : 'Guardar sitio'}
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
