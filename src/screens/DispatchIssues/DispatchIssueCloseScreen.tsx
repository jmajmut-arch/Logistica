import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Chip, Text, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { RoleGate } from '@/components/RoleGate';
import { carrierRepository } from '@/data/repositories/carrierRepository';
import { dispatchIssueRepository } from '@/data/repositories/dispatchIssueRepository';
import { siteRepository } from '@/data/repositories/siteRepository';
import { userRepository } from '@/data/repositories/userRepository';
import type { Carrier } from '@/domain/entities/Carrier';
import type { DispatchIssue } from '@/domain/entities/DispatchIssue';
import type { Site } from '@/domain/entities/Site';
import type { User } from '@/domain/entities/User';
import { useSessionStore } from '@/store/sessionStore';
import { useAppPalette } from '@/store/themeStore';
import {
  DISPATCH_ISSUE_STATUS_COLORS,
  DISPATCH_ISSUE_STATUS_LABELS,
  DISPATCH_ISSUE_TYPE_LABELS,
} from '@/utils/dispatchIssueDisplay';

import type { DispatchIssuesStackParamList } from './DispatchIssuesStack';

type Navigation = NativeStackNavigationProp<DispatchIssuesStackParamList, 'DispatchIssueClose'>;

export function DispatchIssueCloseScreen() {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<RouteProp<DispatchIssuesStackParamList, 'DispatchIssueClose'>>();
  const currentUser = useSessionStore((state) => state.currentUser);

  const [issue, setIssue] = useState<DispatchIssue | null>(null);
  const [sitesById, setSitesById] = useState<Map<number, Site>>(new Map());
  const [carriersById, setCarriersById] = useState<Map<number, Carrier>>(new Map());
  const [usersById, setUsersById] = useState<Map<number, User>>(new Map());
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const PALETTE = useAppPalette();

  useEffect(() => {
    Promise.all([
      dispatchIssueRepository.findById(route.params.issueId),
      siteRepository.findAll(),
      carrierRepository.findAll(),
      userRepository.findAll(),
    ]).then(([loadedIssue, sites, carriers, users]) => {
      setIssue(loadedIssue ?? null);
      setSitesById(new Map(sites.map((site) => [site.id, site])));
      setCarriersById(new Map(carriers.map((carrier) => [carrier.id, carrier])));
      setUsersById(new Map(users.map((user) => [user.id, user])));
    });
  }, [route.params.issueId]);

  const onClose = async () => {
    if (!currentUser || !issue) {
      return;
    }
    setSubmitting(true);
    try {
      await dispatchIssueRepository.close(issue.id, {
        closedBy: currentUser.id,
        closedAt: Date.now(),
        resolutionNotes: resolutionNotes.trim() || null,
      });
      navigation.goBack();
    } finally {
      setSubmitting(false);
    }
  };

  if (issue === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const site = sitesById.get(issue.siteId);
  const carrier = issue.carrierId !== null ? carriersById.get(issue.carrierId) : undefined;
  const raisedByUser = usersById.get(issue.raisedBy);
  const closedByUser = issue.closedBy !== null ? usersById.get(issue.closedBy) : undefined;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.headerRow}>
            <Text variant="titleLarge">Guía {issue.guideNumber}</Text>
            <Chip
              style={{ backgroundColor: `${DISPATCH_ISSUE_STATUS_COLORS[issue.status]}26` }}
              textStyle={{ color: DISPATCH_ISSUE_STATUS_COLORS[issue.status] }}
            >
              {DISPATCH_ISSUE_STATUS_LABELS[issue.status]}
            </Chip>
          </View>

          <Text variant="bodyMedium" style={styles.row}>
            Área: {site ? site.name : `Sitio #${issue.siteId}`}
          </Text>
          {carrier && (
            <Text variant="bodyMedium" style={styles.row}>
              Empresa: {carrier.name}
            </Text>
          )}
          <Text variant="bodyMedium" style={styles.row}>
            Motivo: {DISPATCH_ISSUE_TYPE_LABELS[issue.issueType]}
          </Text>
          <Text variant="bodyMedium" style={styles.row}>
            Descripción: {issue.description}
          </Text>
          <Text variant="bodySmall" style={styles.meta}>
            Levantada por {raisedByUser ? raisedByUser.name : `#${issue.raisedBy}`} el{' '}
            {format(new Date(issue.raisedAt), "dd-MM-yyyy HH:mm", { locale: es })}
          </Text>
          {issue.guideFileUrl !== null && (
            <Pressable
              style={[styles.fileRow, { borderColor: PALETTE.border }]}
              onPress={() => Linking.openURL(issue.guideFileUrl!)}
            >
              <MaterialCommunityIcons name="file-document-outline" size={20} color={PALETTE.secondary} />
              <Text
                variant="bodyMedium"
                style={[styles.fileName, { color: PALETTE.secondary }]}
                numberOfLines={1}
              >
                {issue.guideFileName ?? 'Ver documento adjunto'}
              </Text>
            </Pressable>
          )}
        </Card.Content>
      </Card>

      {issue.status === 'closed' ? (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>
              Regularización
            </Text>
            <Text variant="bodyMedium" style={styles.row}>
              {issue.resolutionNotes ?? 'Sin notas de regularización.'}
            </Text>
            <Text variant="bodySmall" style={styles.meta}>
              Cerrada por {closedByUser ? closedByUser.name : `#${issue.closedBy}`}
              {issue.closedAt !== null &&
                ` el ${format(new Date(issue.closedAt), 'dd-MM-yyyy HH:mm', { locale: es })}`}
            </Text>
          </Card.Content>
        </Card>
      ) : (
        <RoleGate
          permission="manageDispatchIssues"
          fallback={
            <Card style={styles.card}>
              <Card.Content>
                <Text variant="bodySmall" style={styles.meta}>
                  Solo el supervisor de logística puede regularizar esta incidencia.
                </Text>
              </Card.Content>
            </Card>
          }
        >
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.cardTitle}>
                Regularizar
              </Text>
              <TextInput
                label="Notas de regularización (opcional)"
                value={resolutionNotes}
                onChangeText={setResolutionNotes}
                mode="outlined"
                multiline
                numberOfLines={4}
                style={styles.field}
              />
              <Button mode="contained" onPress={onClose} loading={submitting} disabled={submitting}>
                Cerrar incidencia
              </Button>
            </Card.Content>
          </Card>
        </RoleGate>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    marginBottom: 4,
  },
  cardTitle: {
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  row: {
    marginBottom: 8,
  },
  meta: {
    opacity: 0.7,
    marginTop: 4,
  },
  field: {
    marginBottom: 12,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 4,
  },
  fileName: {
    flex: 1,
  },
});
