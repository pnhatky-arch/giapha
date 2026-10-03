'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, ChevronRight, Database, Network, TreePine, Users } from 'lucide-react';

const DEFAULT_PROJECT_NAME = 'GIA PHẢ HỌ PHẠM VĂN';
const DEFAULT_SUBTITLE = 'Gìn giữ cội nguồn · Kết nối thế hệ';

function findTab(label: string) {
  const needle = label.toLocaleLowerCase('vi');
  return Array.from(document.querySelectorAll<HTMLButtonElement>('.tabs button')).find((button) =>
    button.textContent?.toLocaleLowerCase('vi').includes(needle),
  );
}

export default function OverviewPremiumRedesign() {
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [homeActive, setHomeActive] = useState(false);
  const [memberCount, setMemberCount] = useState('68');
  const [generationCount, setGenerationCount] = useState('6');
  const [projectName, setProjectName] = useState(DEFAULT_PROJECT_NAME);
  const [subtitle, setSubtitle] = useState(DEFAULT_SUBTITLE);
  const [showSample, setShowSample] = useState(true);
  const [sampleTitle, setSampleTitle] = useState('Dữ liệu thử nghiệm · 68 thành viên · 6 đời');
  const [sampleDescription, setSampleDescription] = useState('Khi bắt đầu nhập dữ liệu chính thức, toàn bộ dữ liệu thử nghiệm sẽ bị xóa.');

  const syncFromApp = useCallback(() => {
    const shell = document.querySelector<HTMLElement>('.app-shell');
    const content = shell?.querySelector<HTMLElement>('.content') ?? null;
    const homeButton = findTab('Tổng quan');
    const active = Boolean(shell && homeButton?.classList.contains('active'));

    setPortalTarget(content);
    setHomeActive(active);
    shell?.classList.toggle('pg-home-active', active);

    if (!active) return;

    const sourceBrand = content?.querySelector<HTMLElement>('.tab-brand .system-name, .tab-fallback-brand .system-name');
    const sourceSubtitle = content?.querySelector<HTMLElement>('.tab-brand p, .tab-fallback-brand p');
    if (sourceBrand?.textContent?.trim()) setProjectName(sourceBrand.textContent.trim());
    if (sourceSubtitle?.textContent?.trim()) setSubtitle(sourceSubtitle.textContent.trim());

    const values = Array.from(content?.querySelectorAll<HTMLElement>('.overview-stats strong') ?? []);
    if (values[0]?.textContent?.trim()) setMemberCount(values[0].textContent.trim());
    if (values[1]?.textContent?.trim()) setGenerationCount(values[1].textContent.trim());

    const sample = content?.querySelector<HTMLElement>('.sample-data-banner');
    setShowSample(Boolean(sample));
    const title = sample?.querySelector<HTMLElement>('.sample-data-copy strong')?.textContent?.trim();
    const description = sample?.querySelector<HTMLElement>('.sample-data-copy p')?.textContent?.trim();
    if (title) setSampleTitle(title.replace('5 đời', '6 đời'));
    if (description) setSampleDescription(description);
  }, []);

  useEffect(() => {
    let initialized = false;
    let frame = 0;

    const scheduleSync = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(syncFromApp);
    };

    const ensureInitialHome = () => {
      if (initialized) return;
      const shell = document.querySelector('.app-shell');
      const homeButton = findTab('Tổng quan');
      if (!shell || !homeButton) return;
      initialized = true;
      if (!homeButton.classList.contains('active')) homeButton.click();
      scheduleSync();
    };

    ensureInitialHome();
    const observer = new MutationObserver(() => {
      ensureInitialHome();
      scheduleSync();
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.querySelector('.app-shell')?.classList.remove('pg-home-active');
    };
  }, [syncFromApp]);

  const openTree = () => findTab('Cây gia phả')?.click();

  const home = (
    <section className="pg-home-screen" aria-label="Tổng quan dòng họ">
      <div className="pg-home-hero">
        {/* oxlint-disable-next-line next/no-img-element -- static local artwork is intentionally used as the home hero. */}
        <img className="pg-home-hero-art pg-home-hero-day" src="/overview/hero-day.svg" alt="" />
        {/* oxlint-disable-next-line next/no-img-element -- static local artwork is intentionally used as the dark home hero. */}
        <img className="pg-home-hero-art pg-home-hero-night" src="/overview/hero-night.svg" alt="" />
        <div className="pg-home-hero-vignette" />
        <div className="pg-home-brand-lockup">
          {/* oxlint-disable-next-line next/no-img-element -- final project logo is a local static asset. */}
          <img className="pg-home-logo" src="/logofinal/logo-pham-van.png?v=transparent-20260907" alt="" />
          <div className="pg-home-brand-copy">
            <h1>{projectName}</h1>
            <p>{subtitle}</p>
            <span aria-hidden="true">◆</span>
          </div>
        </div>
      </div>

      <div className="pg-home-flow">
        {showSample && (
          <aside className="pg-home-sample">
            <span className="pg-home-sample-icon"><Database /></span>
            <div><strong>{sampleTitle}</strong><p>{sampleDescription}</p></div>
            <ChevronRight className="pg-home-chevron" />
          </aside>
        )}

        <section className="pg-home-overview">
          <div className="pg-home-overview-title"><span>TỔNG QUAN DÒNG HỌ</span></div>
          <div className="pg-home-medallion" aria-hidden="true" />
          <div className="pg-home-stats">
            <article><Users /><strong>{memberCount}</strong><span>thành viên</span></article>
            <article><Network /><strong>{generationCount}</strong><span>thế hệ</span></article>
            <article><BookOpen /><strong>PHẠM<br />VĂN</strong><span>Gia phả</span></article>
          </div>
          <button className="pg-home-tree-action" type="button" onClick={openTree}>
            <TreePine /><strong>Cây gia phả</strong><ChevronRight />
          </button>
        </section>

        <blockquote className="pg-home-quote">
          <span>“Uống nước nhớ nguồn</span>
          <span>Ăn quả nhớ kẻ trồng cây”</span>
          <i aria-hidden="true">印</i>
        </blockquote>
      </div>
    </section>
  );

  return <>
    <style>{`
:root{--pg-red:#8d160f;--pg-red-deep:#2b0302;--pg-gold:#d7a847;--pg-gold-hi:#ffe59a;--pg-cream:#f8e9bd;--pg-text:#fff1ce;--pg-muted:#d5b993;--pg-navy:#06131e;--pg-navy2:#0d2b3f}
html[data-hue-mode='dark']{--pg-red:#0b2638;--pg-red-deep:#02090f;--pg-gold:#d5a94d;--pg-gold-hi:#f4d889;--pg-cream:#e4d3a6;--pg-text:#f6e7bc;--pg-muted:#aea692}
.app-shell.pg-home-active .content{position:relative!important;overflow:auto!important;background:var(--pg-red-deep)!important}
.app-shell.pg-home-active .content> :not(.pg-home-screen){display:none!important}
.app-shell.pg-home-active .guest-banner{display:none!important}
.pg-home-screen{position:relative;width:100%;min-height:100%;padding:0 0 34px;background:linear-gradient(180deg,#8f180f 0%,#641009 46%,#2c0302 100%);color:var(--pg-text);overflow:hidden}
html[data-hue-mode='dark'] .pg-home-screen{background:linear-gradient(180deg,#0e2f44 0%,#081d2a 48%,#02090f 100%)}
.pg-home-hero{position:relative;min-height:390px;overflow:hidden;background:#61100a}
.pg-home-hero-art{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 52%;transform:scale(1.015)}
.pg-home-hero-night{display:none}html[data-hue-mode='dark'] .pg-home-hero-day{display:none}html[data-hue-mode='dark'] .pg-home-hero-night{display:block}
.pg-home-hero-vignette{position:absolute;inset:0;background:linear-gradient(180deg,#2603023d 0%,transparent 26%,transparent 58%,#31040330 73%,#310403ee 100%),linear-gradient(90deg,#2a030235 0%,transparent 22%,transparent 78%,#2a030235 100%)}
html[data-hue-mode='dark'] .pg-home-hero-vignette{background:linear-gradient(180deg,#01070c55 0%,transparent 28%,transparent 58%,#02090f33 73%,#02090ff4 100%),linear-gradient(90deg,#02090f4d,transparent 22%,transparent 78%,#02090f4d)}
.pg-home-brand-lockup{position:absolute;z-index:3;top:30px;left:50%;width:min(620px,calc(100% - 36px));transform:translateX(-50%);display:flex;align-items:center;justify-content:center;gap:15px;text-align:left;text-shadow:0 2px 10px #280000ad}
.pg-home-logo{width:86px;height:86px;object-fit:contain;filter:drop-shadow(0 6px 12px #1b000078) drop-shadow(0 0 8px #f0c25655)}
.pg-home-brand-copy h1{margin:0;color:var(--pg-gold-hi);font-family:var(--font-serif),Georgia,serif;font-size:25px;font-weight:600;line-height:1.15;letter-spacing:.035em}.pg-home-brand-copy p{margin:6px 0 4px;color:#f5dfb8;font-size:12px}.pg-home-brand-copy span{display:block;color:var(--pg-gold);font-size:10px;text-align:center}
.pg-home-flow{position:relative;z-index:4;width:min(760px,calc(100% - 28px));margin:-22px auto 0;display:grid;gap:14px}
.pg-home-sample{position:relative;min-height:88px;padding:15px 48px 15px 62px;display:flex;align-items:center;border:1px solid #e1b657a8;border-radius:17px;background:linear-gradient(135deg,#7d120cf2,#3a0504f8);box-shadow:0 14px 32px #1900008c,inset 0 1px #ffe9aa28;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
html[data-hue-mode='dark'] .pg-home-sample{background:linear-gradient(135deg,#102f43f4,#06121bf8)}
.pg-home-sample-icon{position:absolute;left:17px;top:50%;width:35px;height:35px;transform:translateY(-50%);display:grid;place-items:center;border:1px solid #edc365;border-radius:50%;color:#f1c961}.pg-home-sample-icon svg{width:22px}.pg-home-sample strong{display:block;margin-bottom:5px;color:#ffe7ad;font-size:13px;line-height:1.28}.pg-home-sample p{margin:0;color:#dfc8a8;font-size:10px;line-height:1.55}.pg-home-chevron{position:absolute;right:15px;top:50%;width:24px;transform:translateY(-50%);color:#ffe3a0}
.pg-home-overview{position:relative;isolation:isolate;padding:67px 13px 22px;overflow:hidden;border:1px solid #d8ab4e9e;border-radius:23px;background:linear-gradient(145deg,#76120df8,#360404fb);box-shadow:0 22px 52px #1a00008c,inset 0 1px #ffe9a72d}
html[data-hue-mode='dark'] .pg-home-overview{background:linear-gradient(145deg,#102d40f8,#041019fb)}
.pg-home-medallion{position:absolute;z-index:-1;left:50%;top:51%;width:510px;max-width:124vw;aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;opacity:.78;background:radial-gradient(circle,transparent 0 8%,#d8aa4924 8.5% 9.2%,transparent 9.7% 17%,#d8aa492c 17.5% 18.2%,transparent 18.7% 28%,#d8aa4935 28.5% 29.2%,transparent 29.7% 39%,#d8aa493d 39.5% 40.2%,transparent 40.7%),repeating-conic-gradient(from 0deg,#d8aa4930 0 2deg,transparent 2deg 8deg,#d8aa491d 8deg 10deg,transparent 10deg 17deg);box-shadow:inset 0 0 0 1px #d8aa4966,inset 0 0 0 12px #d8aa460b,inset 0 0 0 14px #d8aa4638}
.pg-home-overview-title{position:absolute;top:18px;left:50%;transform:translateX(-50%);white-space:nowrap;padding:8px 19px;border:1px solid #e0b356;border-radius:999px;background:linear-gradient(180deg,#8c1b13,#520806);box-shadow:0 7px 20px #1b00006a,inset 0 1px #fff3;color:var(--pg-gold-hi);font-family:var(--font-serif),Georgia,serif;font-size:13px;font-weight:600;letter-spacing:.06em}html[data-hue-mode='dark'] .pg-home-overview-title{background:linear-gradient(180deg,#173b52,#07141e)}
.pg-home-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.pg-home-stats article{position:relative;min-height:128px;padding:18px 4px 12px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;overflow:hidden;border:1px solid #dfb45791;border-radius:17px;background:linear-gradient(158deg,#a22b1ece,#3c0504ee);box-shadow:0 12px 25px #1b000072,inset 0 1px #ffe9a52d}.pg-home-stats article:after{content:'';position:absolute;inset:5px;border:1px solid #d8aa492b;border-radius:13px;pointer-events:none}html[data-hue-mode='dark'] .pg-home-stats article{background:linear-gradient(158deg,#173c53d9,#06111bed)}
.pg-home-stats svg{position:relative;z-index:2;width:24px;height:24px;color:#f0c96e;stroke-width:1.6}.pg-home-stats strong{position:relative;z-index:2;color:var(--pg-gold-hi);font-family:var(--font-serif),Georgia,serif;font-size:31px;font-weight:600;line-height:1;text-align:center;text-shadow:0 2px 11px #0006}.pg-home-stats article:nth-child(3) strong{font-size:18px;line-height:1.04;letter-spacing:.04em}.pg-home-stats span{position:relative;z-index:2;color:var(--pg-muted);font-size:10px}
.pg-home-tree-action{position:relative;width:100%;height:62px;margin:18px 0 0;padding:0 56px 0 70px;display:flex;align-items:center;justify-content:center;border:1px solid #ffe29a;border-radius:21px;background:linear-gradient(180deg,#c33a28,#84140e);box-shadow:0 12px 28px #2100007d,inset 0 1px #fff5;color:var(--pg-gold-hi);font-family:var(--font-serif),Georgia,serif}.pg-home-tree-action>svg:first-child{position:absolute;left:22px;width:31px;height:31px;color:#efc768;stroke-width:1.45}.pg-home-tree-action>svg:last-child{position:absolute;right:20px;width:25px}.pg-home-tree-action strong{font-size:19px;font-weight:600}html[data-hue-mode='dark'] .pg-home-tree-action{background:linear-gradient(180deg,#1c4863,#091b29)}
.pg-home-quote{position:relative;min-height:154px;margin:0;padding:29px 34px;display:flex;flex-direction:column;align-items:center;justify-content:center;border:1px solid #d4a759a8;border-radius:15px;background:radial-gradient(circle at 16% 78%,#da6d694e 0 5%,transparent 5.5%),linear-gradient(180deg,#f2e3c1,#d7bd87);box-shadow:0 13px 30px #1a00006c,inset 0 0 0 5px #7c3c1710;color:#4e2819;font-family:var(--font-serif),Georgia,serif;font-size:18px;font-style:italic;font-weight:500;line-height:1.55;text-align:center}.pg-home-quote:before,.pg-home-quote:after{content:'';position:absolute;top:12px;bottom:12px;width:7px;border:1px solid #a2642e;border-radius:999px;background:linear-gradient(#c89145,#7b3e1e,#c89145)}.pg-home-quote:before{left:10px}.pg-home-quote:after{right:10px}.pg-home-quote i{margin-top:8px;color:#a72b1e;font-family:serif;font-size:17px;font-style:normal}html[data-hue-mode='dark'] .pg-home-quote{background:linear-gradient(180deg,#dfd0aa,#bba77d);color:#23313b}
@media(max-width:740px){
 html,body{background:var(--pg-red-deep)!important}.app-shell.pg-home-active{height:100dvh!important;min-height:100dvh!important;overflow:hidden!important}.app-shell.pg-home-active .workspace{height:100dvh!important;display:block!important}.app-shell.pg-home-active .filter-panel{display:none!important}.app-shell.pg-home-active .content{width:100%!important;height:100dvh!important;padding:0 0 calc(74px + env(safe-area-inset-bottom))!important;scrollbar-width:none!important;overscroll-behavior-y:contain!important}.app-shell.pg-home-active .content::-webkit-scrollbar{display:none!important}
 .app-shell.pg-home-active .topbar{position:fixed!important;z-index:120!important;top:0!important;left:0!important;right:0!important;height:calc(64px + env(safe-area-inset-top))!important;padding:calc(env(safe-area-inset-top) + 9px) 14px 8px!important;display:flex!important;align-items:center!important;justify-content:flex-end!important;gap:9px!important;border:0!important;background:linear-gradient(180deg,#210302b8 0%,#2103024d 60%,transparent 100%)!important;box-shadow:none!important}.app-shell.pg-home-active .topbar:after,.app-shell.pg-home-active .topbar .brand,.app-shell.pg-home-active .mobile-menu{display:none!important}html[data-hue-mode='dark'] .app-shell.pg-home-active .topbar{background:linear-gradient(180deg,#02080cc7 0%,#02080c52 60%,transparent 100%)!important}
 .app-shell.pg-home-active .language-select{display:flex!important;align-items:center!important;gap:6px!important;width:auto!important;height:38px!important;margin:0!important;padding:0 9px!important;border:1px solid #e0b14e9c!important;border-radius:13px!important;background:#520b08c9!important;backdrop-filter:blur(13px)!important;-webkit-backdrop-filter:blur(13px)!important}.app-shell.pg-home-active .language-select:before{content:'🇻🇳';font-size:13px}.app-shell.pg-home-active .language-select svg{display:none!important}.app-shell.pg-home-active .language-select select{min-width:76px!important;width:auto!important;padding:0 14px 0 0!important;border:0!important;background:transparent!important;box-shadow:none!important;color:var(--pg-text)!important;font-size:11px!important}html[data-hue-mode='dark'] .app-shell.pg-home-active .language-select{background:#06141ed0!important}.app-shell.pg-home-active .account-menu{margin:0!important}.app-shell.pg-home-active .profile{width:41px!important;height:41px!important;margin:0!important;border:1px solid #e2b351!important;background:linear-gradient(145deg,#8e1a11,#570906)!important;color:var(--pg-gold-hi)!important;font-family:var(--font-serif),Georgia,serif!important;font-size:16px!important}html[data-hue-mode='dark'] .app-shell.pg-home-active .profile{background:linear-gradient(145deg,#173b51,#07131d)!important}
 .tabs{position:fixed!important;z-index:130!important;left:0!important;right:0!important;bottom:0!important;top:auto!important;width:100%!important;height:calc(68px + env(safe-area-inset-bottom))!important;padding:6px 4px calc(5px + env(safe-area-inset-bottom))!important;display:grid!important;grid-template-columns:repeat(6,minmax(0,1fr))!important;gap:0!important;border-top:1px solid #d7aa4b84!important;background:linear-gradient(180deg,#3a0604f5,#1d0202fc)!important;box-shadow:0 -10px 30px #16000078!important;backdrop-filter:blur(18px)!important;-webkit-backdrop-filter:blur(18px)!important}html[data-hue-mode='dark'] .tabs{background:linear-gradient(180deg,#07141ef6,#02080dfc)!important;border-top-color:#c89b4968!important}.tabs button{min-width:0!important;height:54px!important;padding:5px 2px 2px!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:3px!important;border:0!important;background:transparent!important;color:#d8c4ad!important;font-size:8.2px!important;line-height:1.05!important}.tabs button svg{display:block!important;width:20px!important;height:20px!important;stroke-width:1.7!important}.tabs button.active{color:var(--pg-gold-hi)!important;text-shadow:0 0 12px #f4c95b55!important}.tabs button.active svg{filter:drop-shadow(0 0 5px #f5cb6290)}.bottom-tab-gold-line{top:1px!important;width:30px!important;height:2px!important}
 .pg-home-screen{padding-bottom:18px}.pg-home-hero{min-height:455px}.pg-home-hero-art{object-position:center 51%}.pg-home-brand-lockup{top:calc(env(safe-area-inset-top) + 73px);width:calc(100% - 28px);gap:11px;justify-content:flex-start}.pg-home-logo{width:76px;height:76px}.pg-home-brand-copy h1{font-size:20px}.pg-home-brand-copy p{font-size:10px;margin-top:5px}.pg-home-flow{width:calc(100% - 28px);margin-top:-30px;gap:13px}.pg-home-sample{min-height:85px;padding:14px 43px 14px 58px}.pg-home-sample strong{font-size:12px}.pg-home-sample p{font-size:9.5px}.pg-home-overview{padding:63px 11px 19px;border-radius:20px}.pg-home-overview-title{top:16px;font-size:12px;padding:7px 15px}.pg-home-stats{gap:7px}.pg-home-stats article{min-height:116px;border-radius:15px;padding:16px 3px 11px}.pg-home-stats svg{width:21px;height:21px}.pg-home-stats strong{font-size:27px}.pg-home-stats article:nth-child(3) strong{font-size:16px}.pg-home-stats span{font-size:9px}.pg-home-tree-action{height:57px;margin-top:16px}.pg-home-tree-action strong{font-size:17px}.pg-home-tree-action>svg:first-child{left:20px;width:28px;height:28px}.pg-home-quote{min-height:145px;padding:24px 30px;font-size:16px}
}
@media(max-width:390px){.pg-home-hero{min-height:430px}.pg-home-logo{width:68px;height:68px}.pg-home-brand-copy h1{font-size:18px}.pg-home-brand-copy p{font-size:9.5px}.pg-home-stats strong{font-size:25px}.pg-home-stats article:nth-child(3) strong{font-size:15px}.tabs button{font-size:7.7px!important}.tabs button svg{width:19px!important;height:19px!important}}
@media(prefers-reduced-motion:reduce){.pg-home-screen *{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
    `}</style>
    {homeActive && portalTarget ? createPortal(home, portalTarget) : null}
  </>;
}
