import { z } from "zod";
export const workspaceSchema=z.object({name:z.string().trim().min(2,"Workspace name must be at least 2 characters").max(80,"Workspace name is too long"),description:z.string().trim().max(300,"Description is too long").optional().default("")});
