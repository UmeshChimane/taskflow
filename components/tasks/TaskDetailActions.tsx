"use client";
import { useRouter } from "next/navigation";
import TaskActions from "./TaskActions";
export default function TaskDetailActions({task}:{task:any}){const router=useRouter();return <TaskActions task={task} onDone={()=>router.refresh()} afterDelete={()=>router.push(task.workspaceId?`/workspaces/${task.workspaceId}`:"/dashboard")}/>}
