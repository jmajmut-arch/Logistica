import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, HelperText, Menu, SegmentedButtons, Text, TextInput } from 'react-native-paper';
import { DatePickerModal } from 'react-native-paper-dates';

import { carrierRepository } from '@/data/repositories/carrierRepository';
import { siteRepository } from '@/data/repositories/siteRepository';
import { transportPlanRepository } from '@/data/repositories/transportPlanRepository';
import type { Carrier } from '@/domain/entities/Carrier';
import type { Site } from '@/domain/entities/Site';
import { useSessionStore } from '@/store/sessionStore';
import type { OperationType } from '@/types/enums';
import { getPlanManagerScope, matchesOperatorScope } from '@/utils/operatorScope';
import { SITE_TYPE_LABELS } from '@/utils/siteDisplay';
import { blockMinutesOf, combineDayAndBlock, getWeekNumber, startOfDay, TIME_BLOCKS } from '@/utils/timeBlocks';

import type { TransportPlanStackParamList } from './TransportPlanStack';

type Navigation = NativeStackNavigationProp<TransportPlanStackParamList, 'TransportPlanForm'>;

const OPERATION_TYPE_OPTIONS: { value: OperationType; label: string }[] = [
  { value: 'carga_subida', label: 'Subida' },
  { value: 'retiro_carga', label: 'Retiro' },
  { value: 'home_delivery', label: 'Home delivery' },
];

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parseScheduledAt(date: string, blockMinutes: number | null): number | null {
  if (!DATE_PATTERN.test(date) || blockMinutes === null) {
    return null;
  }
  const [year, month, day] = date.split('-').map(Number);
  const dayStart = startOfDay(new Date(year, month - 1, day).getTime());
  return combineDayAndBlock(dayStart, blockMinutes);
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function dateStringToDate(value: string): Date | undefined {
  if (!DATE_PATTERN.test(value)) {
    return undefined;
  }
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function dateToDateString(value: Date): string {
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

export function TransportPlanFormScreen() {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<RouteProp<TransportPlanStackParamList, 'TransportPlanForm'>>();
  const planItemId = route.params?.planItemId;
  const currentUser = useSessionStore((state) => state.currentUser);
  const planManagerScope = getPlanManagerScope(currentUser?.role);
  const allowedOperationTypes = OPERATION_TYPE_OPTIONS.filter((option) =>
    matchesOperatorScope(option.value, planManagerScope),
  );

  const [sites, setSites] = useState<Site[] | null>(null);
  const [carriers, setCarriers] = useState<Carrier[] | null>(null);
  const [loading, setLoading] = useState(planItemId !== undefined);
  const [operationType, setOperationType] = useState<OperationType>(
    allowedOperationTypes[0]?.value ?? 'carga_subida',
  );
  const [siteId, setSiteId] = useState(0);
  const [siteMenuVisible, setSiteMenuVisible] = useState(false);
  const [date, setDate] = useState('');
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [blockMinutes, setBlockMinutes] = useState<number | null>(null);
  const [blockMenuVisible, setBlockMenuVisible] = useState(false);
  const [carrierId, setCarrierId] = useState(0);
  const [carrierMenuVisible, setCarrierMenuVisible] = useState(false);
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [siteError, setSiteError] = useState(false);
  const [dateError, setDateError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [originalCreatedBy, setOriginalCreatedBy] = useState<number | null>(null);

  useEffect(() => {
    siteRepository.findAll().then(setSites);
    carrierRepository.findAll().then(setCarriers);
  }, []);

  useEffect(() => {
    if (planItemId === undefined) {
      return;
    }
    transportPlanRepository.findById(planItemId).then((item) => {
      if (item) {
        setOperationType(item.operationType);
        setSiteId(item.siteId);
        const scheduled = new Date(item.scheduledAt);
        setDate(
          `${scheduled.getFullYear()}-${pad(scheduled.getMonth() + 1)}-${pad(scheduled.getDate())}`,
        );
        setBlockMinutes(blockMinutesOf(item.scheduledAt));
        setCarrierId(item.carrierId ?? 0);
        setReference(item.reference ?? '');
        setNotes(item.notes ?? '');
        setOriginalCreatedBy(item.createdBy);
      }
      setLoading(false);
    });
  }, [planItemId]);

  const scheduledAt = useMemo(
    () => parseScheduledAt(date.trim(), blockMinutes),
    [date, blockMinutes],
  );
  const weekNumber = scheduledAt !== null ? getWeekNumber(scheduledAt) : null;

  const onSubmit = async () => {
    if (!currentUser) {
      return;
    }
    if (siteId === 0) {
      setSiteError(true);
      return;
    }
    setSiteError(false);

    if (scheduledAt === null) {
      setDateError(true);
      return;
    }
    setDateError(false);

    setSubmitting(true);
    try {
      if (planItemId !== undefined) {
        await transportPlanRepository.update(planItemId, {
          operationType,
          siteId,
          scheduledAt,
          carrierId: carrierId || null,
          reference: reference.trim() || null,
          notes: notes.trim() || null,
          createdBy: originalCreatedBy ?? currentUser.id,
        });
      } else {
        await transportPlanRepository.create({
          operationType,
          siteId,
          scheduledAt,
          carrierId: carrierId || null,
          reference: reference.trim() || null,
          notes: notes.trim() || null,
          createdBy: currentUser.id,
        });
      }
      navigation.goBack();
    } finally {
      setSubmitting(false);
    }
  };

  if (sites === null || carriers === null || loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const selectedSite = sites.find((site) => site.id === siteId);
  const selectedCarrier = carriers.find((carrier) => carrier.id === carrierId);
  const selectedDate = dateStringToDate(date);
  const selectedBlock = TIME_BLOCKS.find((block) => block.minutes === blockMinutes);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text variant="bodyMedium" style={styles.label}>
        Tipo de operación
      </Text>
      <SegmentedButtons
        value={operationType}
        onValueChange={(value) => setOperationType(value as OperationType)}
        buttons={allowedOperationTypes}
        style={styles.field}
      />

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

      <View style={styles.field}>
        <Pressable onPress={() => setDatePickerVisible(true)}>
          <TextInput
            label="Fecha"
            value={selectedDate ? format(selectedDate, 'dd-MM-yyyy') : ''}
            editable={false}
            mode="outlined"
            right={<TextInput.Icon icon="calendar" />}
            pointerEvents="none"
          />
        </Pressable>
      </View>
      <DatePickerModal
        locale="es"
        mode="single"
        visible={datePickerVisible}
        date={selectedDate}
        onDismiss={() => setDatePickerVisible(false)}
        onConfirm={({ date: picked }) => {
          setDatePickerVisible(false);
          if (picked) {
            setDate(dateToDateString(picked));
          }
        }}
      />

      <View style={styles.field}>
        <Menu
          visible={blockMenuVisible}
          onDismiss={() => setBlockMenuVisible(false)}
          anchor={
            <Pressable onPress={() => setBlockMenuVisible(true)}>
              <TextInput
                label="Hora"
                value={selectedBlock?.label ?? ''}
                editable={false}
                mode="outlined"
                right={<TextInput.Icon icon="menu-down" />}
                pointerEvents="none"
              />
            </Pressable>
          }
        >
          <ScrollView style={styles.timeMenuScroll}>
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
      {dateError ? (
        <HelperText type="error">Selecciona la fecha y revisa la hora ingresada</HelperText>
      ) : (
        weekNumber !== null && <HelperText type="info">Semana {weekNumber}</HelperText>
      )}

      <View style={styles.field}>
        <Menu
          visible={carrierMenuVisible}
          onDismiss={() => setCarrierMenuVisible(false)}
          anchor={
            <Pressable onPress={() => setCarrierMenuVisible(true)}>
              <TextInput
                label="Empresa de transporte (opcional)"
                value={selectedCarrier?.name ?? ''}
                editable={false}
                mode="outlined"
                right={<TextInput.Icon icon="menu-down" />}
                pointerEvents="none"
              />
            </Pressable>
          }
        >
          <Menu.Item
            title="Sin empresa"
            onPress={() => {
              setCarrierId(0);
              setCarrierMenuVisible(false);
            }}
          />
          {carriers.length === 0 && <Menu.Item title="No hay empresas registradas" disabled />}
          {carriers.map((carrier) => (
            <Menu.Item
              key={carrier.id}
              title={carrier.name}
              onPress={() => {
                setCarrierId(carrier.id);
                setCarrierMenuVisible(false);
              }}
            />
          ))}
        </Menu>
      </View>
      <TextInput
        label="Referencia — guía, pedido, etc. (opcional)"
        value={reference}
        onChangeText={setReference}
        mode="outlined"
        style={styles.field}
      />
      <TextInput
        label="Notas (opcional)"
        value={notes}
        onChangeText={setNotes}
        mode="outlined"
        multiline
        numberOfLines={3}
        style={styles.field}
      />

      <Button mode="contained" onPress={onSubmit} loading={submitting} disabled={submitting}>
        {planItemId !== undefined ? 'Guardar cambios' : 'Guardar item del plan'}
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
  timeMenuScroll: {
    maxHeight: 320,
  },
});
