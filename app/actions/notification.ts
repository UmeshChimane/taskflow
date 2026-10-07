"use server";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getDb } from "@/lib/mongodb";
export async function getUnreadNotificationCount(){try{const s=await auth();if(!s?.user?.email)return{success:false,count:0};const db=await getDb();const count=await db.collection("notifications").countDocuments({userEmail:s.user.email,read:false});return{success:true,count}}catch{return{success:false,count:0}}}
export async function getNotifications(){try{const s=await auth();if(!s?.user?.email)return{success:false,notifications:[]};const db=await getDb();const items=await db.collection("notifications").find({userEmail:s.user.email}).sort({createdAt:-1}).limit(50).toArray();return{success:true,notifications:items.map(n=>({id:n._id.toString(),title:n.title,message:n.message,type:n.type||"info",read:Boolean(n.read),createdAt:new Date(n.createdAt).toISOString(),href:n.href||null}))}}catch{return{success:false,notifications:[]}}}
export async function markNotificationRead(id:string){try{const s=await auth();if(!s?.user?.email||!ObjectId.isValid(id))return{success:false};const db=await getDb();await db.collection("notifications").updateOne({_id:new ObjectId(id),userEmail:s.user.email},{$set:{read:true}});return{success:true}}catch{return{success:false}}}
export async function markAllNotificationsRead(){try{const s=await auth();if(!s?.user?.email)return{success:false};const db=await getDb();await db.collection("notifications").updateMany({userEmail:s.user.email,read:false},{$set:{read:true}});return{success:true}}catch{return{success:false}}}
