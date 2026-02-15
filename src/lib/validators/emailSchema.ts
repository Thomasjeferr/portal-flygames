import { z } from 'zod';

export const emailSettingsSchema = z.object({
  from_name: z.string().min(1, 'Nome obrigatório'),
  from_email: z.string().email('E-mail inválido'),
  reply_to: z.string().email().optional().or(z.literal('')),
  brand_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().default('#22c55e'),
  logo_url: z.string().url().optional().or(z.literal('')),
  support_email: z.string().email().optional().or(z.literal('')),
  whatsapp_url: z.string().url().optional().or(z.literal('')),
  footer_text: z.string().optional(),
  app_base_url: z.string().url().optional().or(z.literal('')),
});

export const emailTemplateSchema = z.object({
  subject: z.string().min(1, 'Assunto obrigatório'),
  html_body: z.string().min(1, 'Corpo HTML obrigatório'),
  is_active: z.boolean().default(true),
});

export const sendTestEmailSchema = z.object({
  to: z.string().email('E-mail inválido'),
  template_key: z.enum(['WELCOME', 'VERIFY_EMAIL', 'RESET_PASSWORD', 'PASSWORD_CHANGED']).optional(),
});
