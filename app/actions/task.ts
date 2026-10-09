"use server";
import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getDb } from "@/lib/mongodb";
import { taskSchema,commentSchema } from "@/lib/validations/task";
import { getWorkspaceUsers } from "@/app/actions/workspace";
import { serializeTask, savedFilterSchema, filterSchema, statuses as statusOrder, type SavedFilter, type Task } from "@/lib/task-views";
import { findAccessibleTask, taskAccessFilter } from "@/lib/task-access";
type Status=typeof statusOrder[number];
async function workspaceFor(db:any,id:string,email:string){if(!ObjectId.isValid(id))return null;return db.collection("workspaces").findOne({_id:new ObjectId(id),"members.email":email});}
async function validateAssignees(db:any,workspaceId:string,assignees:string[]){const normalized=Array.from(new Set(assignees.map(e=>e.trim().toLowerCase()).filter(Boolean)));if(!normalized.length)return{success:true as const,assignees:[] as string[]};const w=await db.collection("workspaces").findOne({_id:new ObjectId(workspaceId),"members.email":{$in:normalized}});if(!w)return{success:false as const,message:"One or more assignees are not members of this workspace"};const members=new Set((w.members||[]).map((m:any)=>m.email));const invalid=normalized.filter(e=>!members.has(e));if(invalid.length)return{success:false as const,message:"One or more assignees are not members of this workspace"};return{success:true as const,assignees:normalized};}
async function notify(db:any,userEmail:string,title:string,message:string,href:string){await db.collection("notifications").insertOne({userEmail,title,message,href,type:"task",read:false,createdAt:new Date()})}
export async function createTask(input:unknown){try{const s=await auth();if(!s?.user?.email)return{success:false,message:"You must be logged in"};const p=taskSchema.safeParse(input);if(!p.success)return{success:false,message:p.error.issues[0]?.message||"Invalid task data",errors:p.error.flatten().fieldErrors};const workspaceId=String((input as any)?.workspaceId||"");if(!ObjectId.isValid(workspaceId))return{success:false,message:"Choose a valid workspace"};const db=await getDb();const w=await workspaceFor(db,workspaceId,s.user.email);if(!w)return{success:false,message:"You are not a member of this workspace"};const av=await validateAssignees(db,workspaceId,p.data.assignees);if(!av.success)return av;const tags=Array.from(new Set(p.data.tags.map(x=>x.trim()).filter(Boolean)));const now=new Date();const task={...p.data,startDate:p.data.startDate||null,workspaceId:new ObjectId(workspaceId),assignees:av.assignees,tags,createdBy:s.user.email,createdAt:now,updatedAt:now};const r=await db.collection("tasks").insertOne(task);for(const email of av.assignees){if(email!==s.user.email)await notify(db,email,"New task assigned",`${s.user.name||s.user.email} assigned you “${p.data.title}” in ${w.name}.`,`/tasks/${r.insertedId}`)}revalidatePath(`/workspaces/${workspaceId}`);revalidatePath("/my-tasks");revalidatePath("/tasks");revalidatePath("/dashboard");return{success:true,message:"Task created successfully",taskId:r.insertedId.toString()}}catch(e){console.error(e);return{success:false,message:"Failed to create task"}}}
export async function updateTask(taskId:string,input:unknown){try{const s=await auth();if(!s?.user?.email||!ObjectId.isValid(taskId))return{success:false,message:"Invalid request"};let p=taskSchema.safeParse(input);if(!p.success)return{success:false,message:p.error.issues[0]?.message||"Invalid task data"};const db=await getDb();const current=await findAccessibleTask(db,taskId,s.user.email,true);if(!current)return{success:false,message:"Task not found or you are not the owner"};p=taskSchema.safeParse({...p.data,startDate:p.data.startDate===undefined?(current.startDate||null):p.data.startDate});if(!p.success)return{success:false,message:p.error.issues[0]?.message||"Invalid schedule"};const workspaceId=String((input as any)?.workspaceId||current.workspaceId?.toString()||"");const w=await workspaceFor(db,workspaceId,s.user.email);if(!w)return{success:false,message:"You are not a member of this workspace"};const currentStatus=(current.status||"todo") as Status;const nextStatus=p.data.status as Status;if(currentStatus!==nextStatus&&Math.abs(statusOrder.indexOf(currentStatus)-statusOrder.indexOf(nextStatus))!==1)return{success:false,message:"Tasks must move one stage at a time: To Do → In Progress → Completed"};const av=await validateAssignees(db,workspaceId,p.data.assignees);if(!av.success)return av;const old=new Set(Array.isArray(current.assignees)?current.assignees:(current.assignee?[current.assignee]:[]));const now=new Date();const changed=await db.collection("tasks").updateOne({_id:new ObjectId(taskId),createdBy:s.user.email,workspaceId:current.workspaceId,status:current.status??null},{$set:{...p.data,workspaceId:new ObjectId(workspaceId),assignees:av.assignees,tags:Array.from(new Set(p.data.tags.map(x=>x.trim()).filter(Boolean))),updatedAt:now},$unset:{assignee:""}});if(!changed.matchedCount)return{success:false,message:"Task changed or you no longer have access"};for(const email of av.assignees){if(!old.has(email)&&email!==s.user.email)await notify(db,email,"Task assigned to you",`${s.user.name||s.user.email} assigned you “${p.data.title}”.`,`/tasks/${taskId}`)}revalidatePath(`/tasks/${taskId}`);revalidatePath(`/workspaces/${current.workspaceId}`);revalidatePath("/dashboard");revalidatePath(`/workspaces/${workspaceId}`);revalidatePath("/my-tasks");revalidatePath("/tasks");return{success:true,message:"Task updated successfully"}}catch(e){console.error(e);return{success:false,message:"Failed to update task"}}}
export async function updateTaskStatus(taskId:string,status:Status){try{const s=await auth();if(!s?.user?.email||!ObjectId.isValid(taskId))return{success:false,message:"Invalid request"};if(!statusOrder.includes(status))return{success:false,message:"Invalid status"};const db=await getDb();const task=await findAccessibleTask(db,taskId,s.user.email);if(!task)return{success:false,message:"You do not have access to this task"};const current=(task.status||"todo") as Status;const from=statusOrder.indexOf(current),to=statusOrder.indexOf(status);if(Math.abs(from-to)!==1)return{success:false,message:"Tasks must move one stage at a time: To Do → In Progress → Completed"};const changed=await db.collection("tasks").updateOne({...taskAccessFilter(taskId,s.user.email),workspaceId:task.workspaceId,status:task.status??null},{$set:{status,updatedAt:new Date()}});if(!changed.matchedCount)return{success:false,message:"Task changed or you no longer have access"};revalidatePath(`/workspaces/${task.workspaceId}`);revalidatePath("/dashboard");revalidatePath("/my-tasks");revalidatePath("/tasks");return{success:true,message:"Status updated"}}catch{return{success:false,message:"Failed to update status"}}}
export async function deleteTask(taskId:string){try{const s=await auth();if(!s?.user?.email||!ObjectId.isValid(taskId))return{success:false,message:"Invalid request"};const db=await getDb();const task=await findAccessibleTask(db,taskId,s.user.email,true);if(!task)return{success:false,message:"Task not found or you do not have access"};const oid=task._id;const r=await db.collection("tasks").deleteOne({_id:oid,createdBy:s.user.email,workspaceId:task.workspaceId});if(!r.deletedCount)return{success:false,message:"Task not found or you are not the owner"};await db.collection("comments").deleteMany({taskId:oid});revalidatePath("/dashboard");revalidatePath("/my-tasks");revalidatePath("/tasks");return{success:true,message:"Task deleted successfully"}}catch{return{success:false,message:"Failed to delete task"}}}
export async function createComment(taskId:string,content:string){try{const s=await auth();if(!s?.user?.email||!ObjectId.isValid(taskId))return{success:false,message:"Invalid request"};const parsed=commentSchema.safeParse(content);if(!parsed.success)return{success:false,message:parsed.error.issues[0].message};const c=parsed.data;const db=await getDb();const t=await findAccessibleTask(db,taskId,s.user.email);if(!t)return{success:false,message:"You do not have access to this task"};await db.collection("comments").insertOne({taskId:new ObjectId(taskId),content:c,createdBy:s.user.email,createdAt:new Date()});revalidatePath(`/tasks/${taskId}`);return{success:true,message:"Comment added"}}catch{return{success:false,message:"Failed to add comment"}}}
export async function deleteComment(commentId:string){try{const s=await auth();if(!s?.user?.email||!ObjectId.isValid(commentId))return{success:false,message:"Invalid request"};const db=await getDb();const comment=await db.collection("comments").findOne({_id:new ObjectId(commentId),createdBy:s.user.email});if(!comment||!await findAccessibleTask(db,String(comment.taskId),s.user.email))return{success:false,message:"Comment not found or you do not have access"};const r=await db.collection("comments").deleteOne({_id:comment._id,createdBy:s.user.email});if(r.deletedCount){revalidatePath(`/tasks/${comment.taskId}`);revalidatePath("/dashboard")};return{success:r.deletedCount>0,message:r.deletedCount?"Comment deleted":"Comment not found"}}catch{return{success:false,message:"Failed to delete comment"}}}
export async function getUsersForAssignment(workspaceId?:string){
 if(!workspaceId||!ObjectId.isValid(workspaceId))return{success:false,users:[]};
 return getWorkspaceUsers(workspaceId);
}
export async function getMyTasks(){
 const result=await getTaskViews(true);
 return result.success?{success:true as const,tasks:result.tasks}:{success:false as const,tasks:[] as Task[]};
}

