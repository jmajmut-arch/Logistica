import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { siteRepository } from '@/data/repositories/siteRepository';
import { userRepository } from '@/data/repositories/userRepository';
import type { Site } from '@/domain/entities/Site';
import type { User } from '@/domain/entities/User';
import { useSessionStore } from '@/store/sessionStore';
import { useAppPalette } from '@/store/themeStore';
import { withAlpha } from '@/theme';
import { OPERATOR_SCOPES, type OperatorScope } from '@/types/enums';
import { OPERATOR_SCOPE_ICONS, OPERATOR_SCOPE_LABELS } from '@/utils/operatorScope';
import { SITE_TYPE_LABELS } from '@/utils/siteDisplay';
import { ROLE_COLORS, ROLE_ICONS, ROLE_LABELS } from '@/utils/userDisplay';

const SITE_TYPE_ICONS: Record<Site['type'], keyof typeof MaterialCommunityIcons.glyphMap> = {
  patio: 'texture-box',
  bodega: 'warehouse',
};

function UserCard({ user, onPress, delay }: { user: User; onPress: () => void; delay: number }) {
  const [pressed, setPressed] = useState(false);
  const [anim] = useState(() => new Animated.Value(0));
  const PALETTE = useAppPalette();

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 420,
      delay,
      useNativeDriver: false,
    }).start();
  }, [anim, delay]);

  const accent = ROLE_COLORS[user.role];

  return (
    <Animated.View
      style={{
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
      }}
    >
      <Pressable
        onPress={onPress}
        onHoverIn={() => setPressed(true)}
        onHoverOut={() => setPressed(false)}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        style={[
          styles.card,
          {
            backgroundColor: withAlpha(PALETTE.text, 0.06),
            borderColor: withAlpha(PALETTE.text, 0.1),
          },
          pressed && { borderColor: accent, transform: [{ scale: 1.015 }] },
        ]}
      >
        <View style={[styles.cardIcon, { backgroundColor: `${accent}26` }]}>
          <MaterialCommunityIcons name={ROLE_ICONS[user.role]} size={26} color={accent} />
        </View>
        <View style={styles.cardText}>
          <Text style={[styles.cardName, { color: PALETTE.text }]}>{user.name}</Text>
          <Text style={[styles.cardRole, { color: accent }]}>{ROLE_LABELS[user.role]}</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={22} color={withAlpha(PALETTE.text, 0.4)} />
      </Pressable>
    </Animated.View>
  );
}

function SiteCard({ site, onPress, delay }: { site: Site; onPress: () => void; delay: number }) {
  const [pressed, setPressed] = useState(false);
  const [anim] = useState(() => new Animated.Value(0));
  const PALETTE = useAppPalette();

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 420,
      delay,
      useNativeDriver: false,
    }).start();
  }, [anim, delay]);

  return (
    <Animated.View
      style={{
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
      }}
    >
      <Pressable
        onPress={onPress}
        onHoverIn={() => setPressed(true)}
        onHoverOut={() => setPressed(false)}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        style={[
          styles.card,
          {
            backgroundColor: withAlpha(PALETTE.text, 0.06),
            borderColor: withAlpha(PALETTE.text, 0.1),
          },
          pressed && { borderColor: PALETTE.secondary, transform: [{ scale: 1.015 }] },
        ]}
      >
        <View style={[styles.cardIcon, { backgroundColor: withAlpha(PALETTE.secondary, 0.15) }]}>
          <MaterialCommunityIcons name={SITE_TYPE_ICONS[site.type]} size={26} color={PALETTE.secondary} />
        </View>
        <View style={styles.cardText}>
          <Text style={[styles.cardName, { color: PALETTE.text }]}>{site.name}</Text>
          <Text style={[styles.cardRole, { color: PALETTE.secondary }]}>{SITE_TYPE_LABELS[site.type]}</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={22} color={withAlpha(PALETTE.text, 0.4)} />
      </Pressable>
    </Animated.View>
  );
}

