import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email().max(190),
  password: z.string().min(8).max(200)
});

export const contentSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  type: z.enum(['post', 'product', 'shelter', 'faq', 'page']),
  slug: z.string().trim().min(1).max(190).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  status: z.enum(['draft', 'published', 'scheduled', 'archived']).default('draft'),
  title: z.string().trim().min(1).max(255),
  summary: z.string().max(10000).default(''),
  data: z.record(z.string(), z.unknown()).default({}),
  sortOrder: z.coerce.number().int().min(0).max(100000).default(0),
  publishedAt: z.union([z.iso.datetime(), z.literal(''), z.null()]).optional()
}).superRefine((value, ctx) => {
  if (value.status === 'scheduled' && !value.publishedAt) {
    ctx.addIssue({ code: 'custom', path: ['publishedAt'], message: 'La fecha es obligatoria para programar.' });
  }
});

export const userSchema = z.object({
  email: z.email().max(190),
  name: z.string().trim().min(2).max(120),
  role: z.enum(['admin', 'editor']),
  password: z.string().min(12).max(200)
});

export function parse(schema, value) {
  const result = schema.safeParse(value);
  if (!result.success) {
    const error = new Error('Datos inválidos');
    error.status = 422;
    error.details = result.error.flatten();
    throw error;
  }
  return result.data;
}