export async function getTaskViews(assignedOnly=false){
 try{
  const session=await auth();
  const email=session?.user?.email;
  if(!email||typeof assignedOnly!=="boolean")return{success:false as const,message:"You must be logged in"};
  const db=await getDb();
  const workspaces=await db.collection("workspaces").find({"members.email":email}).sort({name:1}).toArray();
  const workspaceIds=workspaces.map(w=>w._id);
  const tasks=await db.collection("tasks").find({workspaceId:{$in:workspaceIds},...(assignedOnly?{$or:[{assignees:email},{assignee:email}]}:{})}).sort({createdAt:-1}).toArray();
  const names=new Map(workspaces.map(w=>[String(w._id),String(w.name)]));
  const memberEmails=[...new Set(workspaces.flatMap(w=>(w.members||[]).map((m:{email:string})=>m.email)))];
  const members=await db.collection("users").find({email:{$in:memberEmails}},{projection:{name:1,email:1,_id:0}}).sort({name:1}).toArray();
  return{success:true as const,tasks:tasks.map(t=>serializeTask(t,email,names.get(String(t.workspaceId))||"Workspace")),workspaces:workspaces.map(w=>({id:String(w._id),name:String(w.name)})),members:members.map(m=>({email:String(m.email),name:String(m.name||m.email)}))};
 }catch{return{success:false as const,message:"Could not load tasks. Please try again."}}
}

