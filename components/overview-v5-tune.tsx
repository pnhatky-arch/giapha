'use client';

import { DAY_HERO_DATA, NIGHT_HERO_DATA } from './overview-hero-data.generated';

export default function OverviewV5Tune() {
  return <style>{`
/* V9: hero JPEGs are bundled as data URLs; no Cloudflare static-asset request is required. */
html{--pg4-hero-day:url("${DAY_HERO_DATA}");--pg4-hero-night:url("${NIGHT_HERO_DATA}")}
.pg4-hero{height:365px!important;background-color:#5e0c08!important;background-image:var(--pg4-hero-day)!important;background-size:cover!important;background-position:center 50%!important;background-repeat:no-repeat!important}
html[data-hue-mode='dark'] .pg4-hero{background-color:#061827!important;background-image:var(--pg4-hero-night)!important}
.pg4-hero-art{display:none!important}
.pg4-hero-shade{background:linear-gradient(180deg,rgba(35,2,2,.24) 0%,rgba(35,2,2,.02) 24%,transparent 54%,rgba(38,3,2,.02) 72%,rgba(38,3,2,.54) 100%)!important}
html[data-hue-mode='dark'] .pg4-hero-shade{background:linear-gradient(180deg,rgba(1,7,12,.34) 0%,rgba(1,7,12,.05) 24%,transparent 54%,rgba(2,9,15,.03) 72%,rgba(2,9,15,.58) 100%)!important}
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
.pg4-stats{gap:6px!important}.pg4-stat{min-height:120px!important;border-radius:14px!important;padding:13px 3px 9px!important;background-image:linear-gradient(180deg,#9f2a1eda 0%,#5a0b07d8 58%,#380503ef 100%),var(--pg4-hero-day)!important;background-size:cover,245%!important;background-position:center,center bottom!important}
html[data-hue-mode='dark'] .pg4-stat{background-image:linear-gradient(180deg,#173e55d8 0%,#092235d8 58%,#03101bef 100%),var(--pg4-hero-night)!important}
.pg4-stat svg{width:22px!important;height:22px!important}.pg4-stat strong{font-size:28px!important}.pg4-stat.family strong{font-size:16px!important}.pg4-stat span{font-size:9px!important}
.pg4-tree{height:58px!important;margin-top:13px!important;border-radius:20px!important}.pg4-tree strong{font-size:17px!important}.pg4-tree>svg:first-of-type{width:31px!important;height:31px!important}
.pg4-quote{min-height:122px!important;padding:19px 31px 17px!important;font-size:14.8px!important;background-image:linear-gradient(90deg,#f2dfbaed,#f7e8caed),var(--pg4-hero-day)!important;background-size:cover,128%!important;background-position:center,center 70%!important}
html[data-hue-mode='dark'] .pg4-quote{background-image:linear-gradient(90deg,#e5d2a8ea,#d5c195ea),var(--pg4-hero-night)!important}
.pg4-nav{height:calc(68px + env(safe-area-inset-bottom))!important;padding-top:4px!important}.pg4-nav button{font-size:7.8px!important}.pg4-nav button svg{width:19px!important;height:19px!important}
@media(max-width:390px){.pg4-hero{height:345px!important}.pg4-logo{width:76px!important;height:76px!important}.pg4-title{top:calc(env(safe-area-inset-top) + 83px)!important;left:94px!important}.pg4-title h1{font-size:15.8px!important}.pg4-title p{font-size:9px!important}.pg4-language{min-width:102px!important}.pg4-language select{width:86px!important}.pg4-account,.pg4-bell{width:38px!important;height:38px!important}.pg4-stat{min-height:114px!important}.pg4-quote{min-height:116px!important}}
  `}</style>;
}
