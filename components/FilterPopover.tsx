"use client";
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";

/** The native popover top layer stays outside grid flow and scroll clipping. */
export default function FilterPopover({label,summary,children}:{label:string;summary:ReactNode;children:ReactNode}){
 const id=useId(),labelId=useId();const trigger=useRef<HTMLButtonElement>(null);
 const [open,setOpen]=useState(false),[position,setPosition]=useState({top:0,left:0,width:220,maxHeight:240});
 const place=useCallback(()=>{const rect=trigger.current?.getBoundingClientRect();if(!rect)return;const width=Math.min(Math.max(rect.width,220),window.innerWidth-16);const below=window.innerHeight-rect.bottom-12;const height=Math.min(240,Math.max(below,rect.top-12,80));const top=below>=Math.min(160,height)?rect.bottom+6:Math.max(8,rect.top-height-6);setPosition({top,left:Math.max(8,Math.min(rect.left,window.innerWidth-width-8)),width,maxHeight:Math.min(height,window.innerHeight-top-8)});},[]);
 useEffect(()=>{if(!open)return;window.addEventListener("resize",place);window.addEventListener("scroll",place,true);return()=>{window.removeEventListener("resize",place);window.removeEventListener("scroll",place,true)}},[open,place]);
 return <div className="min-w-0"><span id={labelId} className="label">{label}</span><button ref={trigger} type="button" className="input h-10 flex items-center justify-between text-left" aria-labelledby={labelId} aria-expanded={open} popoverTarget={id} onClick={place}>{summary}<span aria-hidden="true">▾</span></button><div id={id} popover="auto" aria-labelledby={labelId} onToggle={event=>{const visible=event.currentTarget.matches(":popover-open");setOpen(visible);if(visible)place()}} className="fixed m-0 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] p-3 shadow-xl" style={position}>{children}</div></div>;
}
