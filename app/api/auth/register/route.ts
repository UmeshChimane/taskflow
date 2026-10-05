import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createUser } from "@/lib/user";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { name, email, password } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Name, email and password are required",
        },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        {
          success: false,
          message: "Password must be at least 6 characters",
        },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await createUser(
      name,
      email,
      hashedPassword
    );

    return NextResponse.json(
      {
        success: true,
        message: "User registered successfully",
        user,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Registration failed";

    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status: 500 }
    );
  }
}