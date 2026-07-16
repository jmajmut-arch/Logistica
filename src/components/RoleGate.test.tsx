import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { RoleGate } from '@/components/RoleGate';
import { useSessionStore } from '@/store/sessionStore';
import type { Role } from '@/types/enums';

function setRole(role: Role | null) {
  useSessionStore.setState({
    currentUser: role ? { id: 1, name: 'Test User', role } : null,
  });
}

afterEach(() => {
  setRole(null);
});

describe('RoleGate', () => {
  it('renders children when the active role has the permission', async () => {
    setRole('hse');
    await render(
      <RoleGate permission="configureRules">
        <Text>Editar reglas</Text>
      </RoleGate>,
    );
    expect(screen.getByText('Editar reglas')).toBeTruthy();
  });

  it('renders nothing when the active role lacks the permission', async () => {
    setRole('warehouse');
    await render(
      <RoleGate permission="configureRules">
        <Text>Editar reglas</Text>
      </RoleGate>,
    );
    expect(screen.queryByText('Editar reglas')).toBeNull();
  });

  it('renders the fallback when provided and the permission is missing', async () => {
    setRole('supervisor');
    await render(
      <RoleGate permission="configureRules" fallback={<Text>Solo lectura</Text>}>
        <Text>Editar reglas</Text>
      </RoleGate>,
    );
    expect(screen.getByText('Solo lectura')).toBeTruthy();
    expect(screen.queryByText('Editar reglas')).toBeNull();
  });

  it('renders nothing when there is no active session', async () => {
    setRole(null);
    await render(
      <RoleGate permission="manageSubstances">
        <Text>Registrar sustancia</Text>
      </RoleGate>,
    );
    expect(screen.queryByText('Registrar sustancia')).toBeNull();
  });
});
