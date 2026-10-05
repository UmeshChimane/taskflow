import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function POST() {
  try {
    const db = await getDb();

    const result = await db.collection("tasks").insertOne({
      title: "My first TaskFlow task",
      description: "Testing MongoDB Atlas",
      completed: false,
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: "Task created successfully",
      id: result.insertedId,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create task",
      },
      { status: 500 }
    );
  }
}