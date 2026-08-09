export interface LoadArrival {
  id: number;
  planItemId: number;
  arrivedAt: number;
  location: string;
  registeredBy: number;
  notes: string | null;
  createdAt: number;
}

export type NewLoadArrival = Omit<LoadArrival, 'id' | 'createdAt'>;
