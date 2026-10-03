'use client';

export default function OverviewPremiumRedesign(){
 return <style>{`
  .overview-view{position:relative;isolation:isolate;width:min(760px,calc(100% - 34px))!important;margin:auto!important;padding:34px 30px 30px!important;overflow:hidden;text-align:center;border:1px solid #e1b34b73!important;border-radius:24px!important;background:linear-gradient(145deg,#5f0d09e8 0%,#3a0605f2 56%,#270403f5 100%)!important;box-shadow:0 24px 65px #19000070,inset 0 1px #ffe8a124!important;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}
  .overview-view:before{content:'PHẠM VĂN';position:absolute;z-index:-2;inset:50% auto auto 50%;transform:translate(-50%,-50%);white-space:nowrap;color:transparent;-webkit-text-stroke:1px #f2ca6910;font-family:var(--font-serif);font-size:clamp(64px,15vw,142px);font-weight:800;letter-spacing:.06em}
  .overview-view:after{content:'';position:absolute;z-index:-1;left:50%;top:-115px;width:330px;height:330px;transform:translateX(-50%);border-radius:50%;background:radial-gradient(circle,#d3482728 0,#a8291714 35%,transparent 70%);pointer-events:none}
  .overview-stats{position:relative;display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:12px!important;margin:0!important;padding-top:35px}
  .overview-stats:before{content:'GIA PHẢ HỌ PHẠM VĂN';position:absolute;top:0;left:0;right:0;color:#f4d782;font-family:var(--font-serif);font-size:13px;font-weight:700;letter-spacing:.16em;text-align:center}
  .overview-stats>div{position:relative;min-height:116px;display:flex!important;flex-direction:column;align-items:center;justify-content:center;gap:8px!important;padding:16px 8px!important;overflow:hidden;border:1px solid #d5a13e55!important;border-radius:16px!important;background:linear-gradient(155deg,#6d120d9c,#300504b5)!important;box-shadow:inset 0 1px #ffe49a16,0 10px 25px #1700002b!important}
  .overview-stats>div:before{content:'';position:absolute;top:0;left:20%;right:20%;height:1px;background:linear-gradient(90deg,transparent,#f2cc70aa,transparent)}
  .overview-stats strong{display:block;color:#f5d77f!important;font-family:var(--font-serif)!important;font-size:30px!important;font-weight:700;line-height:1.05;text-shadow:0 2px 14px #e5ad3d24}
  .overview-stats>div:nth-child(3) strong{max-width:110px;font-size:22px!important;line-height:1.05;letter-spacing:.05em}
  .overview-stats span{color:#c4a98a!important;font-size:10px!important;letter-spacing:.06em}
  .overview-view>button{position:relative;min-width:190px;height:48px;margin-top:24px!important;padding:0 24px!important;border:1px solid #e0b34b!important;border-radius:13px!important;background:linear-gradient(180deg,#a32619,#78140e)!important;box-shadow:0 9px 22px #23010055,inset 0 1px #ffd8795c!important;color:#ffe09a!important;font-size:14px!important;font-weight:500;letter-spacing:.02em;transition:transform .18s ease,box-shadow .18s ease,background .18s ease}
  .overview-view>button:before{content:'⌘';margin-right:9px;color:#efc967;font-size:15px}
  .overview-view>button:hover{transform:translateY(-1px);background:linear-gradient(180deg,#b72c1d,#851710)!important;box-shadow:0 12px 28px #23010066,0 0 0 3px #dcae4130!important}
  .overview-view>button:active{transform:scale(.985)}
  @media(max-width:580px){.overview-view{width:calc(100% - 28px)!important;padding:28px 18px 24px!important;border-radius:20px!important}.overview-stats{gap:8px!important;padding-top:31px}.overview-stats:before{font-size:11px;letter-spacing:.12em}.overview-stats>div{min-height:105px;padding:13px 5px!important;border-radius:14px!important}.overview-stats strong{font-size:24px!important}.overview-stats>div:nth-child(3) strong{font-size:18px!important}.overview-stats span{font-size:9px!important}.overview-view>button{width:100%;height:46px;margin-top:18px!important}.overview-view:before{font-size:20vw}}
 `}</style>;
}
