"use client";
import { AlertTriangle, X } from "./icons";
export default function ConfirmDialog({open,title,description,confirmLabel="Delete",busy=false,danger=true,onCancel,onConfirm}:{open:boolean;title:string;description:string;confirmLabel?:string;busy?:boolean;danger?:boolean;onCancel:()=>void;onConfirm:()=>void}){
 if(!open)return null;
 return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
  <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl">
   <div className="flex items-start gap-4"><div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${danger?"bg-rose-500/10 text-rose-500":"bg-blue-500/10 text-blue-500"}`}><AlertTriangle size={21}/></div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><h3 className="text-base font-bold">{title}</h3><button onClick={onCancel} className="icon-button" aria-label="Close"><X size={18}/></button></div><p className="mt-2 text-sm leading-6 text-[var(--muted)]">{description}</p></div></div>
   <div className="mt-6 flex justify-end gap-3"><button className="button button-secondary" onClick={onCancel} disabled={busy}>Cancel</button><button className={`button ${danger?"button-danger":"button-primary"}`} onClick={onConfirm} disabled={busy}>{busy?"Working...":confirmLabel}</button></div>
  </div>
 </div>;
}
