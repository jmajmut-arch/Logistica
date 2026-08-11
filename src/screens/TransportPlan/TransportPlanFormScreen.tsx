import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  Button,
  Chip,
  HelperText,
  IconButton,
  Menu,
  SegmentedButtons,
  Switch,
  Text,
  TextInput,
} from 'react-native-paper';
import { DatePickerModal } from 'react-native-paper-dates';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { carrierRepository } from '@/data/repositories/carrierRepository';
import { recurringPlanRuleRepository } from '@/data/repositories/recurringPlanRuleRepository';
import { siteRepository } from '@/data/repositories/siteRepository';
import { transportPlanRepository } from '@/data/repositories/transportPlanRepository';
import type { Carrier } from '@/domain/entities/Carrier';
import type { Site } from '@/domain/entities/Site';
import { ensureRecurringPlanOccurrences } from '@/domain/services/recurringPlanSync';
import { useSessionStore } from '@/store/sessionStore';
import type { OperationType } from '@/types/enums';
import { matchesOperatorScope } from '@/utils/operatorScope';
import { SITE_TYPE_LABELS } from '@/utils/siteDisplay';
import {
  blockMinutesOf,
  combineDayAndBlock,
  getWeekNumber,
  startOfDay,
  startOfWeek,
  TIME_BLOCKS,
} from '@/utils/timeBlocks';
import { HEAVY_CRANE_COLOR, HEAVY_CRANE_LABEL } from '@/utils/transportPlanDisplay';

import { usePlanScope } from './PlanScopeContext';
import type { TransportPlanStackParamList } from './TransportPlanStack';

type Navigation = NativeStackNavigationProp<TransportPlanStackParamList, 'TransportPlanForm'>;

const OPERATION_TYPE_OPTIONS: { value: OperationType; label: string }[] = [
  { value: 'carga_subida', label: 'Subida' },
  { value: 'retiro_carga', label: 'Retiro' },
  { value: 'home_delivery', label: 'Home delivery' },
];

const WEEKDAY_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: 'Lun' },
  { value: 1, label: 'Mar' },
  { value: 2, label: 'Mié' },
  { value: 3, label: 'Jue' },
  { value: 4, label: 'Vie' },
  { value: 5, label: 'Sáb' },
  { value: 6, label: 'Dom' },
];

