import { z } from "zod";

/*
  Input schemas. Every route handler parses its body with one of these before
  touching the database. Nothing from the client is trusted as-is.
*/

/** Indian mobile in E.164. Accepts "98213 40917", "098213...", "+91 98213 40917"; normalises to +91XXXXXXXXXX. */
export const indianPhone = z
  .string()
  .transform((s) => s.replace(/[\s-]/g, ""))
  .transform((s) => (s.startsWith("+91") ? s : s.startsWith("0") ? `+91${s.slice(1)}` : s.startsWith("91") && s.length === 12 ? `+${s}` : `+91${s}`))
  .refine((s) => /^\+91[6-9]\d{9}$/.test(s), { message: "Enter a valid 10 digit Indian mobile number" });

export const otpCode = z.string().regex(/^\d{6}$/, "The code is 6 digits");

/** URL slugs used as primary keys for content. Rejects anything that could be a path or a query. */
export const slug = z.string().regex(/^[a-z0-9][a-z0-9-]{0,62}$/);

export const displayName = z.string().trim().min(1).max(60);

export const referralCode = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{4,12}$/)
  .optional()
  .or(z.literal("").transform(() => undefined));

export const lang = z.enum(["hi", "en"]);

/** Parses JSON from a request with a size cap, then validates. */
export async function parseBody<T>(req: Request, schema: z.ZodType<T>, maxBytes = 16_384): Promise<T> {
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > maxBytes) throw new ValidationError("body_too_large");
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new ValidationError("invalid_json");
  }
  const result = schema.safeParse(raw);
  if (!result.success) throw new ValidationError("invalid_input", result.error.flatten().fieldErrors);
  return result.data;
}

export class ValidationError extends Error {
  constructor(
    public code: string,
    public fields?: Record<string, string[] | undefined>
  ) {
    super(code);
  }
  toResponse(): Response {
    return Response.json({ error: this.code, fields: this.fields }, { status: 400 });
  }
}
