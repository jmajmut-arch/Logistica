import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';

/** Vuelve a ejecutar `loader` cada vez que la pantalla recupera el foco (ej. al volver de un formulario). */
export function useFocusRefresh(loader: () => void | Promise<void>): void {
  useFocusEffect(
    useCallback(() => {
      loader();
    }, [loader]),
  );
}
