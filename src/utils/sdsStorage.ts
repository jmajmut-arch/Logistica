import { Directory, File, Paths } from 'expo-file-system';

const SDS_DIRECTORY_NAME = 'sds';

function getSdsDirectory(): Directory {
  const directory = new Directory(Paths.document, SDS_DIRECTORY_NAME);
  if (!directory.exists) {
    directory.create();
  }
  return directory;
}

/** Copia el archivo elegido en expo-document-picker a almacenamiento persistente de la app. */
export async function copySdsToAppStorage(
  pickedUri: string,
  originalName: string,
): Promise<string> {
  const source = new File(pickedUri);
  const destination = new File(getSdsDirectory(), `${Date.now()}-${originalName}`);
  await source.copy(destination);
  return destination.uri;
}

export function deleteSdsFile(uri: string): void {
  const file = new File(uri);
  if (file.exists) {
    file.delete();
  }
}
