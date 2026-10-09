import { z } from "zod";
export const workspaceSchema=z.object({name:z.string().trim().min(2,"Workspace name must be at least 2 characters").max(80,"Workspace name is too long"),description:z.string().trim().max(300,"Description is too long").optional().default("")});

export const memberEmailSchema=z.string().trim().email("Enter a valid member email").max(254,"Email is too long").transform(value=>value.toLowerCase());
export const joinCodeSchema=z.string().trim().regex(/^[A-Za-z0-9]{6}$/,"Enter a valid 6-character workspace code").transform(value=>value.toUpperCase());
