import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { siteRepository } from '@/data/repositories/siteRepository';
import { userRepository } from '@/data/repositories/userRepository';
import type { Site } from '@/domain/entities/Site';
import type { User } from '@/domain/entities/User';
import { useSessionStore } from '@/store/sessionStore';
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
        style={[styles.card, pressed && { borderColor: accent, transform: [{ scale: 1.015 }] }]}
      >
        <View style={[styles.cardIcon, { backgroundColor: `${accent}26` }]}>
          <MaterialCommunityIcons name={ROLE_ICONS[user.role]} size={26} color={accent} />
        </View>
        <View style={styles.cardText}>
          <Text style={styles.cardName}>{user.name}</Text>
          <Text style={[styles.cardRole, { color: accent }]}>{ROLE_LABELS[user.role]}</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={22} color="rgba(255,255,255,0.4)" />
      </Pressable>
    </Animated.View>
  );
}

function SiteCard({ site, onPress, delay }: { site: Site; onPress: () => void; delay: number }) {
  const [pressed, setPressed] = useState(false);
  const [anim] = useState(() => new Animated.Value(0));

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
        style={[styles.card, pressed && { borderColor: '#38bdf8', transform: [{ scale: 1.015 }] }]}
      >
        <View style={[styles.cardIcon, { backgroundColor: 'rgba(56,189,248,0.15)' }]}>
          <MaterialCommunityIcons name={SITE_TYPE_ICONS[site.type]} size={26} color="#38bdf8" />
        </View>
        <View style={styles.cardText}>
          <Text style={styles.cardName}>{site.name}</Text>
          <Text style={[styles.cardRole, { color: '#38bdf8' }]}>{SITE_TYPE_LABELS[site.type]}</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={22} color="rgba(255,255,255,0.4)" />
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
        style={[styles.card, pressed && { borderColor: '#fb923c', transform: [{ scale: 1.015 }] }]}
      >
        <View style={[styles.cardIcon, { backgroundColor: 'rgba(251,146,60,0.15)' }]}>
          <MaterialCommunityIcons name={OPERATOR_SCOPE_ICONS[scope]} size={26} color="#fb923c" />
        </View>
        <View style={styles.cardText}>
          <Text style={styles.cardName}>{OPERATOR_SCOPE_LABELS[scope]}</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={22} color="rgba(255,255,255,0.4)" />
      </Pressable>
    </Animated.View>
  );
}

export function LoginScreen() {
  const login = useSessionStore((state) => state.login);
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
    <LinearGradient colors={['#0b1120', '#132743', '#0b1120']} style={styles.gradient}>
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <View style={styles.container}>
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
            <View style={styles.heroDashedLine} />
            <View style={styles.heroWarehouse}>
              <MaterialCommunityIcons name="warehouse" size={30} color="#38bdf8" />
            </View>
            <View style={styles.heroPin}>
              <MaterialCommunityIcons name="map-marker-radius" size={22} color="#38bdf8" />
            </View>
            <View style={styles.badgeDiamond}>
              <MaterialCommunityIcons name="truck-fast-outline" size={28} color="#0b1120" />
            </View>
          </View>
          <Text style={styles.title}>Control de Transporte</Text>
          <Text style={styles.subtitle}>Planificación y cumplimiento de cargas</Text>
          <View style={styles.tagRow}>
            <View style={styles.tagPill}>
              <Text style={styles.tagText}>Subida · Retiro · Home delivery</Text>
            </View>
          </View>
        </Animated.View>

        <View style={styles.picker}>
          {pendingOperator === null ? (
            <>
              <Text style={styles.pickerLabel}>Selecciona un usuario para continuar</Text>
              {demoUsers === null ? (
                <ActivityIndicator style={styles.loader} color="#fb923c" />
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
                <MaterialCommunityIcons name="chevron-left" size={20} color="rgba(226,232,240,0.7)" />
                <Text style={styles.backText}>Elegir otro usuario</Text>
              </Pressable>
              <Text style={styles.pickerLabel}>
                Hola {pendingOperator.name}, ¿dónde estás trabajando hoy?
              </Text>
              {sites === null ? (
                <ActivityIndicator style={styles.loader} color="#fb923c" />
              ) : sites.length === 0 ? (
                <Text style={styles.emptySites}>
                  Todavía no hay patios ni bodegas registrados. Pide a un supervisor que los cree.
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
                <MaterialCommunityIcons name="chevron-left" size={20} color="rgba(226,232,240,0.7)" />
                <Text style={styles.backText}>Elegir otro sitio</Text>
              </Pressable>
              <Text style={styles.pickerLabel}>¿Qué vas a registrar hoy en {pendingSite.name}?</Text>
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

        <Text style={styles.footer}>Plan semanal · Registro de llegadas · Cumplimiento</Text>
      </View>
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
    backgroundColor: 'rgba(251,146,60,0.16)',
  },
  glowBottom: {
    position: 'absolute',
    bottom: -140,
    right: -100,
    width: 360,
    height: 360,
    borderRadius: 360,
    backgroundColor: 'rgba(56,189,248,0.12)',
  },
  container: {
    flex: 1,
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
    borderColor: 'rgba(56,189,248,0.35)',
  },
  heroWarehouse: {
    position: 'absolute',
    left: 0,
    top: 8,
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(56,189,248,0.14)',
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
    backgroundColor: 'rgba(56,189,248,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeDiamond: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: '#fb923c',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '45deg' }],
    shadowColor: '#fb923c',
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: '#f8fafc',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(226,232,240,0.75)',
    marginTop: 4,
    textAlign: 'center',
  },
  tagRow: {
    flexDirection: 'row',
    marginTop: 14,
  },
  tagPill: {
    borderWidth: 1,
    borderColor: 'rgba(251,146,60,0.5)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  tagText: {
    color: '#fb923c',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  picker: {
    width: '100%',
    gap: 14,
  },
  pickerLabel: {
    color: 'rgba(226,232,240,0.6)',
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
    color: 'rgba(226,232,240,0.7)',
    fontSize: 13,
  },
  emptySites: {
    color: 'rgba(226,232,240,0.6)',
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
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
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
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '600',
  },
  cardRole: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  footer: {
    color: 'rgba(226,232,240,0.35)',
    fontSize: 11,
    textAlign: 'center',
  },
});
