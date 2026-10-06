"use server";

import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getDb } from "@/lib/mongodb";
import { taskSchema } from "@/lib/validations/task";

export async function createTask(input: unknown) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return {
        success: false,
        message: "You must be logged in",
      };
    }

    const validatedData = taskSchema.safeParse(input);

    if (!validatedData.success) {
      return {
        success: false,
        message: "Invalid task data",
        errors: validatedData.error.flatten().fieldErrors,
      };
    }

    const db = await getDb();

    const task = {
      ...validatedData.data,
      createdBy: session.user.email,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("tasks").insertOne(task);

    revalidatePath("/dashboard");

    return {
      success: true,
      message: "Task created successfully",
      taskId: result.insertedId.toString(),
    };
  } catch (error) {
    console.error("Create task error:", error);

    return {
      success: false,
      message: "Failed to create task",
    };
  }
}

export async function updateTask(
  taskId: string,
  input: unknown
) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return {
        success: false,
        message: "You must be logged in",
      };
    }

    if (!ObjectId.isValid(taskId)) {
      return {
        success: false,
        message: "Invalid task ID",
      };
    }

    const validatedData = taskSchema.safeParse(input);

    if (!validatedData.success) {
      return {
        success: false,
        message: "Invalid task data",
        errors: validatedData.error.flatten().fieldErrors,
      };
    }

    const db = await getDb();

    const result = await db.collection("tasks").updateOne(
      {
        _id: new ObjectId(taskId),
        createdBy: session.user.email,
      },
      {
        $set: {
          ...validatedData.data,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return {
        success: false,
        message: "Task not found",
      };
    }

    revalidatePath("/dashboard");
    revalidatePath(`/tasks/${taskId}`);

    return {
      success: true,
      message: "Task updated successfully",
    };
  } catch (error) {
    console.error("Update task error:", error);

    return {
      success: false,
      message: "Failed to update task",
    };
  }
}

export async function deleteTask(taskId: string) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return {
        success: false,
        message: "You must be logged in",
      };
    }

    if (!ObjectId.isValid(taskId)) {
      return {
        success: false,
        message: "Invalid task ID",
      };
    }

    const db = await getDb();

    const result = await db.collection("tasks").deleteOne({
      _id: new ObjectId(taskId),
      createdBy: session.user.email,
    });

    if (result.deletedCount === 0) {
      return {
        success: false,
        message: "Task not found",
      };
    }

    revalidatePath("/dashboard");

    return {
      success: true,
      message: "Task deleted successfully",
    };
  } catch (error) {
    console.error("Delete task error:", error);

    return {
      success: false,
      message: "Failed to delete task",
    };
  }
}

export async function createComment(
  taskId: string,
  content: string,
) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return {
        success: false,
        message: "You must be logged in",
      };
    }

    if (!ObjectId.isValid(taskId)) {
      return {
        success: false,
        message: "Invalid task ID",
      };
    }

    const trimmedContent = content.trim();

    if (!trimmedContent) {
      return {
        success: false,
        message: "Comment cannot be empty",
      };
    }

    if (trimmedContent.length > 1000) {
      return {
        success: false,
        message: "Comment is too long",
      };
    }

    const db = await getDb();

    const task = await db.collection("tasks").findOne({
      _id: new ObjectId(taskId),
      createdBy: session.user.email,
    });

    if (!task) {
      return {
        success: false,
        message: "Task not found",
      };
    }

    await db.collection("comments").insertOne({
      taskId: new ObjectId(taskId),
      content: trimmedContent,
      createdBy: session.user.email,
      createdAt: new Date(),
    });

    revalidatePath(`/tasks/${taskId}`);

    return {
      success: true,
      message: "Comment added successfully",
    };
  } catch (error) {
    console.error("Create comment error:", error);

    return {
      success: false,
      message: "Failed to add comment",
    };
  }
}

export async function deleteComment(commentId: string) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return {
        success: false,
        message: "You must be logged in",
      };
    }

    if (!ObjectId.isValid(commentId)) {
      return {
        success: false,
        message: "Invalid comment ID",
      };
    }

    const db = await getDb();

    const result = await db.collection("comments").deleteOne({
      _id: new ObjectId(commentId),
      createdBy: session.user.email,
    });

    if (result.deletedCount === 0) {
      return {
        success: false,
        message: "Comment not found",
      };
    }

    return {
      success: true,
      message: "Comment deleted successfully",
    };
  } catch (error) {
    console.error("Delete comment error:", error);

    return {
      success: false,
      message: "Failed to delete comment",
    };
  }
}