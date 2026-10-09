"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Native modal dialogs provide focus containment, background inertness, and Escape support. */
export default function Modal({ label, onClose, busy = false, children }: { label: string; onClose: () => void; busy?: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog?.showModal();
    return () => { dialog?.close(); if (previous?.isConnected) previous.focus(); };
  }, []);
  return <dialog ref={ref} className="accessible-dialog" aria-label={label} aria-busy={busy} onCancel={event => { event.preventDefault(); if (!busy) onClose(); }} onKeyDown={event=>{
    if(event.key!=="Tab")return;
    const dialog=ref.current;if(!dialog)return;
    const controls=Array.from(dialog.querySelectorAll<HTMLElement>("a[href],button,input,select,textarea,[tabindex]")).filter(control=>control.tabIndex>=0&&!control.matches(":disabled")&&control.getClientRects().length>0);
    const first=controls[0],last=controls[controls.length-1];
    if(!first){event.preventDefault();dialog.focus();return;}
    if(event.shiftKey&&(document.activeElement===first||document.activeElement===dialog)){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&(document.activeElement===last||document.activeElement===dialog)){event.preventDefault();first.focus();}
  }}>{children}</dialog>;
}
