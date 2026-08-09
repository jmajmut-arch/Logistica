import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Menu, Text } from 'react-native-paper';

import { siteRepository } from '@/data/repositories/siteRepository';
import type { Site } from '@/domain/entities/Site';
import { useSessionStore } from '@/store/sessionStore';
import { PALETTE } from '@/theme';
import { ROLE_LABELS } from '@/utils/userDisplay';

export function SessionHeaderRight() {
  const currentUser = useSessionStore((state) => state.currentUser);
  const currentSiteId = useSessionStore((state) => state.currentSiteId);
  const setSite = useSessionStore((state) => state.setSite);
  const logout = useSessionStore((state) => state.logout);

  const [sites, setSites] = useState<Site[]>([]);
  const [siteMenuVisible, setSiteMenuVisible] = useState(false);

  const isOperator = currentUser?.role === 'operator';

  useEffect(() => {
    if (isOperator) {
      siteRepository.findAll().then(setSites);
    }
  }, [isOperator]);

  const currentSiteName = useCallback(
    () => sites.find((site) => site.id === currentSiteId)?.name ?? 'Elegir sitio',
    [sites, currentSiteId],
  );

  if (!currentUser) {
    return null;
  }

  return (
    <View style={styles.container}>
      {isOperator ? (
        <Menu
          visible={siteMenuVisible}
          onDismiss={() => setSiteMenuVisible(false)}
          anchor={
            <Pressable onPress={() => setSiteMenuVisible(true)} style={styles.sitePill}>
              <MaterialCommunityIcons name="map-marker-outline" size={16} color={PALETTE.primary} />
              <Text variant="labelMedium" numberOfLines={1} style={styles.siteLabel}>
                {currentSiteName()}
              </Text>
            </Pressable>
          }
        >
          {sites.map((site) => (
            <Menu.Item
              key={site.id}
              title={site.name}
              onPress={() => {
                setSite(site.id);
                setSiteMenuVisible(false);
              }}
            />
          ))}
        </Menu>
      ) : (
        <Text variant="labelMedium" numberOfLines={1} style={styles.roleLabel}>
          {ROLE_LABELS[currentUser.role]}
        </Text>
      )}
      <Pressable
        onPress={logout}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Cerrar sesión"
      >
        <MaterialCommunityIcons name="logout" size={22} color={PALETTE.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginRight: 16,
  },
  roleLabel: {
    opacity: 0.7,
  },
  sitePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: 140,
  },
  siteLabel: {
    color: PALETTE.primary,
  },
});
