import { useEffect, useState } from "react";
export function MathPrompt({ text }: { text: string }) {
 const [html,setHtml]=useState<string|null>(null);
 useEffect(()=>{let active=true;const match=/^\\\[([\s\S]*)\\\]$/.exec(text.trim());if(!match){setHtml(null);return()=>{active=false;};}
  void Promise.all([import('katex'),import('katex/dist/katex.min.css')]).then(([katex])=>{const rendered=katex.default.renderToString(match[1]??'',{throwOnError:false,trust:false,displayMode:true,strict:'error'});if(active)setHtml(rendered);});
  return()=>{active=false;};
 },[text]);
 return html?<div dir="ltr" className="overflow-x-auto py-2" dangerouslySetInnerHTML={{__html:html}}/>:<p className="whitespace-pre-wrap break-words text-sm leading-7" dir="auto">{text}</p>;
}
