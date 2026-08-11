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
    setRole('admin');
    await render(
      <RoleGate permission="managePlan">
        <Text>Editar plan</Text>
      </RoleGate>,
    );
    expect(screen.getByText('Editar plan')).toBeTruthy();
  });

  it('renders nothing when the active role lacks the permission', async () => {
    setRole('operator');
    await render(
      <RoleGate permission="managePlan">
        <Text>Editar plan</Text>
      </RoleGate>,
    );
    expect(screen.queryByText('Editar plan')).toBeNull();
  });

  it('renders the fallback when provided and the permission is missing', async () => {
    setRole('operator');
    await render(
      <RoleGate permission="managePlan" fallback={<Text>Solo lectura</Text>}>
        <Text>Editar plan</Text>
      </RoleGate>,
    );
    expect(screen.getByText('Solo lectura')).toBeTruthy();
    expect(screen.queryByText('Editar plan')).toBeNull();
  });

  it('renders nothing when there is no active session', async () => {
    setRole(null);
    await render(
      <RoleGate permission="registerArrivals">
        <Text>Registrar llegada</Text>
      </RoleGate>,
    );
    expect(screen.queryByText('Registrar llegada')).toBeNull();
  });
});