function ScopeCard({
  scope,
  onPress,
  delay,
}: {
  scope: OperatorScope;
  onPress: () => void;
  delay: number;
}) {
  const [pressed, setPressed] = useState(false);
  const [anim] = useState(() => new Animated.Value(0));
  const PALETTE = useAppPalette();

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 420,
      delay,
      useNativeDriver: false,
    }).start();
  }, [anim, delay]);

  return (
    <Animated.View
      style={{
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
      }}
    >
      <Pressable
        onPress={onPress}
        onHoverIn={() => setPressed(true)}
        onHoverOut={() => setPressed(false)}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        style={[
          styles.card,
          {
            backgroundColor: withAlpha(PALETTE.text, 0.06),
            borderColor: withAlpha(PALETTE.text, 0.1),
          },
          pressed && { borderColor: PALETTE.primary, transform: [{ scale: 1.015 }] },
        ]}
      >
        <View style={[styles.cardIcon, { backgroundColor: withAlpha(PALETTE.primary, 0.15) }]}>
          <MaterialCommunityIcons name={OPERATOR_SCOPE_ICONS[scope]} size={26} color={PALETTE.primary} />
        </View>
        <View style={styles.cardText}>
          <Text style={[styles.cardName, { color: PALETTE.text }]}>{OPERATOR_SCOPE_LABELS[scope]}</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={22} color={withAlpha(PALETTE.text, 0.4)} />
      </Pressable>
    </Animated.View>
  );
}

