"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell } from "./icons";
import { getUnreadNotificationCount } from "@/app/actions/notification";
export default function NotificationBell(){const [count,setCount]=useState(0); useEffect(()=>{let active=true; getUnreadNotificationCount().then(r=>{if(active&&r.success)setCount(r.count)}); const id=setInterval(()=>getUnreadNotificationCount().then(r=>{if(active&&r.success)setCount(r.count)}),30000); return()=>{active=false;clearInterval(id)}},[]); return <Link href="/notifications" className="notification-button" aria-label="Notifications"><Bell size={19}/>{count>0&&<span className="notification-badge">{count>99?"99+":count}</span>}</Link>}
