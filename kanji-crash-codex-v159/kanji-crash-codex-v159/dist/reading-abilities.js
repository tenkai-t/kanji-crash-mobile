(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else { root.KanjiReadAbilities = api; root.KANJI_READING_ABILITIES = {}; }
})(typeof window !== 'undefined' ? window : globalThis, function () {
    'use strict';
    const abilities = {
        sturdy: { id: 'sturdy', name: '復活', role: 'survival', color: '#facc15', chance: 1, description: '相手に押されて落ちる時、相手と重ならない土俵内の別の位置へ戻って停止。1対局1回、必ず発動。安全な戻り先が必要。' },
        guard: { id: 'guard', name: '守り', role: 'defense', color: '#38bdf8', chance: 1, description: '最初に受けた相手の攻撃の吹き飛ばしを50%軽減。1対局1回、必ず発動。' },
        strike: { id: 'strike', name: '強打', role: 'attack', color: '#fb923c', chance: 1, description: '強さ60%以上の自分の発射で相手に当たると、押し出す勢い＋37.5%。1対局1回、必ず発動。' },
        anchor: { id: 'anchor', name: '重し', role: 'tank', color: '#c4b5fd', impactWeightMultiplier: 1.5, description: '相手から衝突を受ける直前に重量+50%。接触中と接触後0.3秒まで維持。自分の発射・自分同士の接触では発動しない。' },
        counter: { id:'counter', name:'反撃', role:'defense', color:'#f472b6', chance: 1, description:'正面から受けた相手の攻撃を、受けた勢いの70%で押し返す。1対局1回、必ず発動。' },
        dodge: { id:'dodge', name:'見切り', role:'survival', color:'#67e8f9', chance: 1, description:'最初の攻撃を横へ回避し、吹き飛ばしを75%軽減。安全な空間がある時のみ、1対局1回。' },
        chase: { id:'chase', name:'追撃', role:'attack', color:'#fdba74', chance: 1, description:'自分の発射で相手を押すと、0.18秒後に勢い30%の追撃。相手が近くに残っている時のみ、1対局1回。' },
        magnet: { id:'magnet', name:'送り出し', role:'support', color:'#a5b4fc', description:'自分の発射で別の自分に当てると、発射したコマの勢い80%を重量に応じて追加で渡し、自分は停止。1発射1体まで。送り出しは連鎖しない。' },
        glide: { id:'glide', name:'受け身', role:'defense', color:'#7dd3fc', description:'相手に吹き飛ばされた0.3秒後、自分の移動と回転を90%減速。減速前に場外へ出ると救えない。1対局1回。' },
        brake: { id:'brake', name:'急停止', role:'survival', color:'#fda4af', description:'発射から0.9秒後、自分の速度を85%落とす。発射のたびに1回発動。' },
        return: { id:'return', name:'帰還', role:'survival', color:'#86efac', chance: 1, description:'自分の発射で落ちる時、端の内側へ戻って停止。相手に押された時は対象外。1対局1回、必ず発動。安全な戻り先が必要。' },
        backwater: { id:'backwater', name:'背水', role:'attack', color:'#fca5a5', description:'中心から土俵半径の72%以上離れている間、威力+20%・重量−10%。数値にも反映。' },
        resonance: { id:'resonance', name:'共鳴', role:'support', color:'#d8b4fe', description:'約3コマ分以内に同じ属性の自分が1体いると威力+15%、2体なら+20%。' },
        charge: { id:'charge', name:'蓄勢', role:'attack', color:'#fde047', description:'自分の発射を見送るたび、次の自分の発射の威力+10%（最大+30%）。自分が発射すると解除。' }
    };
    for(const id of ['guard','dodge','glide'])abilities[id].description+=' 同じ発射の攻撃では、見切り→守り→受け身の順に1種類だけ発動。';
    function normalize(reading) {
        return String(reading || '').trim().replace(/[.・()（）\s-]/g, '')
            .replace(/[ァ-ヶ]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60));
    }
    const semantic = {};
    for (const [id, words] of Object.entries({
        sturdy: ['とどまる', 'とまる', 'ねばる', 'ふんばる', 'のこる'],
        guard: ['まもる', 'まもり', 'ふせぐ', 'かばう', 'たえる', 'しのぐ'],
        strike: ['うつ', 'たたく', 'せめる', 'つく', 'ける', 'おす'],
        anchor: ['おもい', 'おもり', 'かさねる', 'しずむ', 'かたい'],
        counter: ['かえす','はねる'], dodge:['よける','かわす'], chase:['おう','つく'],
        magnet:['ひく','よぶ'], glide:['すべる','ながれる'], brake:['とめる','やむ'],
        return:['かえる','もどる'], backwater:['きわ','あぶない'],
        resonance:['あわせる','かなでる'], charge:['ためる','まつ']
    })) for (const word of words) { semantic[word] = id; (abilities[id].readings || (abilities[id].readings=[])).push(word); }
    function resolve(item, overrides = {}) {
        const key = normalize(item?.ruby);
        if (!key) return null;
        const custom = overrides[`${item?.char}:${key}`] || overrides[key];
        if (custom) return custom;
        // The reading itself determines the effect for every copy, including
        // inventory acquired before an ability was added. No random rerolls.
        let hash=2166136261;for(const char of key)hash=Math.imul(hash^char.codePointAt(0),16777619)>>>0;
        const ids=['sturdy','guard','strike','anchor','counter','dodge','chase','magnet','glide','brake','return','backwater','resonance','charge'];
        const id = semantic[key] || ids[hash%ids.length];
        return abilities[id];
    }
    function equipped(item) {
        const list = Array.isArray(item?.equippedReadings) ? item.equippedReadings : item?.ruby ? [item.ruby] : [];
        return [...new Set(list.filter(r=>typeof r==='string'&&r.trim()))];
    }
    function resolveAll(item, overrides = {}) {
        const unique = new Map();
        for (const ruby of equipped(item)) {
            const ability = resolve({...item,ruby},overrides);
            if (ability) {const previous=unique.get(ability.id);unique.set(ability.id,{...ability,stacks:Math.min(3,(previous?.stacks||0)+1)});}
        }
        return [...unique.values()].map(a=>{
            const n=a.stacks;
            if(['sturdy','guard','strike','counter','dodge','chase','return','glide'].includes(a.id))a.description=a.description.replace(/1対局1回/g,`1対局${n}回`);
            if(a.id==='strike')a.description=a.description.replace('37.5%',`${[37.5,40,42.5][n-1]}%`);
            if(a.id==='anchor'){a.impactWeightMultiplier=[1.5,1.65,1.8][n-1];a.description=`相手から衝突を受ける直前に重量+${[50,65,80][n-1]}%。接触中と接触後0.3秒まで維持。自分の発射・自分同士の接触では発動しない。`;}
            if(a.id==='backwater')a.description=`中心から土俵半径の72%以上離れている間、威力+${[20,30,35][n-1]}%・重量−10%。数値にも反映。`;
            if(a.id==='resonance')a.description=`約3コマ分以内に同じ属性の自分が1体いると威力+${[15,20,23][n-1]}%、2体なら+${[20,25,28][n-1]}%。`;
            if(a.id==='charge')a.description=`自分の発射を見送るたび、次の自分の発射の威力+${[10,15,20][n-1]}%（最大+${[30,40,50][n-1]}%）。自分が発射すると解除。`;
            if(a.id==='brake')a.description=`発射から0.9秒後、自分の速度を${[85,90,93][n-1]}%落とす。発射のたびに1回発動。`;
            if(a.id==='magnet')a.description=`自分の発射で別の自分に当てると、発射したコマの勢い${[80,100,115][n-1]}%を重量に応じて追加で渡し、自分は停止。1発射1体まで。送り出しは連鎖しない。`;
            if(n>1)a.description+=`（同じ効果のルビ${n}個分）`;
            return a;
        });
    }
    function readingBonus(reading) {
        const kana=normalize(reading),mora=Array.from(kana).length;
        if(!mora)return {power:0,weight:0,speed:0,score:0};
        const voiced=(kana.match(/[がぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽ]/g)||[]).length;
        const small=(kana.match(/[ゃゅょぁぃぅぇぉっ]/g)||[]).length,longMark=(kana.match(/ー/g)||[]).length;
        const complexity=Math.min(12,mora*2+voiced*2+small+longMark);
        return {power:Math.min(24,complexity+(mora>=3?3:0)),weight:Math.min(18,Math.floor(complexity*.7)),speed:Math.min(10,mora<=2?3:Math.max(1,6-Math.floor(mora/2))),score:complexity};
    }
    function bonusForReadings(readings) {
        const total={power:0,weight:0,speed:0,score:0,label:'未装備'};
        for(const reading of new Set(readings)){const bonus=readingBonus(reading);for(const key of ['power','weight','speed','score'])total[key]+=bonus[key];}
        if(readings.length)total.label=`読み強化 +${total.score}（${new Set(readings).size}個）`;
        return total;
    }
    return { abilities, normalize, resolve, equipped, resolveAll, readingBonus, bonusForReadings };
});
