'use client';

import { useEffect } from 'react';

export default function OverviewV5Tune() {
  useEffect(() => {
    const apply = () => {
      const day = document.querySelector<HTMLImageElement>('.pg4-hero-day');
      const night = document.querySelector<HTMLImageElement>('.pg4-hero-night');
      if (day && !day.src.includes('v=5')) day.src = '/overview/hero-day.svg?v=5';
      if (night && !night.src.includes('v=5')) night.src = '/overview/hero-night.svg?v=5';
      document.documentElement.dataset.pgOverview = 'v5';
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return <style>{`
/* V5: match the approved imperial-Hue mobile reference more closely. */
.pg4-hero{height:365px!important;background:#5e0c08!important}
.pg4-hero-art{object-position:center 50%!important;transform:none!important;filter:saturate(1.06) contrast(1.03)!important}
.pg4-hero-shade{background:linear-gradient(180deg,rgba(35,2,2,.38) 0%,rgba(35,2,2,.08) 23%,transparent 47%,rgba(38,3,2,.06) 67%,rgba(38,3,2,.72) 100%)!important}
html[data-hue-mode='dark'] .pg4-hero-shade{background:linear-gradient(180deg,rgba(1,7,12,.52) 0%,rgba(1,7,12,.12) 23%,transparent 48%,rgba(2,9,15,.08) 67%,rgba(2,9,15,.78) 100%)!important}
.pg4-top{top:calc(env(safe-area-inset-top) + 10px)!important;left:16px!important;right:12px!important;align-items:flex-start!important}
.pg4-logo{width:82px!important;height:82px!important}
.pg4-actions{gap:6px!important}
.pg4-language{height:38px!important;min-width:112px!important;padding:0 9px!important;border-radius:12px!important}
.pg4-language svg{display:none!important}.pg4-language:before{display:none!important}
.pg4-language select{width:94px!important;font-size:11px!important;text-align:center!important}
.pg4-account,.pg4-bell{width:40px!important;height:40px!important}
.pg4-title{top:calc(env(safe-area-inset-top) + 88px)!important;left:103px!important;right:12px!important;text-align:center!important}
.pg4-title h1{font-size:clamp(16px,4.35vw,19px)!important;line-height:1.08!important;letter-spacing:.025em!important;white-space:nowrap!important}
.pg4-title p{margin:5px 0 5px!important;font-size:9.8px!important;white-space:nowrap!important}
.pg4-divider:before,.pg4-divider:after{width:33px!important}
.pg4-flow{margin-top:-16px!important;gap:10px!important;width:calc(100% - 24px)!important}
.pg4-sample{min-height:76px!important;padding:12px 41px 12px 58px!important;border-radius:16px!important}
.pg4-sample-icon{left:14px!important;width:35px!important;height:35px!important}
.pg4-sample strong{font-size:11.5px!important}.pg4-sample p{font-size:9.2px!important}
.pg4-overview{padding:58px 9px 16px!important;border-radius:18px!important}
.pg4-section-title{top:14px!important;font-size:11.5px!important}.pg4-section-title strong{padding:7px 14px!important}
.pg4-stats{gap:6px!important}.pg4-stat{min-height:120px!important;border-radius:14px!important;padding:13px 3px 9px!important;background-size:cover,245%!important}
.pg4-stat svg{width:22px!important;height:22px!important}.pg4-stat strong{font-size:28px!important}.pg4-stat.family strong{font-size:16px!important}.pg4-stat span{font-size:9px!important}
.pg4-tree{height:58px!important;margin-top:13px!important;border-radius:20px!important}.pg4-tree strong{font-size:17px!important}.pg4-tree>svg:first-of-type{width:31px!important;height:31px!important}
.pg4-quote{min-height:122px!important;padding:19px 31px 17px!important;font-size:14.8px!important;background-size:cover,128%!important;background-position:center,center 70%!important}
.pg4-nav{height:calc(68px + env(safe-area-inset-bottom))!important;padding-top:4px!important}.pg4-nav button{font-size:7.8px!important}.pg4-nav button svg{width:19px!important;height:19px!important}
@media(max-width:390px){.pg4-hero{height:345px!important}.pg4-logo{width:76px!important;height:76px!important}.pg4-title{top:calc(env(safe-area-inset-top) + 83px)!important;left:94px!important}.pg4-title h1{font-size:15.8px!important}.pg4-title p{font-size:9px!important}.pg4-language{min-width:102px!important}.pg4-language select{width:86px!important}.pg4-account,.pg4-bell{width:38px!important;height:38px!important}.pg4-stat{min-height:114px!important}.pg4-quote{min-height:116px!important}}
  `}</style>;
}
