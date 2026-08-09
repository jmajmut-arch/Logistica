export interface LoadArrival {
  id: number;
  siteId: number;
  arrivedAt: number;
  planItemId: number | null;
  registeredBy: number;
  createdAt: number;
}

export type NewLoadArrival = Omit<LoadArrival, 'id' | 'createdAt'>;
