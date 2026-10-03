'use client';

import { useEffect } from 'react';

export default function ApprovalSettingsPlacement(){
  useEffect(()=>{
    let frame=0;
    const place=()=>{
      cancelAnimationFrame(frame);
      frame=requestAnimationFrame(()=>{
        const card=document.querySelector<HTMLElement>('.setting-card.notification-config');
        const grid=document.querySelector<HTMLElement>('.advanced-admin .admin-config-grid');
        if(!card||!grid||card.parentElement===grid)return;
        card.classList.add('admin-config-card','approval-notification-admin-card');
        grid.insertBefore(card,grid.firstChild);
      });
    };
    place();
    const observer=new MutationObserver(place);
    observer.observe(document.body,{childList:true,subtree:true});
    return()=>{cancelAnimationFrame(frame);observer.disconnect();};
  },[]);

  return <style>{`
    .advanced-admin .approval-notification-admin-card{width:100%!important;margin:0!important}
    .local-data-center>.notification-config{display:none!important}
  `}</style>;
}
