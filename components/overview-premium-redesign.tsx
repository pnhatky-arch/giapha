'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bell, BookOpen, CalendarDays, ChevronRight, Database, FileText, Home, Languages, Network, Settings, TreeDeciduous, Users } from 'lucide-react';

const HOME_LABEL = 'tổng quan';

type LanguageOption = { value: string; label: string };

const NAV_ITEMS = [
  { label: 'Tổng quan', icon: Home },
  { label: 'Cây gia phả', icon: TreeDeciduous },
  { label: 'Thành viên', icon: Users },
  { label: 'Sự kiện', icon: CalendarDays },
  { label: 'Tư liệu', icon: FileText },
  { label: 'Cài đặt', icon: Settings },
] as const;

function normalize(value?: string | null) {
  return (value ?? '').trim().toLocaleLowerCase('vi');
}

function findTab(label: string) {
  const needle = normalize(label);
  return Array.from(document.querySelectorAll<HTMLButtonElement>('.tabs button')).find((button) => normalize(button.textContent).includes(needle));
}

function setNativeSelectValue(select: HTMLSelectElement, value: string) {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
  descriptor?.set?.call(select, value);
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

export default function OverviewPremiumRedesign() {
  const [homeActive, setHomeActive] = useState(false);
  const [memberCount, setMemberCount] = useState('68');
  const [generationCount, setGenerationCount] = useState('6');
  const [projectName, setProjectName] = useState('GIA PHẢ HỌ PHẠM VĂN');
  const [subtitle, setSubtitle] = useState('Gìn giữ cội nguồn · Kết nối thế hệ');
  const [showSample, setShowSample] = useState(true);
  const [language, setLanguage] = useState('vi');
  const [languageOptions, setLanguageOptions] = useState<LanguageOption[]>([{ value: 'vi', label: 'Tiếng Việt' }]);
  const [accountInitials, setAccountInitials] = useState('D');
  const [unread, setUnread] = useState('');

  const sync = useCallback(() => {
    const shell = document.querySelector<HTMLElement>('.app-shell');
    if (!shell) {
      setHomeActive(false);
      document.documentElement.classList.remove('pg-home-v4-active');
      return;
    }

    const activeButton = shell.querySelector<HTMLButtonElement>('.tabs button.active');
    const isHome = normalize(activeButton?.textContent).includes(HOME_LABEL);
    setHomeActive(isHome);
    shell.classList.toggle('pg-home-active', isHome);
    document.documentElement.classList.toggle('pg-home-v4-active', isHome);
    document.documentElement.dataset.pgOverview = 'v4';

    const brand = shell.querySelector<HTMLElement>('.brand .system-name, .tab-brand .system-name, .tab-fallback-brand .system-name');
    const brandSubtitle = shell.querySelector<HTMLElement>('.brand-copy p, .tab-brand p, .tab-fallback-brand p');
    if (brand?.textContent?.trim()) setProjectName(brand.textContent.trim());
    if (brandSubtitle?.textContent?.trim()) setSubtitle(brandSubtitle.textContent.trim());

    const values = Array.from(shell.querySelectorAll<HTMLElement>('.overview-stats strong'));
    if (values[0]?.textContent?.trim()) setMemberCount(values[0].textContent.trim());
    if (values[1]?.textContent?.trim()) setGenerationCount(values[1].textContent.trim());
    setShowSample(Boolean(shell.querySelector('.sample-data-banner')));

    const languageSelect = shell.querySelector<HTMLSelectElement>('.language-select select');
    if (languageSelect) {
      setLanguage(languageSelect.value);
      const options = Array.from(languageSelect.options).map((option) => ({ value: option.value, label: option.textContent?.trim() || option.value }));
      if (options.length) setLanguageOptions(options);
    }

    const profile = shell.querySelector<HTMLButtonElement>('.profile');
    const initials = profile?.textContent?.trim();
    if (initials) setAccountInitials(initials.slice(0, 2).toUpperCase());

    const unreadBadge = document.querySelector<HTMLElement>('.change-notify-bell b');
    setUnread(unreadBadge?.textContent?.trim() || '');
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

    const handleTabClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('.tabs button') : null;
      if (!target) return;
      const isHome = normalize(target.textContent).includes(HOME_LABEL);
      setHomeActive(isHome);
      document.querySelector('.app-shell')?.classList.toggle('pg-home-active', isHome);
      document.documentElement.classList.toggle('pg-home-v4-active', isHome);
      requestAnimationFrame(sync);
    };

    document.addEventListener('click', handleTabClick, true);
    openHomeOnce();

    const observer = new MutationObserver(() => {
      openHomeOnce();
      schedule();
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

    const timer = window.setTimeout(() => {
      openHomeOnce();
      schedule();
    }, 250);

    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener('click', handleTabClick, true);
      document.querySelector('.app-shell')?.classList.remove('pg-home-active');
      document.documentElement.classList.remove('pg-home-v4-active');
    };
  }, [sync]);

  const openTab = (label: string) => {
    const target = findTab(label);
    if (!target) return;
    if (label !== 'Tổng quan') {
      setHomeActive(false);
      document.querySelector('.app-shell')?.classList.remove('pg-home-active');
      document.documentElement.classList.remove('pg-home-v4-active');
    }
    target.click();
  };

  const changeLanguage = (value: string) => {
    const select = document.querySelector<HTMLSelectElement>('.app-shell .language-select select');
    setLanguage(value);
    if (select) setNativeSelectValue(select, value);
  };

  const openProfile = () => document.querySelector<HTMLButtonElement>('.app-shell .profile')?.click();
  const openNotifications = () => window.dispatchEvent(new Event('pg-open-notifications'));

  return <>
    <style>{`
:root{--pg-red:#94180f;--pg-red-2:#6d0d08;--pg-deep:#2b0302;--pg-gold:#d8a748;--pg-gold-hi:#ffe6a0;--pg-cream:#f3dfb9;--pg-ink:#5d1710;--pg-text:#fff1cf;--pg-muted:#d8bf9d;--pg-navy:#061827;--pg-navy-2:#0d2c40}
html[data-hue-mode='dark']{--pg-red:#0d3045;--pg-red-2:#081f2e;--pg-deep:#02090f;--pg-gold:#d5aa52;--pg-gold-hi:#f6db90;--pg-cream:#e8d4a7;--pg-ink:#e9d9b3;--pg-text:#f7e9bf;--pg-muted:#b9af98;--pg-navy:#061827;--pg-navy-2:#0d2c40}
html.pg-home-v4-active,html.pg-home-v4-active body{overflow:hidden!important;background:var(--pg-deep)!important}
.app-shell.pg-home-active .topbar,.app-shell.pg-home-active .workspace{visibility:hidden!important;pointer-events:none!important}
.pg-home-v4{position:fixed;z-index:10000;inset:0;overflow-x:hidden;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior-y:contain;padding:0 0 calc(82px + env(safe-area-inset-bottom));background:linear-gradient(180deg,#ad2518 0%,#7c1009 52%,#2b0302 100%);color:var(--pg-text);scrollbar-width:none}
.pg-home-v4::-webkit-scrollbar{display:none}html[data-hue-mode='dark'] .pg-home-v4{background:linear-gradient(180deg,#123b54 0%,#081f2e 52%,#02090f 100%)}
.pg4-hero{position:relative;height:clamp(405px,50svh,470px);overflow:hidden;background:#7a140c;border-bottom:1px solid #e7bd6355}
.pg4-hero-art{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 50%;transform:scale(1.015)}
.pg4-hero-night{display:none}html[data-hue-mode='dark'] .pg4-hero-day{display:none}html[data-hue-mode='dark'] .pg4-hero-night{display:block}
.pg4-hero-shade{position:absolute;inset:0;background:linear-gradient(180deg,#26030224 0%,transparent 17%,transparent 58%,#30040222 74%,#300402d8 100%),linear-gradient(90deg,#2503022f,transparent 20%,transparent 80%,#2503022f);pointer-events:none}html[data-hue-mode='dark'] .pg4-hero-shade{background:linear-gradient(180deg,#01070c38 0%,transparent 18%,transparent 60%,#02090f25 74%,#02090fe2 100%),linear-gradient(90deg,#02090f40,transparent 20%,transparent 80%,#02090f40)}
.pg4-top{position:absolute;z-index:4;top:calc(env(safe-area-inset-top) + 13px);left:16px;right:14px;display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.pg4-logo{width:93px;height:93px;object-fit:contain;filter:drop-shadow(0 5px 12px #20000085) drop-shadow(0 0 8px #f2c75d56)}
.pg4-actions{display:flex;align-items:center;gap:8px}.pg4-language{height:39px;min-width:118px;padding:0 11px;display:flex;align-items:center;gap:7px;border:1px solid #e2b452c2;border-radius:13px;background:#650e09c9;box-shadow:0 8px 22px #25000037;backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);color:#fff0c9}.pg4-language svg{width:15px;height:15px;color:#f1c96d}.pg4-language:before{content:'🇻🇳';font-size:13px}.pg4-language select{width:78px;padding:0;border:0!important;outline:0;background:transparent!important;color:inherit;font-size:11px;appearance:auto}.pg4-language option{color:#2c0a06;background:#f8ead1}html[data-hue-mode='dark'] .pg4-language{background:#061827d8}html[data-hue-mode='dark'] .pg4-language option{color:#f6e7bd;background:#061827}
.pg4-account,.pg4-bell{position:relative;width:42px;height:42px;display:grid;place-items:center;border:1px solid #e2b452;border-radius:50%;background:linear-gradient(145deg,#9b2016,#5f0b07);color:#ffe59a;box-shadow:0 8px 22px #2300004d;font-family:var(--font-serif),Georgia,serif}.pg4-account{font-size:17px}.pg4-bell svg{width:20px;height:20px}.pg4-bell b{position:absolute;right:-4px;top:-4px;min-width:17px;height:17px;padding:0 4px;display:grid;place-items:center;border:2px solid #6f0d08;border-radius:999px;background:#e1262e;color:white;font:700 8px/1 system-ui}html[data-hue-mode='dark'] .pg4-account,html[data-hue-mode='dark'] .pg4-bell{background:linear-gradient(145deg,#184764,#081824)}
.pg4-title{position:absolute;z-index:3;top:calc(env(safe-area-inset-top) + 108px);left:116px;right:14px;text-align:center;text-shadow:0 2px 11px #3b08077d}.pg4-title h1{margin:0;color:var(--pg-gold-hi);font-family:var(--font-serif),Georgia,serif;font-size:clamp(20px,5.5vw,26px);font-weight:650;line-height:1.12;letter-spacing:.035em}.pg4-title p{margin:7px 0 7px;color:#f5dfb8;font-size:11px;line-height:1.25}.pg4-divider{display:flex;align-items:center;justify-content:center;gap:7px;color:#e7bb5b;font-size:9px}.pg4-divider:before,.pg4-divider:after{content:'';width:42px;height:1px;background:linear-gradient(90deg,transparent,#e1b557)}.pg4-divider:after{transform:scaleX(-1)}
.pg4-flow{position:relative;z-index:5;width:calc(100% - 28px);max-width:760px;margin:-18px auto 0;display:grid;gap:12px}.pg4-sample{position:relative;min-height:82px;padding:14px 43px 14px 63px;display:flex;align-items:center;border:1px solid #d9a944;border-radius:17px;background:linear-gradient(135deg,#f9edd5,#e8cf9e);box-shadow:0 14px 34px #2800006b,inset 0 1px #fff9;color:#6e160e}.pg4-sample:before,.pg4-sample:after{content:'⌁';position:absolute;top:4px;color:#b77928;font-size:16px}.pg4-sample:before{left:7px}.pg4-sample:after{right:7px;transform:scaleX(-1)}html[data-hue-mode='dark'] .pg4-sample{background:linear-gradient(135deg,#0d2d43,#061827);color:#f5e4b8;border-color:#d5aa52}
.pg4-sample-icon{position:absolute;left:16px;top:50%;width:37px;height:37px;transform:translateY(-50%);display:grid;place-items:center;border:1px solid currentColor;border-radius:50%;color:#a91f16}.pg4-sample-icon svg{width:22px;height:22px}.pg4-sample strong{display:block;margin:0 0 4px;font-size:12px;line-height:1.28}.pg4-sample p{margin:0;color:#835143;font-size:9.6px;line-height:1.45}html[data-hue-mode='dark'] .pg4-sample-icon{color:#e1bc69}html[data-hue-mode='dark'] .pg4-sample p{color:#d5c4a4}.pg4-sample>.pg4-chevron{position:absolute;right:13px;top:50%;width:24px;transform:translateY(-50%);color:currentColor}
.pg4-overview{position:relative;isolation:isolate;padding:64px 10px 18px;overflow:hidden;border:1px solid #d7a545;border-radius:20px;background:linear-gradient(145deg,#9d2016f7,#5a0805fb);box-shadow:0 20px 45px #1f00007c,inset 0 1px #fff2}.pg4-overview:before,.pg4-overview:after{content:'❦';position:absolute;top:8px;color:#dcb358;font-size:26px;opacity:.8}.pg4-overview:before{left:8px}.pg4-overview:after{right:8px;transform:scaleX(-1)}html[data-hue-mode='dark'] .pg4-overview{background:linear-gradient(145deg,#0f3148f8,#04111bfb)}
.pg4-pattern{position:absolute;z-index:-2;inset:-35% -20% auto;height:120%;opacity:.34;background:repeating-conic-gradient(from 0deg,#f5c86133 0 2deg,transparent 2deg 10deg),radial-gradient(circle at center,transparent 0 22%,#edc0602f 22.5% 23%,transparent 23.5% 35%,#edc06026 35.5% 36%,transparent 36.5%);mask-image:linear-gradient(#000 0 76%,transparent)}
.pg4-section-title{position:absolute;z-index:2;top:17px;left:50%;transform:translateX(-50%);white-space:nowrap;display:flex;align-items:center;gap:8px;color:var(--pg-gold-hi);font-family:var(--font-serif),Georgia,serif;font-size:12px;font-weight:650;letter-spacing:.06em}.pg4-section-title strong{padding:7px 16px;border:1px solid #e2b454;border-radius:999px;background:linear-gradient(180deg,#8b1710,#570805);box-shadow:0 7px 18px #25000065,inset 0 1px #fff2}.pg4-section-title i{width:35px;height:11px;position:relative;border-top:1px solid #d8aa4c;border-bottom:1px solid #d8aa4c;border-radius:50%;opacity:.85}.pg4-section-title i:first-child:before,.pg4-section-title i:last-child:before{content:'◇';position:absolute;top:-8px;color:#e3b65a;font-style:normal}.pg4-section-title i:first-child:before{left:-3px}.pg4-section-title i:last-child:before{right:-3px}html[data-hue-mode='dark'] .pg4-section-title strong{background:linear-gradient(180deg,#16425d,#071722)}
.pg4-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}.pg4-stat{position:relative;min-height:137px;padding:15px 3px 11px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;overflow:hidden;border:1px solid #e0b254;border-radius:15px;background-image:linear-gradient(180deg,#9f2a1eda 0%,#5a0b07d8 58%,#380503ef 100%),url('/overview/hero-day.svg');background-size:cover,220%;background-position:center,center bottom;box-shadow:0 10px 22px #24000065,inset 0 1px #fff2}.pg4-stat:before{content:'';position:absolute;inset:5px;border:1px solid #e2b65b38;border-radius:11px}.pg4-stat:after{content:'';position:absolute;left:0;right:0;bottom:0;height:34%;background:linear-gradient(transparent,#3003017d);pointer-events:none}html[data-hue-mode='dark'] .pg4-stat{background-image:linear-gradient(180deg,#173e55d8 0%,#092235d8 58%,#03101bef 100%),url('/overview/hero-night.svg')}
.pg4-stat svg{position:relative;z-index:2;width:24px;height:24px;color:#f0c86a;stroke-width:1.7}.pg4-stat strong{position:relative;z-index:2;color:var(--pg-gold-hi);font-family:var(--font-serif),Georgia,serif;font-size:31px;font-weight:650;line-height:.98;text-align:center;text-shadow:0 2px 10px #0009}.pg4-stat.family strong{font-size:18px;line-height:1.02;letter-spacing:.04em}.pg4-stat span{position:relative;z-index:2;color:#f1dcb6;font-size:9.5px;text-shadow:0 1px 4px #0009}
.pg4-tree{position:relative;width:calc(100% - 8px);height:65px;margin:17px auto 0;padding:0 52px 0 74px;display:flex;align-items:center;justify-content:center;border:1px solid #ffe39c;border-radius:22px;background:linear-gradient(180deg,#ca3827,#8b120c);box-shadow:0 12px 28px #24000078,inset 0 1px #fff5;color:var(--pg-gold-hi);font-family:var(--font-serif),Georgia,serif}.pg4-tree:before,.pg4-tree:after{content:'❦';position:absolute;top:50%;transform:translateY(-50%);width:37px;height:54px;display:grid;place-items:center;border:1px solid #d8a744;border-radius:50%;background:#73100b;color:#e8bd62;font-size:19px}.pg4-tree:before{left:-10px}.pg4-tree:after{right:-10px;transform:translateY(-50%) scaleX(-1)}.pg4-tree>svg:first-of-type{position:absolute;left:25px;width:34px;height:34px;color:#f0c96a;stroke-width:1.35}.pg4-tree>svg:last-of-type{position:absolute;right:18px;width:25px}.pg4-tree strong{font-size:18px;font-weight:650}html[data-hue-mode='dark'] .pg4-tree{background:linear-gradient(180deg,#17455f,#071b2a)}html[data-hue-mode='dark'] .pg4-tree:before,html[data-hue-mode='dark'] .pg4-tree:after{background:#071b29}
.pg4-quote{position:relative;min-height:134px;margin:0;padding:22px 35px 20px;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;border:1px solid #d3a45a;border-radius:14px;background:linear-gradient(90deg,#f2dfbaed,#f7e8caed),url('/overview/hero-day.svg');background-size:cover,105%;background-position:center,center 73%;box-shadow:0 12px 26px #1f00005c;color:#4c281b;font-family:var(--font-serif),Georgia,serif;font-size:16px;font-style:italic;font-weight:600;line-height:1.45;text-align:center}.pg4-quote:before,.pg4-quote:after{content:'';position:absolute;top:8px;bottom:8px;width:9px;border:1px solid #97602d;border-radius:999px;background:linear-gradient(#d4a04c,#7c401e,#d4a04c);box-shadow:inset 0 0 0 2px #f5d68870}.pg4-quote:before{left:9px}.pg4-quote:after{right:9px}.pg4-quote small{margin-top:7px;color:#a62e21;font-size:15px;font-style:normal;letter-spacing:.15em}.pg4-lotus{position:absolute;left:22px;bottom:10px;color:#b8434a;font-size:28px;font-style:normal;opacity:.85}.pg4-gate{position:absolute;right:26px;bottom:8px;font-size:34px;font-style:normal;opacity:.42}html[data-hue-mode='dark'] .pg4-quote{background:linear-gradient(90deg,#e5d2a8ea,#d5c195ea),url('/overview/hero-night.svg');color:#21313d}
.pg4-nav{position:fixed;z-index:10020;left:0;right:0;bottom:0;height:calc(72px + env(safe-area-inset-bottom));padding:5px 4px calc(5px + env(safe-area-inset-bottom));display:grid;grid-template-columns:repeat(6,minmax(0,1fr));border-top:1px solid #dbad4b9c;background:linear-gradient(180deg,#630b07f5,#300302fd);box-shadow:0 -10px 30px #18000070;backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px)}html[data-hue-mode='dark'] .pg4-nav{background:linear-gradient(180deg,#092235f5,#02090ffd);border-top-color:#d1a6517d}.pg4-nav button{position:relative;min-width:0;padding:4px 1px 2px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;border:0;background:transparent;color:#e3d2b9;font-size:8.2px;line-height:1.05}.pg4-nav button svg{width:20px;height:20px;stroke-width:1.65}.pg4-nav button.active{color:var(--pg-gold-hi);text-shadow:0 0 11px #f5cb615a}.pg4-nav button.active:before{content:'';position:absolute;top:-5px;width:35px;height:3px;border-radius:99px;background:#f3ca65;box-shadow:0 0 11px #f3ca65}.pg4-nav button.active svg{filter:drop-shadow(0 0 5px #f4c95a8a)}
@media(max-width:390px){.pg4-hero{height:405px}.pg4-logo{width:82px;height:82px}.pg4-actions{gap:6px}.pg4-language{min-width:105px;padding:0 8px}.pg4-language select{width:68px}.pg4-account,.pg4-bell{width:39px;height:39px}.pg4-title{top:calc(env(safe-area-inset-top) + 98px);left:103px}.pg4-title h1{font-size:19px}.pg4-title p{font-size:9.5px}.pg4-flow{width:calc(100% - 22px);gap:10px}.pg4-sample{min-height:76px}.pg4-overview{padding-top:61px}.pg4-stats{gap:5px}.pg4-stat{min-height:126px}.pg4-stat strong{font-size:28px}.pg4-stat.family strong{font-size:16px}.pg4-tree{height:59px;margin-top:14px}.pg4-quote{min-height:121px;font-size:14.7px}.pg4-nav button{font-size:7.5px}.pg4-nav button svg{width:19px;height:19px}}
@media(min-width:741px){.pg4-hero{height:min(56vh,560px)}.pg4-top,.pg4-title{max-width:740px;margin-left:auto;margin-right:auto}.pg4-top{left:50%;right:auto;width:min(740px,calc(100% - 36px));transform:translateX(-50%)}.pg4-title{left:50%;right:auto;width:min(610px,calc(100% - 180px));transform:translateX(-38%)}.pg4-flow{margin-top:-26px}.pg4-nav{left:50%;width:min(760px,100%);transform:translateX(-50%);border-left:1px solid #d9aa4b55;border-right:1px solid #d9aa4b55}}
@media(prefers-reduced-motion:reduce){.pg-home-v4 *{transition:none!important;animation:none!important}}
    `}</style>

    {homeActive ? <main className="pg-home-v4" aria-label="Tổng quan dòng họ">
      <section className="pg4-hero">
        {/* oxlint-disable-next-line next/no-img-element -- project-owned static artwork. */}
        <img className="pg4-hero-art pg4-hero-day" src="/overview/hero-day.svg?v=4" alt="" />
        {/* oxlint-disable-next-line next/no-img-element -- project-owned static artwork. */}
        <img className="pg4-hero-art pg4-hero-night" src="/overview/hero-night.svg?v=4" alt="" />
        <div className="pg4-hero-shade" />

        <div className="pg4-top">
          {/* oxlint-disable-next-line next/no-img-element -- final project logo asset. */}
          <img className="pg4-logo" src="/logofinal/logo-pham-van.png?v=transparent-20260907" alt="" />
          <div className="pg4-actions">
            <label className="pg4-language" aria-label="Ngôn ngữ"><Languages /><select value={language} onChange={(event) => changeLanguage(event.target.value)}>{languageOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            <button type="button" className="pg4-account" onClick={openProfile} aria-label="Tài khoản">{accountInitials}</button>
            <button type="button" className="pg4-bell" onClick={openNotifications} aria-label="Thông báo"><Bell />{unread ? <b>{unread}</b> : null}</button>
          </div>
        </div>

        <div className="pg4-title"><h1>{projectName}</h1><p>{subtitle}</p><div className="pg4-divider"><span>❧</span></div></div>
      </section>

      <div className="pg4-flow">
        {showSample ? <aside className="pg4-sample"><span className="pg4-sample-icon"><Database /></span><div><strong>Dữ liệu thử nghiệm · {memberCount} thành viên · {generationCount} đời</strong><p>Khi bắt đầu nhập dữ liệu chính thức, toàn bộ dữ liệu thử nghiệm sẽ bị xóa.</p></div><ChevronRight className="pg4-chevron" /></aside> : null}

        <section className="pg4-overview">
          <div className="pg4-pattern" aria-hidden="true" />
          <div className="pg4-section-title"><i /><strong>TỔNG QUAN DÒNG HỌ</strong><i /></div>
          <div className="pg4-stats">
            <article className="pg4-stat"><Users /><strong>{memberCount}</strong><span>thành viên</span></article>
            <article className="pg4-stat"><Network /><strong>{generationCount}</strong><span>thế hệ</span></article>
            <article className="pg4-stat family"><BookOpen /><strong>PHẠM<br />VĂN</strong><span>Gia phả</span></article>
          </div>
          <button className="pg4-tree" type="button" onClick={() => openTab('Cây gia phả')}><TreeDeciduous /><strong>Cây gia phả</strong><ChevronRight /></button>
        </section>

        <blockquote className="pg4-quote"><span>“Uống nước nhớ nguồn</span><span>Ăn quả nhớ kẻ trồng cây”</span><small>印</small><i className="pg4-lotus">✿</i><i className="pg4-gate">門</i></blockquote>
      </div>

      <nav className="pg4-nav" aria-label="Điều hướng chính">{NAV_ITEMS.map(({ label, icon: Icon }) => <button key={label} type="button" className={label === 'Tổng quan' ? 'active' : ''} onClick={() => openTab(label)}><Icon /><span>{label}</span></button>)}</nav>
    </main> : null}
  </>;
}
