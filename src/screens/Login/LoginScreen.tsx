import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { userRepository } from '@/data/repositories/userRepository';
import type { User } from '@/domain/entities/User';
import { useSessionStore } from '@/store/sessionStore';

const ROLE_LABELS: Record<User['role'], string> = {
  warehouse: 'Bodega',
  supervisor: 'Supervisor',
};

const ROLE_ICONS: Record<User['role'], keyof typeof MaterialCommunityIcons.glyphMap> = {
  warehouse: 'warehouse',
  supervisor: 'shield-check-outline',
};

const ROLE_ACCENTS: Record<User['role'], string> = {
  warehouse: '#38bdf8',
  supervisor: '#fb923c',
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

  const accent = ROLE_ACCENTS[user.role];

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

export function LoginScreen() {
  const login = useSessionStore((state) => state.login);
  const [demoUsers, setDemoUsers] = useState<User[] | null>(null);

  const [heroAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    userRepository.findAll().then(setDemoUsers);
  }, []);

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
          <View style={styles.badge}>
            <View style={styles.badgeDiamond}>
              <MaterialCommunityIcons name="flask" size={30} color="#0b1120" />
            </View>
          </View>
          <Text style={styles.title}>SUSPEL</Text>
          <Text style={styles.subtitle}>Registro de Sustancias Peligrosas</Text>
          <View style={styles.tagRow}>
            <View style={styles.tagPill}>
              <Text style={styles.tagText}>DS 43 · Chile</Text>
            </View>
          </View>
        </Animated.View>

        <View style={styles.picker}>
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
                  onPress={() => login(user)}
                />
              ))}
            </View>
          )}
        </View>

        <Text style={styles.footer}>Trazabilidad de stock · Verificaciones en terreno</Text>
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
  badge: {
    marginBottom: 16,
  },
  badgeDiamond: {
    width: 64,
    height: 64,
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
