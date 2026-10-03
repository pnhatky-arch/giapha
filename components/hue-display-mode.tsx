'use client';
import {useEffect,useState} from 'react';
import {Moon,Sun} from 'lucide-react';

const KEY='gia-pha-hue-display-mode-v1';
type Mode='light'|'dark';
function apply(mode:Mode){document.documentElement.dataset.hueMode=mode;document.documentElement.style.colorScheme=mode==='dark'?'dark':'light';}
export default function HueDisplayMode(){
 const[mode,setMode]=useState<Mode>('light');
 useEffect(()=>{const saved=window.localStorage.getItem(KEY);const next:Mode=saved==='dark'?'dark':'light';setMode(next);apply(next)},[]);
 const choose=(next:Mode)=>{setMode(next);apply(next);try{localStorage.setItem(KEY,next)}catch{}};
 return <><section className="hue-display-setting" aria-label="Chế độ hiển thị"><div className="hue-display-heading"><span>Chế độ hiển thị</span><small>Lưu riêng trên thiết bị này</small></div><div className="hue-mode-options"><button type="button" className={mode==='light'?'selected':''} onClick={()=>choose('light')} aria-pressed={mode==='light'}><Sun/><span><strong>Light mode</strong><small>Đỏ son Huế · Mặc định</small></span></button><button type="button" className={mode==='dark'?'selected':''} onClick={()=>choose('dark')} aria-pressed={mode==='dark'}><Moon/><span><strong>Dark mode</strong><small>Lam đen cung đình</small></span></button></div></section><style>{`
 .hue-display-setting{margin:0 0 14px;padding:18px;border:1px solid #d6a44255;border-radius:18px;background:linear-gradient(145deg,#5c0c08e8,#390605e8);box-shadow:0 14px 35px #2401003d,inset 0 1px #ffe39a18;color:#f0cf78}.hue-display-heading{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-bottom:13px}.hue-display-heading span{font-size:17px;font-weight:400}.hue-display-heading small{font-size:10px;color:#c6a98a}.hue-mode-options{display:grid;grid-template-columns:1fr 1fr;gap:10px}.hue-mode-options button{display:flex;align-items:center;gap:10px;min-height:64px;padding:11px 12px;border:1px solid #c9973d45;border-radius:14px;background:#2b050447;color:#d9b97b;text-align:left}.hue-mode-options button svg{width:20px;height:20px;flex:0 0 20px}.hue-mode-options button span{display:grid;gap:2px}.hue-mode-options strong{font-size:13px;font-weight:500}.hue-mode-options small{font-size:9px;opacity:.72}.hue-mode-options button.selected{border-color:#efc65e;background:linear-gradient(145deg,#a52619,#6e100b);color:#ffe09a;box-shadow:0 0 0 2px #e6b84d1f,inset 0 1px #ffe59d42}
 html[data-hue-mode='dark'] .hue-display-setting{background:linear-gradient(145deg,#101a24f2,#071019f2);border-color:#c99b475e;box-shadow:0 14px 35px #0008,inset 0 1px #f6d47b17}html[data-hue-mode='dark'] .hue-mode-options button{background:#08121cc7;border-color:#c99b473b}html[data-hue-mode='dark'] .hue-mode-options button.selected{background:linear-gradient(145deg,#173047,#08131f);border-color:#e5b957;color:#f4d27c}
 @media(max-width:580px){.hue-display-setting{padding:15px}.hue-mode-options{gap:8px}.hue-mode-options button{padding:10px;min-height:60px}}
 `}</style></>;
}
