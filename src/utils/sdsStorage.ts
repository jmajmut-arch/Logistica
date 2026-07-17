import { Directory, File, Paths } from 'expo-file-system';
import { Linking, Platform } from 'react-native';

const SDS_DIRECTORY_NAME = 'sds';

function getSdsDirectory(): Directory {
  const directory = new Directory(Paths.document, SDS_DIRECTORY_NAME);
  if (!directory.exists) {
    directory.create();
  }
  return directory;
}

/**
 * Copia el archivo elegido en expo-document-picker a almacenamiento persistente de la app.
 *
 * expo-file-system (File/Directory/Paths) no tiene implementación en web — su módulo nativo
 * es un stub que solo loguea un warning, así que ahí no hay nada que copiar: en web
 * `pickedUri` ya viene como data URL (ver `pickSds` en SubstanceFormScreen, que pide
 * `base64: true` al DocumentPicker solo en esa plataforma) y se guarda tal cual, tal como
 * queda persistido directamente en la fila de la sustancia.
 */
export async function copySdsToAppStorage(
  pickedUri: string,
  originalName: string,
): Promise<string> {
  if (Platform.OS === 'web') {
    return pickedUri;
  }
  const source = new File(pickedUri);
  const destination = new File(getSdsDirectory(), `${Date.now()}-${originalName}`);
  await source.copy(destination);
  return destination.uri;
}

export function deleteSdsFile(uri: string): void {
  if (Platform.OS === 'web') {
    return;
  }
  const file = new File(uri);
  if (file.exists) {
    file.delete();
  }
}

/**
 * Abre la ficha adjunta. Los navegadores (Chrome incluido) bloquean silenciosamente
 * `window.open`/navegación de nivel superior a una URL `data:` — es una protección contra
 * phishing, no algo configurable — así que en web hay que convertirla primero a un blob URL,
 * que sí se puede abrir en una pestaña nueva.
 */
export async function openSdsFile(uri: string): Promise<void> {
  if (Platform.OS === 'web' && uri.startsWith('data:')) {
    const blob = await (await fetch(uri)).blob();
    const blobUrl = URL.createObjectURL(blob);
    await Linking.openURL(blobUrl);
    return;
  }
  await Linking.openURL(uri);
}
