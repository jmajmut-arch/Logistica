import { supabase } from '@/data/supabase/client';
import { rowToCamelCase, rowsToCamelCase } from '@/data/supabase/caseMapping';
import type { User } from '@/domain/entities/User';

export const userRepository = {
  async findAll(): Promise<User[]> {
    const { data, error } = await supabase.from('users').select('*');
    if (error) throw error;
    return rowsToCamelCase<User>(data);
  },

  async findById(id: number): Promise<User | undefined> {
    const { data, error } = await supabase.from('users').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? rowToCamelCase<User>(data) : undefined;
  },
};
