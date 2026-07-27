import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { IconButton, Text, TextInput } from 'react-native-paper';
import Svg, { Circle, Line, Rect, Text as SvgText } from 'react-native-svg';

import type {
  DockCycleParams,
  ForkliftPhase,
  ForkliftState,
  Point,
} from '@/domain/entities/DockSimulation';
import {
  computeCycleBreakdown,
  computePhaseFractions,
  computeThroughputPerForkliftPerHour,
  computeTotalThroughputPerHour,
  computeTruckUnloadTimeMin,
  forkliftPositionForProgress,
} from '@/domain/rules/dockSimulationRules';
import { PALETTE } from '@/theme';

const VIEW_W = 400;
const VIEW_H = 170;
const PATH: Point[] = [
  { x: 40, y: 130 },
  { x: 220, y: 130 },
  { x: 360, y: 50 },
];
const MAX_RENDERED_FORKLIFTS = 6;
const VISUAL_CYCLE_MS = 4000;
const FRAME_INTERVAL_MS = 1000 / 30;

const PHASE_COLORS: Record<ForkliftPhase, string> = {
  picking: PALETTE.secondary,
  traveling: PALETTE.primary,
  placing: '#22c55e',
  returning: 'rgba(226,232,240,0.4)',
};

const PHASE_LABELS: Record<ForkliftPhase, string> = {
  picking: 'Recogiendo en andén',
  traveling: 'Trasladando pallet',
  placing: 'Ubicando en rack',
  returning: 'Retornando vacío',
};

interface FieldConfig {
  key: keyof typeof DEFAULTS;
  label: string;
}

const DEFAULTS = {
  palletsPerTruck: '24',
  numForklifts: '2',
  pickTimeSec: '15',
  placeTimeSec: '20',
  distanceM: '60',
  speedLoadedKmh: '6',
  speedEmptyKmh: '9',
};

const FIELDS: FieldConfig[] = [
  { key: 'palletsPerTruck', label: 'Pallets por camión' },
  { key: 'numForklifts', label: 'N° de montacargas' },
  { key: 'pickTimeSec', label: 'Tiempo de recogida (seg)' },
  { key: 'placeTimeSec', label: 'Tiempo de ubicación (seg)' },
  { key: 'distanceM', label: 'Distancia al rack (m)' },
  { key: 'speedLoadedKmh', label: 'Velocidad cargado (km/h)' },
  { key: 'speedEmptyKmh', label: 'Velocidad vacío (km/h)' },
];

