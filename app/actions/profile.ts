"use server";
import { auth } from "@/auth";
import { getDb } from "@/lib/mongodb";
import { z } from "zod";
import { revalidatePath } from "next/cache";
const profileSchema=z.object({name:z.string().trim().min(2,"Name must be at least 2 characters").max(80,"Name is too long"),jobTitle:z.string().trim().max(80,"Job title is too long").optional().default(""),bio:z.string().trim().max(500,"Bio is too long").optional().default("")});
export async function getProfile(){const s=await auth();if(!s?.user?.email)return{success:false};const db=await getDb();const u=await db.collection("users").findOne({email:s.user.email},{projection:{password:0}});if(!u)return{success:false};return{success:true,profile:{name:String(u.name||""),email:String(u.email),jobTitle:String(u.jobTitle||""),bio:String(u.bio||""),createdAt:u.createdAt?new Date(u.createdAt).toISOString():null}}}
export async function updateProfile(input:unknown){try{const s=await auth();if(!s?.user?.email)return{success:false,message:"You must be logged in"};const parsed=profileSchema.safeParse(input);if(!parsed.success)return{success:false,message:parsed.error.issues[0]?.message||"Invalid profile"};const db=await getDb();await db.collection("users").updateOne({email:s.user.email},{$set:{...parsed.data,updatedAt:new Date()}});revalidatePath("/profile");revalidatePath("/dashboard");return{success:true,message:"Profile updated successfully"}}catch{return{success:false,message:"Failed to update profile"}}}
