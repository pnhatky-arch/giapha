'use client';

import { useCallback, useEffect, useState } from 'react';
import { BookOpen, ChevronRight, Database, Network, TreePine, Users } from 'lucide-react';

const HOME_LABEL = 'tổng quan';
const TREE_LABEL = 'cây gia phả';

function normalize(value?: string | null) {
  return (value ?? '').trim().toLocaleLowerCase('vi');
}

function findTab(label: string) {
  const needle = normalize(label);
  return Array.from(document.querySelectorAll<HTMLButtonElement>('.tabs button')).find((button) =>
    normalize(button.textContent).includes(needle),
  );
}

export default function OverviewPremiumRedesign() {
  const [homeActive, setHomeActive] = useState(false);
  const [memberCount, setMemberCount] = useState('68');
  const [generationCount, setGenerationCount] = useState('6');
  const [projectName, setProjectName] = useState('GIA PHẢ HỌ PHẠM VĂN');
  const [subtitle, setSubtitle] = useState('Gìn giữ cội nguồn · Kết nối thế hệ');
  const [showSample, setShowSample] = useState(true);

  const sync = useCallback(() => {
    const shell = document.querySelector<HTMLElement>('.app-shell');
    if (!shell) {
      setHomeActive(false);
      document.documentElement.classList.remove('pg-home-v3-active');
      return;
    }

    const activeButton = shell.querySelector<HTMLButtonElement>('.tabs button.active');
    const isHome = normalize(activeButton?.textContent).includes(HOME_LABEL);
    setHomeActive(isHome);
    shell.classList.toggle('pg-home-active', isHome);
    document.documentElement.classList.toggle('pg-home-v3-active', isHome);
    document.documentElement.dataset.pgOverview = 'v3';

    const brand = shell.querySelector<HTMLElement>('.brand .system-name, .tab-brand .system-name, .tab-fallback-brand .system-name');
    const brandSubtitle = shell.querySelector<HTMLElement>('.brand-copy p, .tab-brand p, .tab-fallback-brand p');
    if (brand?.textContent?.trim()) setProjectName(brand.textContent.trim());
    if (brandSubtitle?.textContent?.trim()) setSubtitle(brandSubtitle.textContent.trim());

    const values = Array.from(shell.querySelectorAll<HTMLElement>('.overview-stats strong'));
    if (values[0]?.textContent?.trim()) setMemberCount(values[0].textContent.trim());
    if (values[1]?.textContent?.trim()) setGenerationCount(values[1].textContent.trim());
    setShowSample(Boolean(shell.querySelector('.sample-data-banner')));
  }, []);

  useEffect(() => {
    let frame = 0;
    let homeRequested = false;

    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(sync);
    };

    const openHomeOnce = () => {
      const shell = document.querySelector('.app-shell');
      const home = findTab('Tổng quan');
      if (!shell || !home || homeRequested) return;
      homeRequested = true;
      if (!home.classList.contains('active')) home.click();
      schedule();
    };

    const handleClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('.tabs button') : null;
      if (!target) return;
      const label = normalize(target.textContent);
      const isHome = label.includes(HOME_LABEL);
      setHomeActive(isHome);
      document.querySelector('.app-shell')?.classList.toggle('pg-home-active', isHome);
      document.documentElement.classList.toggle('pg-home-v3-active', isHome);
      requestAnimationFrame(sync);
    };

    document.addEventListener('click', handleClick, true);
    openHomeOnce();

    const observer = new MutationObserver(() => {
      openHomeOnce();
      schedule();
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

    const timer = window.setTimeout(() => {
      openHomeOnce();
      schedule();
    }, 350);

    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener('click', handleClick, true);
      document.querySelector('.app-shell')?.classList.remove('pg-home-active');
      document.documentElement.classList.remove('pg-home-v3-active');
    };
  }, [sync]);

  const openTree = () => {
    const tree = findTab('Cây gia phả');
    if (!tree) return;
    setHomeActive(false);
    document.querySelector('.app-shell')?.classList.remove('pg-home-active');
    document.documentElement.classList.remove('pg-home-v3-active');
    tree.click();
  };

  return <>
    <style>{`
:root{--pg-red:#8f160f;--pg-deep:#2a0302;--pg-gold:#d7a849;--pg-gold-hi:#ffe59b;--pg-text:#fff0c9;--pg-muted:#d7bd99}
html[data-hue-mode='dark']{--pg-red:#0d2d41;--pg-deep:#02090f;--pg-gold:#d2a64e;--pg-gold-hi:#f5da8b;--pg-text:#f4e7bf;--pg-muted:#b5aa92}
html.pg-home-v3-active,html.pg-home-v3-active body{overflow:hidden!important;background:var(--pg-deep)!important}
.app-shell.pg-home-active .content{visibility:hidden!important;pointer-events:none!important}
.app-shell.pg-home-active .guest-banner,.app-shell.pg-home-active .filter-panel{display:none!important}
.pg-home-v3{position:fixed;z-index:100;inset:0;overflow-x:hidden;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior-y:contain;padding:0 0 calc(78px + env(safe-area-inset-bottom));background:linear-gradient(180deg,#a32016 0%,#7a100a 48%,#2a0302 100%);color:var(--pg-text)}
html[data-hue-mode='dark'] .pg-home-v3{background:linear-gradient(180deg,#10374f 0%,#081f2d 50%,#02090f 100%)}
.pg-home-v3::-webkit-scrollbar{display:none}.pg-home-v3{scrollbar-width:none}
.pg-home-hero{position:relative;height:470px;overflow:hidden;background:#6d120b}
.pg-home-hero-art{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 50%}
.pg-home-hero-night{display:none}html[data-hue-mode='dark'] .pg-home-hero-day{display:none}html[data-hue-mode='dark'] .pg-home-hero-night{display:block}
.pg-home-hero:after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,#19020242 0%,transparent 24%,transparent 58%,#2a030236 72%,#2a0302f5 100%),linear-gradient(90deg,#21030235,transparent 22%,transparent 78%,#21030235)}
html[data-hue-mode='dark'] .pg-home-hero:after{background:linear-gradient(180deg,#01070c52 0%,transparent 25%,transparent 58%,#02090f38 72%,#02090ff7 100%),linear-gradient(90deg,#02090f45,transparent 22%,transparent 78%,#02090f45)}
.pg-home-brand{position:absolute;z-index:2;left:18px;right:18px;top:calc(env(safe-area-inset-top) + 72px);display:flex;align-items:center;gap:12px;text-shadow:0 2px 12px #260000a6}
.pg-home-logo{width:78px;height:78px;object-fit:contain;flex:0 0 auto;filter:drop-shadow(0 5px 13px #21000080) drop-shadow(0 0 9px #f0c0564d)}
.pg-home-brand h1{margin:0;color:var(--pg-gold-hi);font-family:var(--font-serif),Georgia,serif;font-size:20px;font-weight:650;line-height:1.15;letter-spacing:.025em}.pg-home-brand p{margin:6px 0 0;color:#f2dbb2;font-size:10.5px;line-height:1.35}
.pg-home-flow{position:relative;z-index:3;width:calc(100% - 28px);max-width:760px;margin:-32px auto 0;display:grid;gap:13px}
.pg-home-sample{position:relative;min-height:88px;padding:14px 46px 14px 60px;display:flex;align-items:center;border:1px solid #e2b75aa8;border-radius:18px;background:linear-gradient(135deg,#7b110cf5,#370404fa);box-shadow:0 14px 34px #1900008c,inset 0 1px #ffe8a32b}
html[data-hue-mode='dark'] .pg-home-sample{background:linear-gradient(135deg,#12354af7,#06131dfb)}
.pg-home-sample-icon{position:absolute;left:16px;top:50%;width:36px;height:36px;transform:translateY(-50%);display:grid;place-items:center;border:1px solid #e9bd60;border-radius:50%;color:#f0c760}.pg-home-sample-icon svg{width:22px;height:22px}.pg-home-sample strong{display:block;margin:0 0 5px;color:#ffe9b5;font-size:12px;line-height:1.25}.pg-home-sample p{margin:0;color:#ddc4a3;font-size:9.7px;line-height:1.5}.pg-home-sample>.pg-home-chevron{position:absolute;right:14px;top:50%;width:24px;transform:translateY(-50%);color:#ffe5a2}
.pg-home-overview{position:relative;isolation:isolate;padding:64px 11px 20px;overflow:hidden;border:1px solid #d9ad529a;border-radius:22px;background:linear-gradient(145deg,#77120df8,#350404fc);box-shadow:0 20px 50px #1a000088,inset 0 1px #ffe9a92d}
html[data-hue-mode='dark'] .pg-home-overview{background:linear-gradient(145deg,#113249f9,#041019fc)}
.pg-home-overview-title{position:absolute;z-index:2;top:16px;left:50%;transform:translateX(-50%);white-space:nowrap;padding:8px 17px;border:1px solid #e2b65b;border-radius:999px;background:linear-gradient(180deg,#8b1a12,#4d0705);box-shadow:0 7px 20px #1c00006d,inset 0 1px #fff3;color:var(--pg-gold-hi);font-family:var(--font-serif),Georgia,serif;font-size:12px;font-weight:650;letter-spacing:.06em}html[data-hue-mode='dark'] .pg-home-overview-title{background:linear-gradient(180deg,#173c53,#07141e)}
.pg-home-medallion{position:absolute;z-index:-1;left:50%;top:52%;width:520px;max-width:126vw;aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;opacity:.8;background:radial-gradient(circle,transparent 0 8%,#d8aa4928 8.5% 9.2%,transparent 9.7% 17%,#d8aa4930 17.5% 18.2%,transparent 18.7% 28%,#d8aa4936 28.5% 29.2%,transparent 29.7% 40%,#d8aa4942 40.5% 41.2%,transparent 41.7%),repeating-conic-gradient(from 0deg,#d8aa4930 0 2deg,transparent 2deg 8deg,#d8aa491f 8deg 10deg,transparent 10deg 17deg)}
.pg-home-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}.pg-home-stat{position:relative;min-height:120px;padding:16px 3px 11px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;border:1px solid #dfb45791;border-radius:16px;background:linear-gradient(158deg,#a52d20ce,#3b0504ef);box-shadow:0 11px 24px #1a000071,inset 0 1px #ffe9a52d}.pg-home-stat:after{content:'';position:absolute;inset:5px;border:1px solid #d8aa492d;border-radius:12px;pointer-events:none}html[data-hue-mode='dark'] .pg-home-stat{background:linear-gradient(158deg,#173d55da,#06111bed)}
.pg-home-stat svg{position:relative;z-index:1;width:22px;height:22px;color:#efc769;stroke-width:1.6}.pg-home-stat strong{position:relative;z-index:1;color:var(--pg-gold-hi);font-family:var(--font-serif),Georgia,serif;font-size:28px;font-weight:650;line-height:1;text-align:center;text-shadow:0 2px 11px #0006}.pg-home-stat.family strong{font-size:16px;line-height:1.05;letter-spacing:.04em}.pg-home-stat span{position:relative;z-index:1;color:var(--pg-muted);font-size:9px}
.pg-home-tree{position:relative;width:100%;height:58px;margin:17px 0 0;padding:0 54px 0 67px;display:flex;align-items:center;justify-content:center;border:1px solid #ffe29b;border-radius:20px;background:linear-gradient(180deg,#c33a28,#82130d);box-shadow:0 12px 28px #2100007c,inset 0 1px #fff5;color:var(--pg-gold-hi);font-family:var(--font-serif),Georgia,serif}.pg-home-tree>svg:first-child{position:absolute;left:19px;width:29px;height:29px;color:#efc869;stroke-width:1.45}.pg-home-tree>svg:last-child{position:absolute;right:18px;width:25px}.pg-home-tree strong{font-size:17px;font-weight:650}html[data-hue-mode='dark'] .pg-home-tree{background:linear-gradient(180deg,#1c4965,#091b29)}
.pg-home-quote{position:relative;min-height:148px;margin:0;padding:26px 32px;display:flex;flex-direction:column;align-items:center;justify-content:center;border:1px solid #d3a65aab;border-radius:15px;background:radial-gradient(circle at 16% 80%,#db6e6952 0 5%,transparent 5.5%),linear-gradient(180deg,#f2e3c1,#d6bc87);box-shadow:0 13px 30px #1a00006b,inset 0 0 0 5px #7c3c1710;color:#4b2819;font-family:var(--font-serif),Georgia,serif;font-size:16.5px;font-style:italic;font-weight:500;line-height:1.55;text-align:center}.pg-home-quote:before,.pg-home-quote:after{content:'';position:absolute;top:12px;bottom:12px;width:7px;border:1px solid #a1632e;border-radius:999px;background:linear-gradient(#c89145,#7a3e1f,#c89145)}.pg-home-quote:before{left:10px}.pg-home-quote:after{right:10px}.pg-home-quote i{margin-top:7px;color:#a52b1f;font-family:serif;font-size:17px;font-style:normal}html[data-hue-mode='dark'] .pg-home-quote{background:linear-gradient(180deg,#dfd0aa,#bba77d);color:#25323a}
.app-shell.pg-home-active .topbar{position:fixed!important;z-index:120!important;top:0!important;left:0!important;right:0!important;height:calc(64px + env(safe-area-inset-top))!important;padding:calc(env(safe-area-inset-top) + 9px) 14px 8px!important;display:flex!important;align-items:center!important;justify-content:flex-end!important;gap:9px!important;border:0!important;background:linear-gradient(180deg,#210302bc 0%,#2103024c 62%,transparent 100%)!important;box-shadow:none!important}.app-shell.pg-home-active .topbar .brand,.app-shell.pg-home-active .mobile-menu,.app-shell.pg-home-active .topbar:after{display:none!important}html[data-hue-mode='dark'] .app-shell.pg-home-active .topbar{background:linear-gradient(180deg,#02080cc9 0%,#02080c50 62%,transparent 100%)!important}
.app-shell.pg-home-active .language-select{display:flex!important;align-items:center!important;gap:6px!important;width:auto!important;height:38px!important;margin:0!important;padding:0 9px!important;border:1px solid #e0b14e9c!important;border-radius:13px!important;background:#520b08cb!important;backdrop-filter:blur(13px)!important;-webkit-backdrop-filter:blur(13px)!important}.app-shell.pg-home-active .language-select:before{content:'🇻🇳';font-size:13px}.app-shell.pg-home-active .language-select svg{display:none!important}.app-shell.pg-home-active .language-select select{min-width:78px!important;width:auto!important;padding:0 14px 0 0!important;border:0!important;background:transparent!important;box-shadow:none!important;color:var(--pg-text)!important;font-size:11px!important}html[data-hue-mode='dark'] .app-shell.pg-home-active .language-select{background:#06141ed2!important}.app-shell.pg-home-active .account-menu{margin:0!important}.app-shell.pg-home-active .profile{width:41px!important;height:41px!important;margin:0!important;border:1px solid #e2b351!important;background:linear-gradient(145deg,#8e1a11,#570906)!important;color:var(--pg-gold-hi)!important;font-family:var(--font-serif),Georgia,serif!important;font-size:16px!important}html[data-hue-mode='dark'] .app-shell.pg-home-active .profile{background:linear-gradient(145deg,#173b51,#07131d)!important}
.tabs{position:fixed!important;z-index:130!important;left:0!important;right:0!important;bottom:0!important;top:auto!important;width:100%!important;height:calc(68px + env(safe-area-inset-bottom))!important;padding:6px 4px calc(5px + env(safe-area-inset-bottom))!important;display:grid!important;grid-template-columns:repeat(6,minmax(0,1fr))!important;gap:0!important;border-top:1px solid #d7aa4b84!important;background:linear-gradient(180deg,#3a0604f6,#1d0202fc)!important;box-shadow:0 -10px 30px #16000078!important;backdrop-filter:blur(18px)!important;-webkit-backdrop-filter:blur(18px)!important}html[data-hue-mode='dark'] .tabs{background:linear-gradient(180deg,#07141ef7,#02080dfd)!important;border-top-color:#c89b4968!important}.tabs button{min-width:0!important;height:54px!important;padding:5px 2px 2px!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:3px!important;border:0!important;background:transparent!important;color:#d8c4ad!important;font-size:8.2px!important;line-height:1.05!important}.tabs button svg{display:block!important;width:20px!important;height:20px!important;stroke-width:1.7!important}.tabs button.active{color:var(--pg-gold-hi)!important;text-shadow:0 0 12px #f4c95b55!important}.tabs button.active svg{filter:drop-shadow(0 0 5px #f5cb6290)}
@media(min-width:741px){.pg-home-v3{left:240px}.pg-home-hero{height:500px}.pg-home-brand{top:72px;left:50%;right:auto;width:min(650px,calc(100% - 40px));transform:translateX(-50%)}.pg-home-flow{margin-top:-34px}}
@media(max-width:390px){.pg-home-hero{height:440px}.pg-home-logo{width:70px;height:70px}.pg-home-brand h1{font-size:18px}.pg-home-brand p{font-size:9.5px}.pg-home-stat strong{font-size:25px}.pg-home-stat.family strong{font-size:15px}.tabs button{font-size:7.7px!important}.tabs button svg{width:19px!important;height:19px!important}}
    `}</style>
    {homeActive && <section className="pg-home-v3" aria-label="Tổng quan dòng họ" data-ui-version="overview-v3">
      <div className="pg-home-hero">
        <img className="pg-home-hero-art pg-home-hero-day" src="/overview/hero-day.svg?v=3" alt="" />
        <img className="pg-home-hero-art pg-home-hero-night" src="/overview/hero-night.svg?v=3" alt="" />
        <div className="pg-home-brand">
          <img className="pg-home-logo" src="/logofinal/logo-pham-van.png?v=transparent-20260907" alt="" />
          <div><h1>{projectName}</h1><p>{subtitle}</p></div>
        </div>
      </div>
      <div className="pg-home-flow">
        {showSample && <aside className="pg-home-sample">
          <span className="pg-home-sample-icon"><Database /></span>
          <div><strong>Dữ liệu thử nghiệm · {memberCount} thành viên · {generationCount} đời</strong><p>Khi bắt đầu nhập dữ liệu chính thức, toàn bộ dữ liệu thử nghiệm sẽ bị xóa.</p></div>
          <ChevronRight className="pg-home-chevron" />
        </aside>}
        <section className="pg-home-overview">
          <div className="pg-home-overview-title">TỔNG QUAN DÒNG HỌ</div>
          <div className="pg-home-medallion" aria-hidden="true" />
          <div className="pg-home-stats">
            <article className="pg-home-stat"><Users /><strong>{memberCount}</strong><span>thành viên</span></article>
            <article className="pg-home-stat"><Network /><strong>{generationCount}</strong><span>thế hệ</span></article>
            <article className="pg-home-stat family"><BookOpen /><strong>PHẠM<br />VĂN</strong><span>Gia phả</span></article>
          </div>
          <button className="pg-home-tree" type="button" onClick={openTree}><TreePine /><strong>Cây gia phả</strong><ChevronRight /></button>
        </section>
        <blockquote className="pg-home-quote"><span>“Uống nước nhớ nguồn</span><span>Ăn quả nhớ kẻ trồng cây”</span><i aria-hidden="true">印</i></blockquote>
      </div>
    </section>}
  </>;
}
