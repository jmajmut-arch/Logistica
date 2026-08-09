import type { SiteType } from '@/types/enums';

export interface Site {
  id: number;
  name: string;
  type: SiteType;
  createdAt: number;
}

export type NewSite = Omit<Site, 'id' | 'createdAt'>;
