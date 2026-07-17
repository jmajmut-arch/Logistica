import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as DocumentPicker from 'expo-document-picker';
import { useEffect, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Alert as RNAlert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  Divider,
  HelperText,
  IconButton,
  Menu,
  Text,
  TextInput,
} from 'react-native-paper';
import { z } from 'zod';

import { RoleGate } from '@/components/RoleGate';
import { substanceRepository } from '@/data/repositories/substanceRepository';
import { zoneRepository } from '@/data/repositories/zoneRepository';
import type { Zone } from '@/domain/entities/Zone';
import { substanceService } from '@/domain/services/substanceService';
import { useSessionStore } from '@/store/sessionStore';
import { HAZARD_CLASSES } from '@/types/enums';
import { HAZARD_CLASS_LABELS } from '@/utils/hazardClassLabels';
import { copySdsToAppStorage } from '@/utils/sdsStorage';

import type { SubstancesStackParamList } from './SubstancesStack';

type Navigation = NativeStackNavigationProp<SubstancesStackParamList, 'SubstanceForm'>;
type FormRoute = RouteProp<SubstancesStackParamList, 'SubstanceForm'>;

const substanceFormSchema = z.object({
  name: z.string().trim().min(1, 'Ingresa un nombre'),
  hazardClass: z.enum(HAZARD_CLASSES),
  quantity: z
    .string()
    .refine((value) => value.trim() !== '' && !Number.isNaN(Number(value)) && Number(value) > 0, {
      message: 'Ingresa una cantidad mayor a 0',
    }),
  unit: z.string().trim().min(1, 'Ingresa una unidad (ej. kg, l)'),
  zoneId: z.number().int().positive('Selecciona una zona'),
  expirationDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Usa el formato AAAA-MM-DD (ej. 2026-12-31)'),
  sdsUri: z.string().nullable(),
});

type SubstanceFormValues = z.infer<typeof substanceFormSchema>;

const DEFAULT_VALUES: SubstanceFormValues = {
  name: '',
  hazardClass: HAZARD_CLASSES[0],
  quantity: '',
  unit: '',
  zoneId: 0,
  expirationDate: '',
  sdsUri: null,
};

