export interface Carrier {
  id: number;
  name: string;
  createdAt: number;
}

export type NewCarrier = Omit<Carrier, 'id' | 'createdAt'>;
