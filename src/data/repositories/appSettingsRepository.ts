import { rowToCamelCase } from '@/data/supabase/caseMapping';
import { supabase } from '@/data/supabase/client';
import type { AppSettings } from '@/domain/entities/AppSettings';
import type { ThemeId } from '@/theme';

export const appSettingsRepository = {
  async get(): Promise<AppSettings> {
    const { data, error } = await supabase.from('app_settings').select('*').eq('id', 1).single();
    if (error) throw error;
    return rowToCamelCase<AppSettings>(data);
  },

  async setThemeId(themeId: ThemeId): Promise<void> {
    const { error } = await supabase
      .from('app_settings')
      .update({ theme_id: themeId, updated_at: Date.now() })
      .eq('id', 1);
    if (error) throw error;
  },
};