function toNumber(text: string): number {
  const value = Number(text.replace(',', '.'));
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

function formatNumber(value: number, maximumFractionDigits = 1): string {
  if (!Number.isFinite(value)) {
    return '—';
  }
  return value.toLocaleString('es-CL', { maximumFractionDigits });
}

function ResultRow({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <View style={styles.resultRow}>
      <Text variant="bodyMedium" style={styles.resultLabel}>
        {label}
      </Text>
      <Text
        variant={emphasize ? 'titleMedium' : 'bodyMedium'}
        style={emphasize && styles.resultEmphasis}
      >
        {value}
      </Text>
    </View>
  );
}

export function LoadSimulatorScreen() {
  const [values, setValues] = useState(DEFAULTS);
  const [playing, setPlaying] = useState(true);
  const [forklifts, setForklifts] = useState<ForkliftState[]>([]);

  const setField = (key: keyof typeof DEFAULTS, text: string) =>
    setValues((current) => ({ ...current, [key]: text.replace(',', '.') }));

  const params: DockCycleParams = useMemo(
    () => ({
      palletsPerTruck: toNumber(values.palletsPerTruck),
      pickTimeSec: toNumber(values.pickTimeSec),
      distanceM: toNumber(values.distanceM),
      speedLoadedKmh: toNumber(values.speedLoadedKmh),
      speedEmptyKmh: toNumber(values.speedEmptyKmh),
      placeTimeSec: toNumber(values.placeTimeSec),
    }),
    [values],
  );
  const numForklifts = toNumber(values.numForklifts);

  const breakdown = useMemo(() => computeCycleBreakdown(params), [params]);
  const fractions = useMemo(() => computePhaseFractions(breakdown), [breakdown]);
  const perForkliftThroughput = computeThroughputPerForkliftPerHour(breakdown.cycleTimeMin);
  const totalThroughput = computeTotalThroughputPerHour(breakdown.cycleTimeMin, numForklifts);
  const unloadTimeMin = computeTruckUnloadTimeMin(
    params.palletsPerTruck,
    breakdown.cycleTimeMin,
    numForklifts,
  );

  const renderedCount = Math.min(Math.max(Math.floor(numForklifts), 0), MAX_RENDERED_FORKLIFTS);
  const requestRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const lastRenderRef = useRef(0);

  useEffect(() => {
    if (!playing || renderedCount === 0) {
      return undefined;
    }

    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }
      if (timestamp - lastRenderRef.current > FRAME_INTERVAL_MS) {
        lastRenderRef.current = timestamp;
        const elapsed = timestamp - startTimeRef.current;
        const baseProgress = (elapsed % VISUAL_CYCLE_MS) / VISUAL_CYCLE_MS;
        const next: ForkliftState[] = [];
        for (let i = 0; i < renderedCount; i += 1) {
          next.push(forkliftPositionForProgress(baseProgress + i / renderedCount, fractions, PATH));
        }
        setForklifts(next);
      }
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current !== null) {
        cancelAnimationFrame(requestRef.current);
      }
      startTimeRef.current = null;
    };
  }, [playing, renderedCount, fractions]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text variant="titleMedium">Parámetros de recepción</Text>
      <View style={styles.grid}>
        {FIELDS.map((field) => (
          <TextInput
            key={field.key}
            label={field.label}
            value={values[field.key]}
            onChangeText={(text) => setField(field.key, text)}
            keyboardType="decimal-pad"
            mode="outlined"
            style={styles.gridField}
          />
        ))}
      </View>

      <Text variant="titleMedium" style={styles.sectionTitle}>
        Simulación en vivo
      </Text>
      <View style={styles.animationPanel}>
        <Svg width="100%" height={VIEW_H} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}>
          <Line
            x1={PATH[0].x}
            y1={PATH[0].y}
            x2={PATH[1].x}
            y2={PATH[1].y}
            stroke={PALETTE.border}
            strokeWidth={10}
            strokeLinecap="round"
          />
          <Line
            x1={PATH[1].x}
            y1={PATH[1].y}
            x2={PATH[2].x}
            y2={PATH[2].y}
            stroke={PALETTE.border}
            strokeWidth={10}
            strokeLinecap="round"
          />

          <Rect x={8} y={112} width={48} height={26} rx={4} fill={PALETTE.secondary} />
          <Circle cx={18} cy={140} r={4} fill={PALETTE.background} />
          <Circle cx={46} cy={140} r={4} fill={PALETTE.background} />
          <SvgText x={32} y={162} fontSize={10} fill={PALETTE.textMuted} textAnchor="middle">
            Andén
          </SvgText>

          <Rect
            x={338}
            y={12}
            width={44}
            height={58}
            rx={2}
            fill={PALETTE.surfaceVariant}
            stroke={PALETTE.border}
          />
          <Line x1={338} y1={30} x2={382} y2={30} stroke={PALETTE.border} strokeWidth={2} />
          <Line x1={338} y1={48} x2={382} y2={48} stroke={PALETTE.border} strokeWidth={2} />
          <SvgText x={360} y={84} fontSize={10} fill={PALETTE.textMuted} textAnchor="middle">
            Rack
          </SvgText>

          {(renderedCount === 0 ? [] : forklifts).map((forklift, index) => (
            <Rect
              key={index}
              x={forklift.x - 6}
              y={forklift.y - 5}
              width={12}
              height={10}
              rx={2}
              fill={PHASE_COLORS[forklift.phase]}
            />
          ))}
        </Svg>

        <View style={styles.legendRow}>
          {(Object.keys(PHASE_LABELS) as ForkliftPhase[]).map((phase) => (
            <View key={phase} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: PHASE_COLORS[phase] }]} />
              <Text variant="bodySmall" style={styles.legendLabel}>
                {PHASE_LABELS[phase]}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.playRow}>
          <IconButton
            icon={playing ? 'pause' : 'play'}
            onPress={() => setPlaying((current) => !current)}
          />
          {numForklifts > MAX_RENDERED_FORKLIFTS && (
            <Text variant="bodySmall" style={styles.legendLabel}>
              Mostrando {MAX_RENDERED_FORKLIFTS} de {formatNumber(numForklifts, 0)} montacargas
            </Text>
          )}
        </View>
      </View>

      <Text variant="titleMedium" style={styles.sectionTitle}>
        Resultado
      </Text>
      <View style={styles.resultsPanel}>
        <ResultRow
          label="Recogida en andén"
          value={`${formatNumber(breakdown.pickTimeMin, 2)} min`}
        />
        <ResultRow
          label="Traslado cargado"
          value={`${formatNumber(breakdown.travelTimeMin, 2)} min`}
        />
        <ResultRow
          label="Ubicación en rack"
          value={`${formatNumber(breakdown.placeTimeMin, 2)} min`}
        />
        <ResultRow
          label="Retorno vacío"
          value={`${formatNumber(breakdown.returnTimeMin, 2)} min`}
        />
        <View style={styles.divider} />
        <ResultRow
          label="Ciclo total por pallet"
          value={`${formatNumber(breakdown.cycleTimeMin, 2)} min`}
          emphasize
        />
        <ResultRow
          label="Rendimiento por montacargas"
          value={`${formatNumber(perForkliftThroughput)} pallets/h`}
        />
        <ResultRow
          label={`Rendimiento total (${formatNumber(numForklifts, 0)} montacargas)`}
          value={`${formatNumber(totalThroughput)} pallets/h`}
          emphasize
        />
        <ResultRow
          label={`Tiempo para descargar 1 camión (${formatNumber(params.palletsPerTruck, 0)} pallets)`}
          value={Number.isFinite(unloadTimeMin) ? `${formatNumber(unloadTimeMin)} min` : '—'}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  gridField: {
    flexGrow: 1,
    flexBasis: '45%',
    minWidth: 150,
  },
  sectionTitle: {
    marginTop: 20,
    marginBottom: 8,
  },
  animationPanel: {
    backgroundColor: PALETTE.surface,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    opacity: 0.7,
  },
  playRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  resultsPanel: {
    backgroundColor: PALETTE.surface,
    borderRadius: 12,
    padding: 16,
    gap: 4,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  resultLabel: {
    opacity: 0.75,
  },
  resultEmphasis: {
    color: PALETTE.primary,
  },
  divider: {
    height: 1,
    backgroundColor: PALETTE.border,
    marginVertical: 6,
  },
});
