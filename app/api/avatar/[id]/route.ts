import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getDb } from "@/lib/mongodb";
export const dynamic="force-dynamic";
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 const session=await auth();if(!session?.user?.email)return new Response(null,{status:401});
 const {id}=await params;if(!ObjectId.isValid(id))return new Response(null,{status:404});
 const db=await getDb();const user=await db.collection("users").findOne({_id:new ObjectId(id)},{projection:{email:1,avatar:1}});
 if(!user?.avatar)return new Response(null,{status:404});
 if(user.email!==session.user.email){
  const shared=await db.collection("workspaces").findOne({$and:[{"members.email":session.user.email},{"members.email":user.email}]},{projection:{_id:1}});
  if(!shared)return new Response(null,{status:404});
 }
 const data=Buffer.isBuffer(user.avatar)?user.avatar:Buffer.from(user.avatar.buffer);
 return new Response(new Uint8Array(data),{headers:{"Content-Type":"image/jpeg","Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
}
