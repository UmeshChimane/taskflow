"use server";
import { auth } from "@/auth";
import { getDb } from "@/lib/mongodb";
import { profileSchema } from "@/lib/validations/profile";
import { revalidatePath } from "next/cache";
import sharp from "sharp";

export async function getProfile(){
 const session=await auth();if(!session?.user?.email)return{success:false as const};
 const db=await getDb();const user=await db.collection("users").findOne({email:session.user.email},{projection:{name:1,email:1,jobTitle:1,bio:1,createdAt:1,avatarUpdatedAt:1}});
 if(!user)return{success:false as const};
 return{success:true as const,profile:{name:String(user.name||""),email:String(user.email),jobTitle:String(user.jobTitle||""),bio:String(user.bio||""),createdAt:user.createdAt?new Date(user.createdAt).toISOString():null,image:user.avatarUpdatedAt?`/api/avatar/${user._id}?v=${new Date(user.avatarUpdatedAt).getTime()}`:null}};
}
export async function updateProfile(input:unknown){
 try{
  const session=await auth();if(!session?.user?.email)return{success:false,message:"You must be logged in"};
  const parsed=profileSchema.safeParse(input);if(!parsed.success)return{success:false,message:parsed.error.issues[0]?.message||"Invalid profile"};
  const db=await getDb();const result=await db.collection("users").updateOne({email:session.user.email},{$set:{...parsed.data,updatedAt:new Date()}});
  if(!result.matchedCount)return{success:false,message:"Account not found"};
  revalidatePath("/", "layout");return{success:true,message:"Profile updated successfully"};
 }catch{return{success:false,message:"Failed to update profile"}}
}
export async function updateAvatar(form:FormData){
 try{
  const session=await auth();if(!session?.user?.email)return{success:false,message:"You must be logged in"};
  const file=form.get("avatar");
  if(!(file instanceof File)||!file.size)return{success:false,message:"Choose a photo"};
  if(file.size>512*1024)return{success:false,message:"Photo must be 512 KB or smaller"};
  if(!["image/jpeg","image/png","image/webp"].includes(file.type))return{success:false,message:"Choose a PNG, JPEG, or WebP photo"};
  const decoder=sharp(Buffer.from(await file.arrayBuffer()),{limitInputPixels:16_777_216,animated:false});
  const metadata=await decoder.metadata();
  if(!["jpeg","png","webp"].includes(metadata.format||""))return{success:false,message:"Invalid photo format"};
  const data=await decoder.rotate().resize(128,128,{fit:"cover"}).jpeg({quality:85}).toBuffer();
  const db=await getDb();const result=await db.collection("users").updateOne({email:session.user.email},{$set:{avatar:data,avatarUpdatedAt:new Date()}});
  if(!result.matchedCount)return{success:false,message:"Account not found"};
  revalidatePath("/", "layout");return{success:true,message:"Profile photo updated"};
 }catch{return{success:false,message:"Could not process the photo. Choose a valid image and try again."}}
}
export async function removeAvatar(){
 try{
  const session=await auth();if(!session?.user?.email)return{success:false,message:"You must be logged in"};
  const db=await getDb();const result=await db.collection("users").updateOne({email:session.user.email},{$unset:{avatar:"",avatarUpdatedAt:""}});
  if(!result.matchedCount)return{success:false,message:"Account not found"};
  revalidatePath("/", "layout");return{success:true,message:"Profile photo removed"};
 }catch{return{success:false,message:"Could not remove the photo"}}
}
