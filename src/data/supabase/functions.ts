import { supabase } from '@/data/supabase/client';

interface NotifyDispatchIssuePayload {
  toEmail: string;
  toName: string;
  guideNumber: string;
  siteName: string;
  issueTypeLabel: string;
  description: string;
  raisedByName: string;
}

/**
 * Envía el correo de notificación al levantar una incidencia. Nunca lanza: si falla (o si
 * el proveedor de email todavía no está configurado en el proyecto), la incidencia igual
 * queda levantada — el envío de correo no debe bloquear ese flujo.
 */
export async function notifyDispatchIssueRaised(payload: NotifyDispatchIssuePayload): Promise<void> {
  try {
    await supabase.functions.invoke('send-dispatch-issue-notification', { body: payload });
  } catch {
    // Silencioso a propósito, ver comentario arriba.
  }
}
