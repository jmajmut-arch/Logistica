import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, HelperText, IconButton, Menu, SegmentedButtons, Text, TextInput } from 'react-native-paper';
import * as DocumentPicker from 'expo-document-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { carrierRepository } from '@/data/repositories/carrierRepository';
import { dispatchIssueRepository } from '@/data/repositories/dispatchIssueRepository';
import { siteRepository } from '@/data/repositories/siteRepository';
import { uploadDispatchGuideFile } from '@/data/supabase/storage';
import type { Carrier } from '@/domain/entities/Carrier';
import type { Site } from '@/domain/entities/Site';
import { useSessionStore } from '@/store/sessionStore';
import { PALETTE } from '@/theme';
import { DISPATCH_ISSUE_TYPES, type DispatchIssueType } from '@/types/enums';
import { DISPATCH_ISSUE_TYPE_LABELS_SHORT } from '@/utils/dispatchIssueDisplay';
import { SITE_TYPE_LABELS } from '@/utils/siteDisplay';

import type { DispatchIssuesStackParamList } from './DispatchIssuesStack';

type PickedFile = { blob: Blob; name: string; mimeType: string | null };

type Navigation = NativeStackNavigationProp<DispatchIssuesStackParamList, 'DispatchIssueForm'>;

const ISSUE_TYPE_OPTIONS: { value: DispatchIssueType; label: string }[] = DISPATCH_ISSUE_TYPES.map(
  (type) => ({ value: type, label: DISPATCH_ISSUE_TYPE_LABELS_SHORT[type] }),
);

export function DispatchIssueFormScreen() {
  const navigation = useNavigation<Navigation>();
  const currentUser = useSessionStore((state) => state.currentUser);

  const [sites, setSites] = useState<Site[] | null>(null);
  const [carriers, setCarriers] = useState<Carrier[] | null>(null);
  const [guideNumber, setGuideNumber] = useState('');
  const [siteId, setSiteId] = useState(0);
  const [siteMenuVisible, setSiteMenuVisible] = useState(false);
  const [carrierId, setCarrierId] = useState(0);
  const [carrierMenuVisible, setCarrierMenuVisible] = useState(false);
  const [issueType, setIssueType] = useState<DispatchIssueType>('no_ingresada');
  const [description, setDescription] = useState('');
  const [guideNumberError, setGuideNumberError] = useState(false);
  const [siteError, setSiteError] = useState(false);
  const [descriptionError, setDescriptionError] = useState(false);
  const [pickedFile, setPickedFile] = useState<PickedFile | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    siteRepository.findAll().then(setSites);
    carrierRepository.findAll().then(setCarriers);
  }, []);

  const pickFile = async () => {
    setUploadError(null);
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      multiple: false,
      copyToCacheDirectory: true,
      base64: false,
    });
    if (result.canceled) {
      return;
    }
    const asset = result.assets[0];
    const blob = asset.file ?? (await (await fetch(asset.uri)).blob());
    setPickedFile({ blob, name: asset.name, mimeType: asset.mimeType ?? null });
  };

  const onSubmit = async () => {
    if (!currentUser) {
      return;
    }
    const trimmedGuideNumber = guideNumber.trim();
    const trimmedDescription = description.trim();

    let hasError = false;
    if (!trimmedGuideNumber) {
      setGuideNumberError(true);
      hasError = true;
    } else {
      setGuideNumberError(false);
    }
    if (siteId === 0) {
      setSiteError(true);
      hasError = true;
    } else {
      setSiteError(false);
    }
    if (!trimmedDescription) {
      setDescriptionError(true);
      hasError = true;
    } else {
      setDescriptionError(false);
    }
    if (hasError) {
      return;
    }

    setSubmitting(true);
    setUploadError(null);
    try {
      let guideFileUrl: string | null = null;
      let guideFileName: string | null = null;
      if (pickedFile) {
        try {
          guideFileUrl = await uploadDispatchGuideFile(pickedFile.blob, pickedFile.name, pickedFile.mimeType);
          guideFileName = pickedFile.name;
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error);
          setUploadError(`No se pudo subir el documento: ${reason}`);
          return;
        }
      }
      await dispatchIssueRepository.create({
        guideNumber: trimmedGuideNumber,
        siteId,
        carrierId: carrierId || null,
        issueType,
        description: trimmedDescription,
        guideFileUrl,
        guideFileName,
        status: 'open',
        raisedBy: currentUser.id,
        closedBy: null,
        closedAt: null,
        resolutionNotes: null,
      });
      navigation.goBack();
    } finally {
      setSubmitting(false);
    }
  };

  if (sites === null || carriers === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const selectedSite = sites.find((site) => site.id === siteId);
  const selectedCarrier = carriers.find((carrier) => carrier.id === carrierId);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TextInput
        label="N° de guía de despacho"
        value={guideNumber}
        onChangeText={setGuideNumber}
        mode="outlined"
        placeholder="12345"
        style={styles.field}
      />
      {guideNumberError && <HelperText type="error">Ingresa el número de guía</HelperText>}

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

      <Text variant="bodyMedium" style={styles.label}>
        Motivo
      </Text>
      <SegmentedButtons
        value={issueType}
        onValueChange={(value) => setIssueType(value as DispatchIssueType)}
        buttons={ISSUE_TYPE_OPTIONS}
        style={styles.field}
      />

      <TextInput
        label="Descripción del problema"
        value={description}
        onChangeText={setDescription}
        mode="outlined"
        multiline
        numberOfLines={4}
        style={styles.field}
      />
      {descriptionError && <HelperText type="error">Describe el problema</HelperText>}

      <Text variant="bodyMedium" style={styles.label}>
        Documento de la guía (opcional)
      </Text>
      {pickedFile ? (
        <View style={styles.fileRow}>
          <MaterialCommunityIcons name="file-document-outline" size={20} color={PALETTE.primary} />
          <Text style={styles.fileName} numberOfLines={1}>
            {pickedFile.name}
          </Text>
          <IconButton icon="close" size={18} onPress={() => setPickedFile(null)} />
        </View>
      ) : (
        <Button mode="outlined" icon="paperclip" onPress={pickFile} style={styles.field}>
          Adjuntar guía
        </Button>
      )}
      {uploadError && <HelperText type="error">{uploadError}</HelperText>}

      <Button mode="contained" onPress={onSubmit} loading={submitting} disabled={submitting}>
        Levantar incidencia
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
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: PALETTE.border,
    borderRadius: 4,
  },
  fileName: {
    flex: 1,
  },
});
