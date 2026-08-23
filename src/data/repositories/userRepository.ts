import { objectToSnakeCase, rowToCamelCase, rowsToCamelCase } from '@/data/supabase/caseMapping';
import { supabase } from '@/data/supabase/client';
import type { NewUser, User } from '@/domain/entities/User';

export const userRepository = {
  async findAll(): Promise<User[]> {
    const { data, error } = await supabase.from('users').select('*').order('name', { ascending: true });
    if (error) throw error;
    return rowsToCamelCase<User>(data);
  },

  async findById(id: number): Promise<User | undefined> {
    const { data, error } = await supabase.from('users').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? rowToCamelCase<User>(data) : undefined;
  },

  async create(input: NewUser): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .insert(objectToSnakeCase(input))
      .select()
      .single();
    if (error) throw error;
    return rowToCamelCase<User>(data);
  },

  async update(id: number, input: NewUser): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .update(objectToSnakeCase(input))
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return rowToCamelCase<User>(data);
  },

  async delete(id: number): Promise<void> {
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) throw error;
  },
};
