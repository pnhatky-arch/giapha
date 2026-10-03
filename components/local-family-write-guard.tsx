'use client';
import { useEffect } from 'react';
import { queueFamilySnapshot, readLocalWorkspace } from '@/lib/local-data-workspace';

export default function LocalFamilyWriteGuard(){
  useEffect(()=>{
    const nativeFetch=window.fetch.bind(window);
    window.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{
      const url=typeof input==='string'?input:input instanceof URL?input.toString():input.url;
      const method=(init?.method||(typeof input!=='string'&&!(input instanceof URL)?input.method:'GET')).toUpperCase();
      if(url.endsWith('/api/family')&&(method==='PUT'||method==='DELETE')){
        if(method==='DELETE'){
          queueFamilySnapshot(null,'Xóa dữ liệu gia phả local',readLocalWorkspace().family,'empty');
          return new Response(JSON.stringify({ok:true,family:null,dataMode:'empty',localOnly:true}),{status:200,headers:{'content-type':'application/json'}});
        }
        try{
          const body=JSON.parse(String(init?.body||'{}')) as {family?:unknown;dataMode?:'sample'|'official'|'empty';activity?:{action?:string}};
          if(!body.family)return new Response(JSON.stringify({message:'Dữ liệu gia phả local không hợp lệ.'}),{status:400,headers:{'content-type':'application/json'}});
          const current=readLocalWorkspace();
          const mode=body.dataMode||current.familyDataMode||'official';
          queueFamilySnapshot(body.family,body.activity?.action||'Cập nhật gia phả local',current.family,mode);
          return new Response(JSON.stringify({ok:true,family:body.family,dataMode:mode,localOnly:true}),{status:200,headers:{'content-type':'application/json'}});
        }catch{return new Response(JSON.stringify({message:'Dữ liệu gia phả local không hợp lệ.'}),{status:400,headers:{'content-type':'application/json'}});}
      }
      return nativeFetch(input,init);
    }) as typeof window.fetch;
    return()=>{window.fetch=nativeFetch;};
  },[]);
  return null;
}
