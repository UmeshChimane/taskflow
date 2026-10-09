"use client";
import Image from "next/image";
import { useState } from "react";
export default function Avatar({name,image,className="avatar"}:{name:string;image?:string|null;className?:string}){
 const [failed,setFailed]=useState<string|null>(null);
 return <div className={`${className} overflow-hidden shrink-0`}>
  {image&&image!==failed?<Image src={image} alt="" width={128} height={128} unoptimized className="h-full w-full object-cover" onError={()=>setFailed(image)}/>:name.split(/\s+/).map(part=>part[0]).join("").slice(0,2).toUpperCase()}
 </div>;
}
