import { lazy, Suspense, useEffect, useState } from "react";
const Halftone = lazy(()=>import("@paper-design/shaders-react").then(module=>({default:module.HalftoneDots})).catch(()=>({default:()=>null})));
export function BitmapAccent() {
  const [supported,setSupported]=useState(false);
  useEffect(()=>{
    const canvas=document.createElement("canvas");
    const gl=canvas.getContext("webgl2",{failIfMajorPerformanceCaveat:true});
    if(gl){gl.getExtension("WEBGL_lose_context")?.loseContext();setSupported(true);}
  },[]);
  return <span className="bitmap-accent" aria-hidden="true"><img src="/study-rhythm.svg" alt=""/>{supported&&<Suspense fallback={null}><Halftone image="/study-rhythm.svg" colorFront="#354a1b" colorBack="#dcec9b" size={.5} radius={.8} originalColors={false} speed={0} maxPixelCount={70000} style={{width:"100%",height:"100%"}}/></Suspense>}</span>;
}
