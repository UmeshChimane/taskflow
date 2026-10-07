import { getDb } from "./mongodb";

export interface User {
  _id?: string;
  name: string;
  email: string;
  password: string;
  createdAt: Date;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();

  return db.collection<User>("users").findOne({
    email: email.trim().toLowerCase(),
  });
}

export async function createUser(
  name: string,
  email: string,
  password: string,
) {
  const db = await getDb();
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedName = name.trim();

  const existingUser = await db.collection<User>("users").findOne({
    email: normalizedEmail,
  });

  if (existingUser) {
    throw new Error("USER_ALREADY_EXISTS");
  }

  try {
    const result = await db.collection<User>("users").insertOne({
      name: normalizedName,
      email: normalizedEmail,
      password,
      createdAt: new Date(),
    });

    return {
      id: result.insertedId.toString(),
      name: normalizedName,
      email: normalizedEmail,
    };
  } catch (error) {
    // If a unique email index exists, translate a duplicate-key error into
    // the same safe application-level error used by the pre-check above.
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === 11000
    ) {
      throw new Error("USER_ALREADY_EXISTS");
    }

    throw error;
  }
}

export async function getAllUsers() {
  const db = await getDb();

  return db
    .collection<User>("users")
    .find(
      {},
      {
        projection: {
          _id: 0,
          name: 1,
          email: 1,
        },
      },
    )
    .sort({ name: 1 })
    .toArray();
}
