export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { db, users, dunningTemplates } from "@recoverhub/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { DEFAULT_TEMPLATES } from "@/lib/dunning-templates";

const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as unknown;
    const parsed = signupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { email, password, name } = parsed.data;

    // Check for existing account
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Hash password (12 rounds)
    const passwordHash = await hash(password, 12);

    const [user] = await db
      .insert(users)
      .values({ email, passwordHash, name: name ?? null })
      .returning({ id: users.id, email: users.email, name: users.name });

    if (!user) {
      return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
    }

    // Seed default dunning email templates for new user (Sprint 2.1)
    try {
      await db.insert(dunningTemplates).values(
        DEFAULT_TEMPLATES.map((t) => ({
          userId: user.id,
          name: t.name,
          subject: t.subject,
          bodyHtml: t.bodyHtml,
          bodyText: t.bodyText,
          delayDays: t.delayDays,
          sequenceOrder: t.sequenceOrder,
        }))
      );
    } catch (seedErr) {
      // Non-fatal: user created, templates will be seeded on first login
      console.error("[signup] failed to seed dunning templates:", seedErr);
    }

    return NextResponse.json(
      { user: { id: user.id, email: user.email, name: user.name } },
      { status: 201 }
    );
  } catch (error) {
    console.error("[signup] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
