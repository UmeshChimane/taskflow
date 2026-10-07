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
    email: email.toLowerCase(),
  });
}

export async function createUser(
  name: string,
  email: string,
  password: string
) {
  const db = await getDb();

  const existingUser = await db.collection<User>("users").findOne({
    email: email.toLowerCase(),
  });

  if (existingUser) {
    throw new Error("User already exists");
  }

  const result = await db.collection<User>("users").insertOne({
    name,
    email: email.toLowerCase(),
    password,
    createdAt: new Date(),
  });

  return {
    id: result.insertedId.toString(),
    name,
    email: email.toLowerCase(),
  };
}

export async function getAllUsers() {
  const db = await getDb();

  return db
    .collection<User>("users")
    .find(
      {},
      {
        projection: {
          name: 1,
          email: 1,
        },
      },
    )
    .sort({ name: 1 })
    .toArray();
}