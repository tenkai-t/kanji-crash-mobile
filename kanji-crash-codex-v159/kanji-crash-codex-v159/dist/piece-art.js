(function (root, factory) {
    const art = factory(root,root.KanjiRules || (typeof require === 'function' ? require('./kanji-rules.js') : null));
    if (typeof module === 'object' && module.exports) module.exports = art;
    else root.KanjiPieceArt = art;
})(typeof window !== 'undefined' ? window : globalThis, function (root,rules) {
    'use strict';
    function circle(ctx, radius) { ctx.beginPath(); ctx.arc(0, 0, Math.max(0, radius), 0, Math.PI * 2); }
    function diamond(ctx, x, y, size) {
        ctx.beginPath(); ctx.moveTo(x, y - size); ctx.lineTo(x + size * 0.65, y);
        ctx.lineTo(x, y + size); ctx.lineTo(x - size * 0.65, y); ctx.closePath();
    }
    function draw(ctx, body, time, reducedMotion = false, options = {}) {
        const item = body.gameData, r = body.circleRadius, scale = body.traitScale || r / 26;
        const jis = rules.jisLevel(item), tier = rules.rarity[jis - 1];
        const attr = rules.attributes[item.attr] || rules.attributes.metal;
        const owner = item.isPlayer ? '#22d3ee' : '#fb7185';
        const shapePath = () => {
            if (!body.traitOutline) return circle(ctx,r);
            ctx.beginPath(); const c=Math.cos(body.angle),s=Math.sin(body.angle);
            body.traitOutline.forEach((v,i)=>{const x=v.x*c-v.y*s,y=v.x*s+v.y*c;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}); ctx.closePath();
        };
        ctx.save(); ctx.translate(body.position.x, body.position.y);
        if (item.skillFlashUntil > time) {
            circle(ctx, r + 10 * scale); ctx.strokeStyle = item.skillFlashColor || item.readingAbility?.color || '#fef08a';
            ctx.lineWidth = 3 * scale; ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 16;
            ctx.stroke(); ctx.shadowBlur = 0;
        }
        // Ownership stays separate from the attribute-colored face; enemy rings
        // are dashed so color alone is not needed to tell the sides apart.
        ctx.lineWidth = 2.2 * scale; ctx.strokeStyle = owner;
        ctx.setLineDash(item.isPlayer ? [] : [5 * scale, 3 * scale]);
        shapePath(); ctx.lineWidth=10*scale; ctx.stroke(); ctx.setLineDash([]);
        if (jis >= 3) {
            const halo = ctx.createRadialGradient(0, 0, r, 0, 0, r + 12);
            halo.addColorStop(0, jis === 4 ? '#f59e0b33' : '#facc1522'); halo.addColorStop(1, 'transparent');
            circle(ctx, r + 12); ctx.fillStyle = halo; ctx.fill();
        }
        const face = ctx.createRadialGradient(-r * 0.4, -r * 0.5, 1, 0, 0, r * 1.2);
        face.addColorStop(0, attr.base); face.addColorStop(0.4, attr.base); face.addColorStop(1, attr.dark);
        shapePath(); ctx.fillStyle = face; ctx.fill();
        ctx.strokeStyle = tier.edge; ctx.lineWidth = (jis >= 3 ? 2.8 : 1.6);
        ctx.shadowColor = tier.edge; ctx.shadowBlur = tier.glow; ctx.stroke(); ctx.shadowBlur = 0;
        ctx.save(); ctx.rotate(body.angle);
        if (jis >= 2 && !body.traitOutline) {
            circle(ctx, r - 4 * scale); ctx.strokeStyle = jis === 4 ? '#fde68a' : `${tier.edge}99`; ctx.lineWidth = scale; ctx.stroke();
            const count = jis === 2 ? 4 : jis === 3 ? 8 : 12;
            for (let i = 0; i < count; i++) {
                const a = i * Math.PI * 2 / count - Math.PI / 2;
                const radius = r - 1.5 * scale;
                diamond(ctx, Math.cos(a) * radius, Math.sin(a) * radius, (jis === 4 ? 2.8 : 2.1) * scale);
                ctx.fillStyle = jis === 4 && i % 3 === 0 ? '#f0abfc' : tier.edge; ctx.fill();
            }
        }
        if (jis === 4 && !body.traitOutline) {
            circle(ctx, r - 7 * scale); ctx.setLineDash([3 * scale, 4 * scale]);
            ctx.lineWidth = 0.8 * scale; ctx.strokeStyle = '#fde68a80'; ctx.stroke(); ctx.setLineDash([]);
        }
        ctx.restore();
        if(options.showOwner!==false){
            const y=r+10*scale;ctx.fillStyle=item.isPlayer?'#083344':'#4c0519';ctx.fillRect(-17*scale,y-7*scale,34*scale,15*scale);
            ctx.strokeStyle=owner;ctx.lineWidth=1.5*scale;ctx.strokeRect(-17*scale,y-7*scale,34*scale,15*scale);
            ctx.fillStyle='#ffffff';ctx.font=`bold ${11*scale}px "Kanji Unified Mincho", serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(item.isPlayer?'自分':'相手',0,y+scale);
        }
        if(item.traitState?.launchSpin&&Math.abs(body.angularVelocity)>.005){
            const sign=Math.sign(item.traitState.launchSpin),end=sign*1.8,radius=r+4*scale,x=Math.cos(end)*radius,y=Math.sin(end)*radius,tangent=end+sign*Math.PI/2;
            ctx.save();ctx.rotate(body.angle);ctx.strokeStyle='#fcd34d';ctx.lineWidth=2*scale;ctx.beginPath();ctx.arc(0,0,radius,0,end,sign<0);ctx.moveTo(x-6*scale*Math.cos(tangent-.5),y-6*scale*Math.sin(tangent-.5));ctx.lineTo(x,y);ctx.lineTo(x-6*scale*Math.cos(tangent+.5),y-6*scale*Math.sin(tangent+.5));ctx.stroke();ctx.restore();
        }
        if (jis >= 3) {
            const phase = reducedMotion ? 0 : time / 2600;
            for (let i = 0; i < (jis === 4 ? 4 : 2); i++) {
                const a = phase + i * Math.PI / 2 + Math.PI / 4;
                const distance = r + 7;
                ctx.fillStyle = jis === 4 ? '#fff7ed' : '#fde68a';
                diamond(ctx, Math.cos(a) * distance, Math.sin(a) * distance, 2); ctx.fill();
            }
        }
        if (['山','矢','盾','凹'].includes(item.char)) {
            ctx.save();ctx.rotate(body.angle);
            let frontY=-r;if(item.char==='盾'&&body.traitOutline){frontY=Math.min(...body.traitOutline.map(v=>v.y));const edge=body.traitOutline.filter(v=>Math.abs(v.y-frontY)<.001);if(edge.length>=2){ctx.beginPath();ctx.moveTo(edge[0].x,frontY);ctx.lineTo(edge[1].x,frontY);ctx.strokeStyle='#fde68a';ctx.lineWidth=3*scale;ctx.stroke();}}
            ctx.beginPath();ctx.moveTo(-4*scale,frontY-4*scale);ctx.lineTo(0,frontY-10*scale);ctx.lineTo(4*scale,frontY-4*scale);ctx.strokeStyle='#fef3c7';ctx.lineWidth=2*scale;ctx.stroke();ctx.restore();
        }
        if ((item.traitPowerMultiplier||1)!==1) {circle(ctx,r+9*scale);ctx.strokeStyle=item.char==='合'?'#34d399':'#f472b6';ctx.lineWidth=scale;ctx.setLineDash([3*scale,4*scale]);ctx.stroke();ctx.setLineDash([]);}
        // Keep the character and reading upright while the rim rotates.
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = `${root.KanjiCharacterFont?.weight()||700} ${Math.max((item.char==='一'?15:22) * scale,options.minCharacterSize||0)}px ${root.KanjiCharacterFont?.stack()||'"Kanji Unified Mincho", serif'}`;
        ctx.fillStyle = '#fff'; ctx.shadowColor = '#000'; ctx.shadowBlur = 3 * scale;
        ctx.fillText(item.char, 0, -0.5 * scale); ctx.shadowBlur = 0;
        if (options.showReading !== false && item.rubyUnlocked && item.ruby) {
            ctx.font = `600 ${Math.max(8, 9 * scale)}px "Kanji Unified Mincho", serif`; ctx.fillStyle = '#fef3c7';
            const count=item.equippedReadings?.length||1;
            ctx.fillText(item.ruby+(count>1?' +'+(count-1):''), 0, -17 * scale, r * 1.6);
        }
        ctx.font = `700 ${7.5 * scale}px "Inter", sans-serif`; ctx.fillStyle = tier.edge;
        if(options.showRarityText !== false)ctx.fillText(item.jis===5?'元素':`JIS${jis}`, -3 * scale, 17 * scale);
        // Explicit, high-contrast attribute seal beside every piece.
        ctx.translate(Math.min(r * .75,22*scale), Math.min(r * .73,22*scale));
        circle(ctx, Math.max(8, 8.5 * scale)); ctx.fillStyle = attr.dark; ctx.fill();
        ctx.lineWidth = Math.max(1, 1.3 * scale); ctx.strokeStyle = attr.light; ctx.stroke();
        ctx.font = `700 ${Math.max(11, 12 * scale)}px "Kanji Unified Mincho", serif`; ctx.fillStyle = attr.light;
        ctx.fillText(attr.name, 0, 0); ctx.restore();
    }
    return { draw };
});