export function LoginScreen() {
  const login = useSessionStore((state) => state.login);
  const PALETTE = useAppPalette();
  const [demoUsers, setDemoUsers] = useState<User[] | null>(null);
  const [sites, setSites] = useState<Site[] | null>(null);
  const [pendingOperator, setPendingOperator] = useState<User | null>(null);
  const [pendingSite, setPendingSite] = useState<Site | null>(null);

  const [heroAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    userRepository.findAll().then(setDemoUsers);
    siteRepository.findAll().then(setSites);
  }, []);

  const handleSelectUser = (user: User) => {
    if (user.role === 'operator') {
      setPendingOperator(user);
      return;
    }
    login(user);
  };

  useEffect(() => {
    Animated.timing(heroAnim, {
      toValue: 1,
      duration: 550,
      useNativeDriver: false,
    }).start();
  }, [heroAnim]);

  return (
    <LinearGradient
      colors={[PALETTE.background, PALETTE.surface, PALETTE.background]}
      style={styles.gradient}
    >
      <View style={[styles.glowTop, { backgroundColor: withAlpha(PALETTE.primary, 0.16) }]} />
      <View style={[styles.glowBottom, { backgroundColor: withAlpha(PALETTE.secondary, 0.12) }]} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={{
            opacity: heroAnim,
            transform: [
              { translateY: heroAnim.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) },
            ],
            alignItems: 'center',
          }}
        >
          <View style={styles.heroScene}>
            <View style={[styles.heroDashedLine, { borderColor: withAlpha(PALETTE.secondary, 0.35) }]} />
            <View style={[styles.heroWarehouse, { backgroundColor: withAlpha(PALETTE.secondary, 0.14) }]}>
              <MaterialCommunityIcons name="warehouse" size={30} color={PALETTE.secondary} />
            </View>
            <View style={[styles.heroPin, { backgroundColor: withAlpha(PALETTE.secondary, 0.14) }]}>
              <MaterialCommunityIcons name="map-marker-radius" size={22} color={PALETTE.secondary} />
            </View>
            <View
              style={[
                styles.badgeDiamond,
                { backgroundColor: PALETTE.primary, shadowColor: PALETTE.primary },
              ]}
            >
              <MaterialCommunityIcons name="truck-fast-outline" size={28} color={PALETTE.onPrimary} />
            </View>
          </View>
          <Text style={[styles.title, { color: PALETTE.text }]}>Control de Transporte</Text>
          <Text style={[styles.subtitle, { color: PALETTE.textMuted }]}>
            Planificación y cumplimiento de cargas
          </Text>
          <View style={styles.tagRow}>
            <View style={[styles.tagPill, { borderColor: withAlpha(PALETTE.primary, 0.5) }]}>
              <Text style={[styles.tagText, { color: PALETTE.primary }]}>
                Subida · Retiro · Home delivery
              </Text>
            </View>
          </View>
        </Animated.View>

        <View style={styles.picker}>
          {pendingOperator === null ? (
            <>
              <Text style={[styles.pickerLabel, { color: withAlpha(PALETTE.text, 0.6) }]}>
                Selecciona un usuario para continuar
              </Text>
              {demoUsers === null ? (
                <ActivityIndicator style={styles.loader} color={PALETTE.primary} />
              ) : (
                <View style={styles.cardList}>
                  {demoUsers.map((user, index) => (
                    <UserCard
                      key={user.id}
                      user={user}
                      delay={120 + index * 90}
                      onPress={() => handleSelectUser(user)}
                    />
                  ))}
                </View>
              )}
            </>
          ) : pendingSite === null ? (
            <>
              <Pressable onPress={() => setPendingOperator(null)} style={styles.backRow}>
                <MaterialCommunityIcons name="chevron-left" size={20} color={PALETTE.textMuted} />
                <Text style={[styles.backText, { color: PALETTE.textMuted }]}>Elegir otro usuario</Text>
              </Pressable>
              <Text style={[styles.pickerLabel, { color: withAlpha(PALETTE.text, 0.6) }]}>
                Hola {pendingOperator.name}, ¿dónde estás trabajando hoy?
              </Text>
              {sites === null ? (
                <ActivityIndicator style={styles.loader} color={PALETTE.primary} />
              ) : sites.length === 0 ? (
                <Text style={[styles.emptySites, { color: withAlpha(PALETTE.text, 0.6) }]}>
                  Todavía no hay patios ni bodegas registrados. Pide a un planificador que los cree.
                </Text>
              ) : (
                <View style={styles.cardList}>
                  {sites.map((site, index) => (
                    <SiteCard
                      key={site.id}
                      site={site}
                      delay={80 + index * 90}
                      onPress={() => setPendingSite(site)}
                    />
                  ))}
                </View>
              )}
            </>
          ) : (
            <>
              <Pressable onPress={() => setPendingSite(null)} style={styles.backRow}>
                <MaterialCommunityIcons name="chevron-left" size={20} color={PALETTE.textMuted} />
                <Text style={[styles.backText, { color: PALETTE.textMuted }]}>Elegir otro sitio</Text>
              </Pressable>
              <Text style={[styles.pickerLabel, { color: withAlpha(PALETTE.text, 0.6) }]}>
                ¿Qué vas a registrar hoy en {pendingSite.name}?
              </Text>
              <View style={styles.cardList}>
                {OPERATOR_SCOPES.map((scope, index) => (
                  <ScopeCard
                    key={scope}
                    scope={scope}
                    delay={80 + index * 90}
                    onPress={() => login(pendingOperator, pendingSite.id, scope)}
                  />
                ))}
              </View>
            </>
          )}
        </View>

        <View style={styles.footerGroup}>
          <Text style={[styles.footer, { color: withAlpha(PALETTE.text, 0.35) }]}>
            Plan semanal de transporte · Registro de llegadas · Cumplimiento
          </Text>
          <Text style={[styles.credit, { color: withAlpha(PALETTE.text, 0.2) }]}>
            Desarrollado por Joel Majmut
          </Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  glowTop: {
    position: 'absolute',
    top: -120,
    left: -80,
    width: 320,
    height: 320,
    borderRadius: 320,
  },
  glowBottom: {
    position: 'absolute',
    bottom: -140,
    right: -100,
    width: 360,
    height: 360,
    borderRadius: 360,
  },
  scrollView: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 32,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  heroScene: {
    width: 200,
    height: 96,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroDashedLine: {
    position: 'absolute',
    left: 30,
    right: 30,
    top: 48,
    height: 0,
    borderTopWidth: 2,
    borderStyle: 'dashed',
  },
  heroWarehouse: {
    position: 'absolute',
    left: 0,
    top: 8,
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPin: {
    position: 'absolute',
    right: 4,
    top: 4,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeDiamond: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '45deg' }],
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 15,
    marginTop: 4,
    textAlign: 'center',
  },
  tagRow: {
    flexDirection: 'row',
    marginTop: 14,
  },
  tagPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  picker: {
    width: '100%',
    gap: 14,
  },
  pickerLabel: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 4,
  },
  loader: {
    marginTop: 12,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 2,
    marginBottom: 4,
  },
  backText: {
    fontSize: 13,
  },
  emptySites: {
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  cardList: {
    gap: 12,
    width: '100%',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: {
    flex: 1,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '600',
  },
  cardRole: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  footerGroup: {
    gap: 4,
  },
  footer: {
    fontSize: 11,
    textAlign: 'center',
  },
  credit: {
    fontSize: 10,
    textAlign: 'center',
  },
});
