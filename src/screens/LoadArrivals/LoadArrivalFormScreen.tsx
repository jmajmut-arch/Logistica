import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, HelperText, Menu, TextInput } from 'react-native-paper';

import { siteRepository } from '@/data/repositories/siteRepository';
import type { Site } from '@/domain/entities/Site';
import { loadArrivalService } from '@/domain/services/loadArrivalService';
import { useSessionStore } from '@/store/sessionStore';
import { SITE_TYPE_LABELS } from '@/utils/siteDisplay';
import { blockMinutesOf, TIME_BLOCKS } from '@/utils/timeBlocks';

import type { LoadArrivalsStackParamList } from './LoadArrivalsStack';

type Navigation = NativeStackNavigationProp<LoadArrivalsStackParamList, 'LoadArrivalForm'>;

export function LoadArrivalFormScreen() {
  const navigation = useNavigation<Navigation>();
  const currentUser = useSessionStore((state) => state.currentUser);

  const [sites, setSites] = useState<Site[] | null>(null);
  const [siteId, setSiteId] = useState(0);
  const [siteMenuVisible, setSiteMenuVisible] = useState(false);
  const [blockMinutes, setBlockMinutes] = useState(() => blockMinutesOf(Date.now()));
  const [blockMenuVisible, setBlockMenuVisible] = useState(false);
  const [siteError, setSiteError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    siteRepository.findAll().then(setSites);
  }, []);

  const onSubmit = async () => {
    if (!currentUser) {
      return;
    }
    if (siteId === 0) {
      setSiteError(true);
      return;
    }
    setSiteError(false);

    setSubmitting(true);
    try {
      await loadArrivalService.register({ siteId, blockMinutes, registeredBy: currentUser.id });
      navigation.goBack();
    } finally {
      setSubmitting(false);
    }
  };

  if (sites === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const selectedSite = sites.find((site) => site.id === siteId);
  const selectedBlock = TIME_BLOCKS.find((block) => block.minutes === blockMinutes);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.field}>
        <Menu
          visible={siteMenuVisible}
          onDismiss={() => setSiteMenuVisible(false)}
          anchor={
            <Pressable onPress={() => setSiteMenuVisible(true)}>
              <TextInput
                label="Área (patio / bodega)"
                value={selectedSite ? `${selectedSite.name} (${SITE_TYPE_LABELS[selectedSite.type]})` : ''}
                editable={false}
                mode="outlined"
                right={<TextInput.Icon icon="menu-down" />}
                pointerEvents="none"
              />
            </Pressable>
          }
        >
          {sites.length === 0 && <Menu.Item title="No hay sitios registrados" disabled />}
          {sites.map((site) => (
            <Menu.Item
              key={site.id}
              title={`${site.name} (${SITE_TYPE_LABELS[site.type]})`}
              onPress={() => {
                setSiteId(site.id);
                setSiteError(false);
                setSiteMenuVisible(false);
              }}
            />
          ))}
        </Menu>
        {siteError && <HelperText type="error">Selecciona un área</HelperText>}
      </View>

      <TextInput
        label="Día"
        value={format(new Date(), 'dd-MM-yyyy')}
        editable={false}
        mode="outlined"
        style={styles.field}
      />

      <View style={styles.field}>
        <Menu
          visible={blockMenuVisible}
          onDismiss={() => setBlockMenuVisible(false)}
          anchor={
            <Pressable onPress={() => setBlockMenuVisible(true)}>
              <TextInput
                label="Hora de llegada"
                value={selectedBlock?.label ?? ''}
                editable={false}
                mode="outlined"
                right={<TextInput.Icon icon="menu-down" />}
                pointerEvents="none"
              />
            </Pressable>
          }
        >
          <ScrollView style={styles.blockMenuScroll}>
            {TIME_BLOCKS.map((block) => (
              <Menu.Item
                key={block.minutes}
                title={block.label}
                onPress={() => {
                  setBlockMinutes(block.minutes);
                  setBlockMenuVisible(false);
                }}
              />
            ))}
          </ScrollView>
        </Menu>
      </View>

      <Button mode="contained" onPress={onSubmit} loading={submitting} disabled={submitting}>
        Registrar llegada
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
  blockMenuScroll: {
    maxHeight: 320,
  },
});
