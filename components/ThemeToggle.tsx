"use client";
import { Moon,Sun } from "./icons";import { useTheme } from "./ThemeProvider";
export default function ThemeToggle(){const {theme,toggle}=useTheme();return <button className="theme-toggle" onClick={toggle} title={`Switch to ${theme==="light"?"dark":"light"} mode`} aria-label="Toggle theme">{theme==="light"?<Moon size={17}/>:<Sun size={17}/>}</button>}
