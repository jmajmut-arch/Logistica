import { Linking, Platform } from 'react-native';

/**
 * Los datos ahora viven en Supabase (compartidos entre dispositivos), así que la ficha
 * adjunta no puede quedar guardada como un archivo local — no sería visible desde otro
 * dispositivo/navegador. Se guarda directo como data URL en la fila de la sustancia (ver
 * `pickSds` en SubstanceFormScreen, que pide `base64: true` al DocumentPicker), igual en
 * todas las plataformas.
 */
export async function copySdsToAppStorage(
  pickedUri: string,
  _originalName: string,
): Promise<string> {
  return pickedUri;
}

export function deleteSdsFile(_uri: string): void {
  // No-op: no hay archivo local que borrar, la ficha vive en la fila de la sustancia.
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
