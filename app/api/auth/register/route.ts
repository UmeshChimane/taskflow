import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createUser } from "@/lib/user";
import { registrationSchema } from "@/lib/validations/auth";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: "Enter valid registration data" }, { status: 400 });
  }
  try {
    const parsed = registrationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: parsed.error.issues[0]?.message || "Invalid registration data",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { name, email, password } = parsed.data;
    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await createUser(name, email, hashedPassword);

    return NextResponse.json(
      {
        success: true,
        message: "User registered successfully",
        user,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Error && error.message === "USER_ALREADY_EXISTS") {
      return NextResponse.json(
        {
          success: false,
          message: "An account with this email already exists",
        },
        { status: 409 },
      );
    }

    console.error("Registration failed");

    return NextResponse.json(
      {
        success: false,
        message: "Registration failed",
      },
      { status: 500 },
    );
  }
}
