import {PLATFORMER_SECTORS} from './platformer-engine.js';

export function platformerLanding(m){
 const challenges=['断崖起跳 · 踩敌反弹','连塌平台 · 空中冲刺','高炉喷口 · 等待窗口','升降踏板 · 交错锯轮','窄桥连跳 · 连续落点','复合机关 · 最后突围'];
 return `<main id="main" class="adventure-landing platformer-landing" style="--adv:#b63f32">
 <section class="zhanzhan-intro"><div class="zhanzhan-copy"><div class="zhanzhan-edition"><img src="/assets/lgd-logo.png" alt="LGD Gaming" width="38" height="38"><span>时光跃迁 / 战战特别行动</span></div><h1>发条群岛<span>六重炼狱。</span></h1><p>这次，陪战战闯到最后。跨越断崖、躲过高炉，在崩塌之前踩准下一块落点。</p><dl class="zhanzhan-specs"><div><dt>连续区域</dt><dd>06</dd></div><div><dt>初始机芯</dt><dd>02</dd></div><div><dt>有限驿站</dt><dd>02</dd></div></dl><button class="primary" data-adventure-start="platformer" data-adventure-mode="extreme">挑战炼狱 →</button><small class="zhanzhan-version">规则 v2 · 旧版成绩保留，新版独立排名</small></div>
 <div class="zhanzhan-stage"><div class="zhanzhan-stage-caption"><span>发条群岛 / 实机场景</span><b>HELL EXPEDITION</b></div><canvas id="adventure-preview" width="960" height="540" aria-label="战战在发条群岛的游戏场景预览"></canvas><div class="zhanzhan-cast"><span class="zhanzhan-portrait" role="img" aria-label="佩戴 LGD 圆形徽标的战战"></span><div><small>你的冒险伙伴</small><h2>战战 <span>ZHANZHAN</span></h2><p>长按跳得更高，冲刺跨过裂缝。<br>勇气有用，落点更重要。</p></div><b class="zhanzhan-cast-no">20</b></div></div></section>
 <section class="zhanzhan-route"><header><div><span>远征路线</span><h2>越往后，越没有喘息。</h2></div><p>每两段仅有一处检查点，不恢复机芯。<br>橙色预警后，高炉喷口会变为危险区。</p></header><ol>${PLATFORMER_SECTORS.map((s,i)=>`<li><span>${String(i+1).padStart(2,'0')}</span><b>${s.name}</b><small>${challenges[i]}</small>${i===2||i===4?'<em>入口驿站</em>':''}</li>`).join('')}</ol></section>
 <section class="adventure-mode-section"><header><h2>选择挑战方式</h2><p>不是熬过倒计时，而是亲手闯过终点。</p></header><div class="adventure-mode-list">${Object.entries(m.modes).map(([mode,[name,desc]],i)=>`<button data-adventure-start="platformer" data-adventure-mode="${mode}" class="adventure-mode"><span class="adventure-mode-index">${['06','∞','01'][i]}</span><span><b>${name}</b><small>${desc}</small></span><span aria-hidden="true">↗</span></button>`).join('')}</div></section>
 <section class="adventure-manual"><h2>记住三个动作。<br>剩下的，交给练习。</h2><ol>${m.tips.map((tip,i)=>`<li><span>0${i+1}</span>${tip}</li>`).join('')}</ol></section></main>`;
}

export function platformerSectorRail(){return `<div class="platformer-sector-rail" aria-label="六段群岛路线">${PLATFORMER_SECTORS.map((s,i)=>`<span data-platformer-sector="${i}"><i>${String(i+1).padStart(2,'0')}</i>${s.name}</span>`).join('')}</div>`}