const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
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
  const planManagerScope = usePlanScope();
  // Plan semanal ya no ofrece "Retiro" como opción al ingresar — sigue existiendo como
  // tipo válido para datos históricos, solo se deja de ofrecer para items nuevos.
  const allowedOperationTypes = OPERATION_TYPE_OPTIONS.filter(
    (option) => matchesOperatorScope(option.value, planManagerScope) && option.value !== 'retiro_carga',
  );
  // Plan semanal se re-ingresa cada 7 días — no encaja con una regla permanente que se
  // repite indefinidamente. Solo home delivery admite planificación permanente, y solo al
  // crearla (una ocurrencia ya generada se edita/elimina puntualmente, no la regla).
  const canBeRecurring = planManagerScope === 'home_delivery' && planItemId === undefined;

  const [sites, setSites] = useState<Site[] | null>(null);
  const [carriers, setCarriers] = useState<Carrier[] | null>(null);
  const [loading, setLoading] = useState(planItemId !== undefined);
  const [operationType, setOperationType] = useState<OperationType>(
    allowedOperationTypes[0]?.value ?? 'carga_subida',
  );
  const [siteId, setSiteId] = useState(0);
  const [siteMenuVisible, setSiteMenuVisible] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [selectedDays, setSelectedDays] = useState<Set<number>>(new Set());
  // Plan semanal se re-ingresa cada 7 días: al crear, en vez de una fecha puntual se elige
  // uno o varios días concretos de esta semana (nunca una regla que se repita indefinido).
  // El valor de cada día es la cantidad de camiones que llegan ese día (1 por defecto).
  const [selectedWeekDays, setSelectedWeekDays] = useState<Map<number, number>>(new Map());
  const [date, setDate] = useState('');
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  // En plan semanal (carga_subida/retiro_carga) por defecto viene marcado "sin horario";
  // en home delivery no, porque ahí lo habitual es planificar horarios concretos.
  const [hasNoSchedule, setHasNoSchedule] = useState(planItemId === undefined && planManagerScope !== 'home_delivery');
  const [selectedBlocks, setSelectedBlocks] = useState<Set<number>>(new Set());
  const [blockMenuVisible, setBlockMenuVisible] = useState(false);
  const [carrierId, setCarrierId] = useState(0);
  const [carrierMenuVisible, setCarrierMenuVisible] = useState(false);
  const [requiresHeavyCrane, setRequiresHeavyCrane] = useState(false);
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [siteError, setSiteError] = useState(false);
  const [dateError, setDateError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [originalCreatedBy, setOriginalCreatedBy] = useState<number | null>(null);
  const [originalRecurrenceRuleId, setOriginalRecurrenceRuleId] = useState<number | null>(null);
  const [originalCancelledByOperator, setOriginalCancelledByOperator] = useState(false);

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
        setHasNoSchedule(item.hasNoSchedule);
        setSelectedBlocks(new Set([blockMinutesOf(item.scheduledAt)]));
        setCarrierId(item.carrierId ?? 0);
        setRequiresHeavyCrane(item.requiresHeavyCrane);
        setReference(item.reference ?? '');
        setNotes(item.notes ?? '');
        setOriginalCreatedBy(item.createdBy);
        setOriginalRecurrenceRuleId(item.recurrenceRuleId);
        setOriginalCancelledByOperator(item.cancelledByOperator);
      }
      setLoading(false);
    });
  }, [planItemId]);

  // Solo tiene sentido "sin horario" para una fecha puntual: una regla permanente
  // necesita una hora fija para poder repetirse cada semana a esa misma hora.
  const isOneOff = !(isRecurring && canBeRecurring);
  // Solo al crear (no al editar una ocurrencia puntual) se permite elegir varios horarios
  // a la vez — por ejemplo, home delivery con 5+ horarios de retiro el mismo día.
  const isCreatingNew = planItemId === undefined;
  // Al crear en plan semanal se eligen días concretos de esta semana (hasta 7), no una
  // fecha puntual con el datepicker — al editar una ocurrencia existente sigue siendo una
  // sola fecha, igual que home delivery.
  const showWeekDayPicker = isCreatingNew && planManagerScope === 'plan_transporte';

  const weekDayOptions = useMemo(() => {
    const start = startOfWeek();
    return Array.from({ length: 7 }, (_, index) => {
      const day = start + index * DAY_MS;
      return { value: day, label: capitalize(format(new Date(day), 'EEE dd', { locale: es })) };
    });
  }, []);

  const sortedSelectedBlocks = useMemo(
    () => Array.from(selectedBlocks).sort((a, b) => a - b),
    [selectedBlocks],
  );
  const previewBlockMinutes = sortedSelectedBlocks[0] ?? null;
  const sortedSelectedDays = useMemo(() => Array.from(selectedDays).sort((a, b) => a - b), [selectedDays]);
  const sortedWeekDayEntries = useMemo(
    () => Array.from(selectedWeekDays.entries()).sort((a, b) => a[0] - b[0]),
    [selectedWeekDays],
  );

  // Días a los que se debe aplicar el guardado: en plan semanal, cada día elegido se repite
  // tantas veces como camiones se hayan indicado para ese día (un item por camión); en
  // cualquier otro caso es el único día de la fecha puntual (home delivery sin regla
  // permanente, o al editar una ocurrencia existente).
  const activeDayStarts = useMemo(() => {
    if (showWeekDayPicker) {
      const result: number[] = [];
      for (const [day, quantity] of sortedWeekDayEntries) {
        for (let i = 0; i < quantity; i += 1) {
          result.push(day);
        }
      }
      return result;
    }
    const parsed = dateStringToDate(date);
    return parsed ? [startOfDay(parsed.getTime())] : [];
  }, [showWeekDayPicker, sortedWeekDayEntries, date]);

  const scheduledAt = useMemo(() => {
    const dayStart = activeDayStarts[0] ?? null;
    if (dayStart === null) {
      return null;
    }
    if (isOneOff && hasNoSchedule) {
      return dayStart;
    }
    if (previewBlockMinutes === null) {
      return null;
    }
    return combineDayAndBlock(dayStart, previewBlockMinutes);
  }, [activeDayStarts, previewBlockMinutes, isOneOff, hasNoSchedule]);
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

    if (isRecurring && canBeRecurring) {
      if (sortedSelectedDays.length === 0 || sortedSelectedBlocks.length === 0) {
        setDateError(true);
        return;
      }
      setDateError(false);

      setSubmitting(true);
      try {
        // Una regla por cada combinación día × horario: varios días y/o varios horarios
        // seleccionados crean varias reglas permanentes independientes (ej. home delivery
        // con retiros lunes y jueves, a las 09:00 y a las 15:00 — 4 reglas en total).
        for (const day of sortedSelectedDays) {
          for (const block of sortedSelectedBlocks) {
            await recurringPlanRuleRepository.create({
              operationType,
              siteId,
              carrierId: carrierId || null,
              dayOfWeek: day,
              blockMinutes: block,
              requiresHeavyCrane,
              reference: reference.trim() || null,
              notes: notes.trim() || null,
              active: true,
              createdBy: currentUser.id,
            });
          }
        }
        await ensureRecurringPlanOccurrences();
        navigation.goBack();
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (activeDayStarts.length === 0) {
      setDateError(true);
      return;
    }
    const daysToSubmit = isCreatingNew ? activeDayStarts : activeDayStarts.slice(0, 1);

    if (isOneOff && hasNoSchedule) {
      setDateError(false);

      setSubmitting(true);
      try {
        for (const dayStart of daysToSubmit) {
          if (planItemId !== undefined) {
            await transportPlanRepository.update(planItemId, {
              operationType,
              siteId,
              scheduledAt: dayStart,
              hasNoSchedule: true,
              carrierId: carrierId || null,
              requiresHeavyCrane,
              reference: reference.trim() || null,
              notes: notes.trim() || null,
              recurrenceRuleId: originalRecurrenceRuleId,
              cancelled: false,
              cancelledByOperator: originalCancelledByOperator,
              createdBy: originalCreatedBy ?? currentUser.id,
            });
          } else {
            await transportPlanRepository.create({
              operationType,
              siteId,
              scheduledAt: dayStart,
              hasNoSchedule: true,
              carrierId: carrierId || null,
              requiresHeavyCrane,
              reference: reference.trim() || null,
              notes: notes.trim() || null,
              recurrenceRuleId: null,
              cancelled: false,
              cancelledByOperator: false,
              createdBy: currentUser.id,
            });
          }
        }
        navigation.goBack();
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Editar una ocurrencia puntual sigue siendo un solo día y un solo horario; al crear,
    // se puede elegir más de un día y/o más de un horario para dejar varios items del plan
    // en un solo envío (uno por cada combinación día × horario).
    const blocksToSubmit = isCreatingNew ? sortedSelectedBlocks : sortedSelectedBlocks.slice(0, 1);
    if (blocksToSubmit.length === 0) {
      setDateError(true);
      return;
    }
    setDateError(false);

    setSubmitting(true);
    try {
      for (const dayStart of daysToSubmit) {
        for (const block of blocksToSubmit) {
          const scheduledAtForBlock = combineDayAndBlock(dayStart, block);
          if (planItemId !== undefined) {
            await transportPlanRepository.update(planItemId, {
              operationType,
              siteId,
              scheduledAt: scheduledAtForBlock,
              hasNoSchedule: false,
              carrierId: carrierId || null,
              requiresHeavyCrane,
              reference: reference.trim() || null,
              notes: notes.trim() || null,
              recurrenceRuleId: originalRecurrenceRuleId,
              cancelled: false,
              cancelledByOperator: originalCancelledByOperator,
              createdBy: originalCreatedBy ?? currentUser.id,
            });
          } else {
            await transportPlanRepository.create({
              operationType,
              siteId,
              scheduledAt: scheduledAtForBlock,
              hasNoSchedule: false,
              carrierId: carrierId || null,
              requiresHeavyCrane,
              reference: reference.trim() || null,
              notes: notes.trim() || null,
              recurrenceRuleId: null,
              cancelled: false,
              cancelledByOperator: false,
              createdBy: currentUser.id,
            });
          }
        }
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
  const selectedBlock = TIME_BLOCKS.find((block) => block.minutes === sortedSelectedBlocks[0]);

  const noScheduleToggle = (
    <View style={[styles.field, styles.noScheduleRow]}>
      <View style={styles.noScheduleText}>
        <Text variant="bodyMedium">Sin horario</Text>
        <Text variant="bodySmall" style={styles.noScheduleHint}>
          Se planifica solo el día, sin una hora comprometida
        </Text>
      </View>
      <Switch value={hasNoSchedule} onValueChange={setHasNoSchedule} />
    </View>
  );

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

      {canBeRecurring && (
        <View style={[styles.field, styles.recurringRow]}>
          <View style={styles.recurringText}>
            <Text variant="bodyMedium">Planificación permanente</Text>
            <Text variant="bodySmall" style={styles.recurringHint}>
              Se repite todas las semanas en el mismo día y hora, generando ocurrencias para las
              próximas 12 semanas (~3 meses) desde hoy
            </Text>
          </View>
          <Switch
            value={isRecurring}
            onValueChange={(value) => {
              setIsRecurring(value);
              if (value) {
                setHasNoSchedule(false);
              }
            }}
          />
        </View>
      )}

      {isRecurring && canBeRecurring ? (
        <View style={styles.field}>
          <Text variant="bodyMedium" style={styles.label}>
            Días de la semana
          </Text>
          <SegmentedButtons
            multiSelect
            value={sortedSelectedDays.map(String)}
            onValueChange={(values) => setSelectedDays(new Set(values.map(Number)))}
            buttons={WEEKDAY_OPTIONS.map((option) => ({
              value: String(option.value),
              label: option.label,
            }))}
          />
          <HelperText type="info">Puedes elegir más de un día</HelperText>
        </View>
      ) : showWeekDayPicker ? (
        <>
          <View style={styles.field}>
            <Text variant="bodyMedium" style={styles.label}>
              Días de esta semana
            </Text>
            {weekDayOptions.map((option) => {
              const quantity = selectedWeekDays.get(option.value) ?? 0;
              return (
                <View key={option.value} style={styles.weekDayRow}>
                  <Text variant="bodyMedium" style={styles.weekDayLabel}>
                    {option.label}
                  </Text>
                  <View style={styles.truckStepper}>
                    <IconButton
                      icon="minus"
                      size={18}
                      disabled={quantity === 0}
                      onPress={() =>
                        setSelectedWeekDays((prev) => {
                          const next = new Map(prev);
                          const current = next.get(option.value) ?? 0;
                          if (current <= 1) {
                            next.delete(option.value);
                          } else {
                            next.set(option.value, current - 1);
                          }
                          return next;
                        })
                      }
                    />
                    <Text variant="bodyMedium" style={styles.truckCount}>
                      {quantity}
                    </Text>
                    <IconButton
                      icon="plus"
                      size={18}
                      onPress={() =>
                        setSelectedWeekDays((prev) => {
                          const next = new Map(prev);
                          next.set(option.value, (next.get(option.value) ?? 0) + 1);
                          return next;
                        })
                      }
                    />
                    <Text variant="bodySmall" style={styles.truckLabel}>
                      {quantity === 1 ? 'camión' : 'camiones'}
                    </Text>
                  </View>
                </View>
              );
            })}
            <HelperText type="info">
              Puedes elegir uno o varios días de esta semana e indicar cuántos camiones llegan cada día
            </HelperText>
          </View>
          {noScheduleToggle}
        </>
      ) : (
        <>
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

          {noScheduleToggle}
        </>
      )}

      {!(isOneOff && hasNoSchedule) && (
        <View style={styles.field}>
          <Menu
            visible={blockMenuVisible}
            onDismiss={() => setBlockMenuVisible(false)}
            anchor={
              <Pressable onPress={() => setBlockMenuVisible(true)}>
                <TextInput
                  label={isCreatingNew ? 'Horarios' : 'Hora'}
                  value={
                    isCreatingNew
                      ? sortedSelectedBlocks.length <= 1
                        ? (selectedBlock?.label ?? '')
                        : `${sortedSelectedBlocks.length} horarios seleccionados`
                      : (selectedBlock?.label ?? '')
                  }
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
                  leadingIcon={isCreatingNew && selectedBlocks.has(block.minutes) ? 'check' : undefined}
                  onPress={() => {
                    if (isCreatingNew) {
                      setSelectedBlocks((prev) => {
                        const next = new Set(prev);
                        if (next.has(block.minutes)) {
                          next.delete(block.minutes);
                        } else {
                          next.add(block.minutes);
                        }
                        return next;
                      });
                    } else {
                      setSelectedBlocks(new Set([block.minutes]));
                      setBlockMenuVisible(false);
                    }
                  }}
                />
              ))}
            </ScrollView>
          </Menu>
          {isCreatingNew && sortedSelectedBlocks.length > 0 && (
            <View style={styles.blockChipsRow}>
              {sortedSelectedBlocks.map((block) => (
                <Chip
                  key={block}
                  onClose={() =>
                    setSelectedBlocks((prev) => {
                      const next = new Set(prev);
                      next.delete(block);
                      return next;
                    })
                  }
                  style={styles.blockChip}
                >
                  {TIME_BLOCKS.find((candidate) => candidate.minutes === block)?.label}
                </Chip>
              ))}
            </View>
          )}
          {isCreatingNew && (
            <HelperText type="info">
              Puedes elegir más de un horario para dejar varios items del plan de una vez
            </HelperText>
          )}
        </View>
      )}
      {dateError ? (
        <HelperText type="error">
          {isRecurring && canBeRecurring
            ? 'Selecciona el día de la semana y la hora'
            : showWeekDayPicker
              ? hasNoSchedule
                ? 'Selecciona al menos un día'
                : 'Selecciona al menos un día y un horario'
              : isOneOff && hasNoSchedule
                ? 'Selecciona la fecha'
                : 'Selecciona la fecha y revisa la hora ingresada'}
        </HelperText>
      ) : isRecurring && canBeRecurring ? (
        <HelperText type="info">
          Se repite todas las semanas, a partir de hoy y durante las próximas 12 semanas (~3 meses)
        </HelperText>
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

      <View style={[styles.field, styles.craneRow]}>
        <MaterialCommunityIcons name="crane" size={22} color={HEAVY_CRANE_COLOR} />
        <View style={styles.craneText}>
          <Text variant="bodyMedium">{HEAVY_CRANE_LABEL}</Text>
          <Text variant="bodySmall" style={styles.craneHint}>
            Márcalo si este viaje necesita coordinar una grúa especial
          </Text>
        </View>
        <Switch value={requiresHeavyCrane} onValueChange={setRequiresHeavyCrane} />
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
  blockChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  blockChip: {
    marginBottom: 4,
  },
  weekDayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  weekDayLabel: {
    flex: 1,
  },
  truckStepper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  truckCount: {
    minWidth: 18,
    textAlign: 'center',
  },
  truckLabel: {
    opacity: 0.7,
    marginLeft: 4,
  },
  recurringRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  recurringText: {
    flex: 1,
  },
  recurringHint: {
    opacity: 0.7,
    marginTop: 2,
  },
  noScheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  noScheduleText: {
    flex: 1,
  },
  noScheduleHint: {
    opacity: 0.7,
    marginTop: 2,
  },
  craneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  craneText: {
    flex: 1,
  },
  craneHint: {
    opacity: 0.7,
    marginTop: 2,
  },
});
