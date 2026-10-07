import React from "react";

type IconProps = { size?: number; strokeWidth?: number; className?: string };
const I = ({ size=20, strokeWidth=1.8, className, children }: IconProps & { children: React.ReactNode }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">{children}</svg>
);
export const LayoutDashboard = (p:IconProps)=><I {...p}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></I>;
export const CheckSquare = (p:IconProps)=><I {...p}><rect x="3" y="3" width="18" height="18" rx="3"/><path d="m7 12 3 3 7-7"/></I>;
export const Briefcase = (p:IconProps)=><I {...p}><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18"/></I>;
export const UserCircle = (p:IconProps)=><I {...p}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="9" r="3"/><path d="M6.5 19a6 6 0 0 1 11 0"/></I>;
export const Bell = (p:IconProps)=><I {...p}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></I>;
export const Sun = (p:IconProps)=><I {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42"/></I>;
export const Moon = (p:IconProps)=><I {...p}><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3 6.7 6.7 0 0 0 21 12.8Z"/></I>;
export const LogOut = (p:IconProps)=><I {...p}><path d="M10 17l5-5-5-5M15 12H3M21 19V5a2 2 0 0 0-2-2h-6"/></I>;
export const Plus = (p:IconProps)=><I {...p}><path d="M12 5v14M5 12h14"/></I>;
export const Search = (p:IconProps)=><I {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></I>;
export const MoreHorizontal = (p:IconProps)=><I {...p}><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></I>;
export const ChevronDown = (p:IconProps)=><I {...p}><path d="m6 9 6 6 6-6"/></I>;
export const ArrowRight = (p:IconProps)=><I {...p}><path d="M5 12h14M13 6l6 6-6 6"/></I>;
export const ArrowLeft = (p:IconProps)=><I {...p}><path d="M19 12H5M11 18l-6-6 6-6"/></I>;
export const Pencil = (p:IconProps)=><I {...p}><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"/></I>;
export const Trash2 = (p:IconProps)=><I {...p}><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v5M14 11v5"/></I>;
export const Users = (p:IconProps)=><I {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></I>;
export const Settings = (p:IconProps)=><I {...p}><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="m19.4 15 .1.1a2 2 0 0 1-2.8 2.8l-.1-.1a2 2 0 0 0-3.4 1.4V19a2 2 0 0 1-4 0v-.1a2 2 0 0 0-3.4-1.4l-.1.1A2 2 0 0 1 3 14.8l.1-.1a2 2 0 0 0-1.4-3.4H1.6a2 2 0 0 1 0-4h.1a2 2 0 0 0 1.4-3.4L3 3.8A2 2 0 0 1 5.8 1l.1.1a2 2 0 0 0 3.4-1.4V-.4a2 2 0 0 1 4 0v.1a2 2 0 0 0 3.4 1.4l.1-.1A2 2 0 0 1 19.6 3l-.1.1a2 2 0 0 0 1.4 3.4h.1a2 2 0 0 1 0 4h-.1a2 2 0 0 0-1.5 4.5Z"/></I>;
export const MoreVertical = (p:IconProps)=><I {...p}><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></I>;
export const Calendar = (p:IconProps)=><I {...p}><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></I>;
export const Clock = (p:IconProps)=><I {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></I>;
export const LinkIcon = (p:IconProps)=><I {...p}><path d="M10 13a5 5 0 0 0 7.54.54l2-2a5 5 0 0 0-7.07-7.07l-1.15 1.15"/><path d="M14 11a5 5 0 0 0-7.54-.54l-2 2a5 5 0 0 0 7.07 7.07l1.15-1.15"/></I>;
export const GripVertical = (p:IconProps)=><I {...p}><circle cx="9" cy="5" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="19" r="1"/></I>;
export const X = (p:IconProps)=><I {...p}><path d="m6 6 12 12M18 6 6 18"/></I>;
export const Check = (p:IconProps)=><I {...p}><path d="m5 12 4 4L19 6"/></I>;
export const AlertTriangle = (p:IconProps)=><I {...p}><path d="m10.3 3.4-8 14A2 2 0 0 0 4 20h16a2 2 0 0 0 1.7-2.6l-8-14a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/></I>;
export const Copy = (p:IconProps)=><I {...p}><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></I>;
export const CheckCircle = (p:IconProps)=><I {...p}><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/></I>;
export const Info = (p:IconProps)=><I {...p}><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></I>;
export const Sparkles = (p:IconProps)=><I {...p}><path d="m12 3-1.2 4.2L7 8.5l3.8 1.3L12 14l1.2-4.2L17 8.5l-3.8-1.3Z"/><path d="m19 14-.7 2.3L16 17l2.3.7L19 20l.7-2.3L22 17l-2.3-.7ZM5 15l-.7 2.3L2 18l2.3.7L5 21l.7-2.3L8 18l-2.3-.7Z"/></I>;

export const Menu = (p:IconProps)=><I {...p}><path d="M4 6h16M4 12h16M4 18h16"/></I>;