export function SubstanceFormScreen() {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<FormRoute>();
  const substanceId = route.params?.substanceId;
  const currentUser = useSessionStore((state) => state.currentUser);

  const [zones, setZones] = useState<Zone[] | null>(null);
  const [loadingSubstance, setLoadingSubstance] = useState(substanceId !== undefined);
  const [hazardMenuVisible, setHazardMenuVisible] = useState(false);
  const [zoneMenuVisible, setZoneMenuVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [originalCreatedBy, setOriginalCreatedBy] = useState<number | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<SubstanceFormValues>({
    resolver: zodResolver(substanceFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    zoneRepository.findAll().then(setZones);
  }, []);

  useEffect(() => {
    if (substanceId === undefined) {
      return;
    }
    substanceRepository.findById(substanceId).then((substance) => {
      if (!substance) {
        return;
      }
      setOriginalCreatedBy(substance.createdBy);
      reset({
        name: substance.name,
        hazardClass: substance.hazardClass,
        quantity: String(substance.quantity),
        unit: substance.unit,
        zoneId: substance.zoneId,
        expirationDate: substance.expirationDate,
        sdsUri: substance.sdsUri,
      });
      setLoadingSubstance(false);
    });
  }, [substanceId, reset]);

  const sdsUri = useWatch({ control, name: 'sdsUri' });

  const pickSds = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'] });
    if (result.canceled) {
      return;
    }
    const asset = result.assets[0];
    const storedUri = await copySdsToAppStorage(asset.uri, asset.name);
    setValue('sdsUri', storedUri, { shouldDirty: true });
  };

  const removeSds = () => setValue('sdsUri', null, { shouldDirty: true });

  const onSubmit = async (values: SubstanceFormValues) => {
    if (!currentUser) {
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: values.name,
        hazardClass: values.hazardClass,
        quantity: Number(values.quantity),
        unit: values.unit,
        zoneId: values.zoneId,
        expirationDate: values.expirationDate,
        sdsUri: values.sdsUri,
      };
      if (substanceId === undefined) {
        await substanceService.create({ ...payload, createdBy: currentUser.id });
      } else {
        await substanceService.update(substanceId, {
          ...payload,
          createdBy: originalCreatedBy ?? currentUser.id,
        });
      }
      navigation.goBack();
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = () => {
    if (substanceId === undefined) {
      return;
    }
    RNAlert.alert(
      'Eliminar sustancia',
      '¿Seguro que quieres eliminarla? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await substanceService.delete(substanceId);
            navigation.goBack();
          },
        },
      ],
    );
  };

  if (zones === null || loadingSubstance) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Controller
        control={control}
        name="name"
        render={({ field }) => (
          <View style={styles.field}>
            <TextInput
              label="Nombre"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              mode="outlined"
            />
            {errors.name && <HelperText type="error">{errors.name.message}</HelperText>}
          </View>
        )}
      />

      <Controller
        control={control}
        name="hazardClass"
        render={({ field }) => (
          <View style={styles.field}>
            <Menu
              visible={hazardMenuVisible}
              onDismiss={() => setHazardMenuVisible(false)}
              anchor={
                <Pressable onPress={() => setHazardMenuVisible(true)}>
                  <TextInput
                    label="Clase de peligrosidad"
                    value={HAZARD_CLASS_LABELS[field.value]}
                    editable={false}
                    mode="outlined"
                    right={<TextInput.Icon icon="menu-down" />}
                    pointerEvents="none"
                  />
                </Pressable>
              }
            >
              {HAZARD_CLASSES.map((hazardClass) => (
                <Menu.Item
                  key={hazardClass}
                  title={HAZARD_CLASS_LABELS[hazardClass]}
                  onPress={() => {
                    field.onChange(hazardClass);
                    setHazardMenuVisible(false);
                  }}
                />
              ))}
            </Menu>
          </View>
        )}
      />

      <View style={styles.row}>
        <Controller
          control={control}
          name="quantity"
          render={({ field }) => (
            <View style={[styles.field, styles.flex1]}>
              <TextInput
                label="Cantidad"
                value={field.value}
                onChangeText={(text) => field.onChange(text.replace(',', '.'))}
                onBlur={field.onBlur}
                keyboardType="decimal-pad"
                mode="outlined"
              />
              {errors.quantity && <HelperText type="error">{errors.quantity.message}</HelperText>}
            </View>
          )}
        />
        <Controller
          control={control}
          name="unit"
          render={({ field }) => (
            <View style={[styles.field, styles.flex1]}>
              <TextInput
                label="Unidad (kg, l...)"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                mode="outlined"
              />
              {errors.unit && <HelperText type="error">{errors.unit.message}</HelperText>}
            </View>
          )}
        />
      </View>

      <Controller
        control={control}
        name="zoneId"
        render={({ field }) => {
          const selectedZone = zones.find((zone) => zone.id === field.value);
          return (
            <View style={styles.field}>
              <Menu
                visible={zoneMenuVisible}
                onDismiss={() => setZoneMenuVisible(false)}
                anchor={
                  <Pressable onPress={() => setZoneMenuVisible(true)}>
                    <TextInput
                      label="Zona / rack"
                      value={selectedZone ? `${selectedZone.name} (${selectedZone.code})` : ''}
                      editable={false}
                      mode="outlined"
                      right={<TextInput.Icon icon="menu-down" />}
                      pointerEvents="none"
                    />
                  </Pressable>
                }
              >
                {zones.map((zone) => (
                  <Menu.Item
                    key={zone.id}
                    title={`${zone.name} (${zone.code})`}
                    onPress={() => {
                      field.onChange(zone.id);
                      setZoneMenuVisible(false);
                    }}
                  />
                ))}
              </Menu>
              {errors.zoneId && <HelperText type="error">{errors.zoneId.message}</HelperText>}
            </View>
          );
        }}
      />

      <Controller
        control={control}
        name="expirationDate"
        render={({ field }) => (
          <View style={styles.field}>
            <TextInput
              label="Vencimiento (AAAA-MM-DD)"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              placeholder="2026-12-31"
              mode="outlined"
            />
            {errors.expirationDate && (
              <HelperText type="error">{errors.expirationDate.message}</HelperText>
            )}
          </View>
        )}
      />

      <View style={styles.field}>
        <Text variant="labelLarge" style={styles.sdsLabel}>
          Ficha de seguridad (SDS)
        </Text>
        {sdsUri ? (
          <View style={styles.sdsRow}>
            <Text style={styles.sdsName} numberOfLines={1}>
              {sdsUri.split('/').pop()}
            </Text>
            <IconButton icon="close" onPress={removeSds} />
          </View>
        ) : (
          <Button mode="outlined" icon="paperclip" onPress={pickSds}>
            Adjuntar archivo
          </Button>
        )}
      </View>

      <Divider style={styles.divider} />

      <Button
        mode="contained"
        onPress={handleSubmit(onSubmit)}
        loading={submitting}
        disabled={submitting}
      >
        {substanceId === undefined ? 'Registrar sustancia' : 'Guardar cambios'}
      </Button>

      {substanceId !== undefined && (
        <RoleGate permission="manageSubstances">
          <Button
            mode="text"
            textColor="#B3261E"
            onPress={confirmDelete}
            style={styles.deleteButton}
          >
            Eliminar sustancia
          </Button>
        </RoleGate>
      )}
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
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  flex1: {
    flex: 1,
  },
  sdsLabel: {
    marginBottom: 8,
  },
  sdsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 4,
    paddingLeft: 12,
  },
  sdsName: {
    flex: 1,
  },
  divider: {
    marginVertical: 16,
  },
  deleteButton: {
    marginTop: 8,
  },
});