export async function getSavedTaskFilters(){
 try{
  const session=await auth();if(!session?.user?.email)return{success:false as const,filters:[] as SavedFilter[],message:"You must be logged in"};
  const db=await getDb();
  const records=await db.collection("taskFilters").find({userEmail:session.user.email}).sort({favorite:-1,createdAt:-1}).toArray();
  const filters:SavedFilter[]=records.flatMap(record=>{const parsed=filterSchema.safeParse(record.filter);return parsed.success?[{id:String(record._id),name:String(record.name),favorite:Boolean(record.favorite),filter:parsed.data}]:[]});
  return{success:true as const,filters};
 }catch{return{success:false as const,filters:[] as SavedFilter[],message:"Could not load saved filters"}}
}

export async function saveTaskFilter(input:unknown){
 try{
  const session=await auth();if(!session?.user?.email)return{success:false,message:"You must be logged in"};
  const parsed=savedFilterSchema.safeParse(input);if(!parsed.success)return{success:false,message:parsed.error.issues[0].message};
  const db=await getDb();
  const result=await db.collection("taskFilters").insertOne({...parsed.data,userEmail:session.user.email,favorite:false,createdAt:new Date()});
  return{success:true,message:"Filter saved",id:String(result.insertedId)};
 }catch{return{success:false,message:"Could not save filter"}}
}

export async function favoriteTaskFilter(id:string,favorite:boolean){
 try{
  const session=await auth();if(!session?.user?.email||!ObjectId.isValid(id)||typeof favorite!=="boolean")return{success:false,message:"Invalid request"};
  const db=await getDb();
  const result=await db.collection("taskFilters").updateOne({_id:new ObjectId(id),userEmail:session.user.email},{$set:{favorite}});
  return{success:result.matchedCount>0,message:result.matchedCount?"Favorite updated":"Filter not found"};
 }catch{return{success:false,message:"Could not update favorite"}}
}

export async function deleteTaskFilter(id:string){
 try{
  const session=await auth();if(!session?.user?.email||!ObjectId.isValid(id))return{success:false,message:"Invalid request"};
  const db=await getDb();
  const result=await db.collection("taskFilters").deleteOne({_id:new ObjectId(id),userEmail:session.user.email});
  return{success:result.deletedCount>0,message:result.deletedCount?"Filter deleted":"Filter not found"};
 }catch{return{success:false,message:"Could not delete filter"}}
}
