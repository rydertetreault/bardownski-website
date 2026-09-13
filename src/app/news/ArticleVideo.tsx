"use client";

import { getMonochromePoster } from "@/lib/photo-posters";
import { useState } from "react";

type Props = {src:string; poster?:string; captions?:string; title:string};
/** Explicit-play article player: no autoplay or download before user intent. */
export default function ArticleVideo({src,poster,captions,title}:Props) {
  const [failed,setFailed]=useState(false);
  if(failed) return <div className="article-video-error" role="status"><p>The film could not be loaded. Please try again, or read the story and transcript below.</p><button type="button" onClick={()=>setFailed(false)}>Try the video again</button><a href={src}>Open the video file ↗</a></div>;
  return <video controls playsInline preload="none" poster={getMonochromePoster(poster)} aria-label={title} className="w-full h-full object-contain" onError={()=>setFailed(true)}>
    <source src={src} type="video/mp4" onError={()=>setFailed(true)} />
    {captions&&<track kind="captions" src={captions} srcLang="en" label="English" default />}
    Your browser does not support this video. <a href={src}>Open the film</a>.
  </video>;
}
