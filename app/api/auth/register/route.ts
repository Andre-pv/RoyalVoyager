import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

// ─── Password Validation ──────────────────────────────────────────────────────
function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter.' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter.' };
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one special character (e.g. !@#$%^&*).' };
  }
  return { valid: true };
}

// ─── POST /api/auth/register ──────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { firstName, lastName, dob, email, mobile, password } = body;

    // ── Required field check ──────────────────────────────────────────────────
    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json(
        { error: 'First name, last name, email, and password are required.' },
        { status: 400 }
      );
    }

    // ── Password strength validation ──────────────────────────────────────────
    const pwCheck = validatePassword(password);
    if (!pwCheck.valid) {
      return NextResponse.json({ error: pwCheck.error }, { status: 400 });
    }

    // ── Email format check ────────────────────────────────────────────────────
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Please provide a valid email address.' }, { status: 400 });
    }

    // ── Duplicate email check ─────────────────────────────────────────────────
    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists.' },
        { status: 409 }
      );
    }

    // ── Hash password (12 rounds) ─────────────────────────────────────────────
    const hashedPassword = await bcrypt.hash(password, 12);

    // ── Create user ───────────────────────────────────────────────────────────
    const user = await prisma.user.create({
      data: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dob: dob ?? null,
        email: email.toLowerCase().trim(),
        mobile: mobile ?? null,
        password: hashedPassword,
        role: 'user',
        preferences: '{}',
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      { message: 'Account created successfully.', user },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('[REGISTER ERROR]', err);
    return NextResponse.json(
      { error: 'Internal server error. Please try again.' },
      { status: 500 }
    );
  }
}
