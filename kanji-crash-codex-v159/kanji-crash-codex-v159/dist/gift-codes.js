(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.KanjiGiftCodes=api;})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const gifts=[{id:'coins-100000-20261011',code:'KH-100K-Q7M2',coins:100000},{id:'coins-30000-20261018',code:'KH-30K-M8R4',coins:30000},{id:'coins-100000-20261018',code:'KH-100K-T6N9',coins:100000},{id:'new-site-start-20261024',code:'KH-START-7M4Q',coins:500000,rating:10000},{id:'coins-10000-20261024',code:'KH-10K-A8R5',coins:10000},{id:'coins-30000-20261024',code:'KH-30K-P9V2',coins:30000},{id:'coins-50000-20261024',code:'KH-50K-H6N3',coins:50000}];
 const normalize=code=>String(code||'').trim().normalize('NFKC').toUpperCase();
 const get=code=>gifts.find(g=>g.code===normalize(code))||null;
 function received(state,storage,gift){return !!(state.giftClaims?.includes(gift.id)||storage.getItem('kanji_gift_'+gift.id));}
 function describe(gift){return gift.coins.toLocaleString('ja-JP')+'文'+(gift.rating?'・'+gift.rating.toLocaleString('ja-JP')+'段位ポイント':'');}
 function claim(state,store,storage,code){const gift=get(code);if(!gift)throw Error('invalid-gift');if(received(state,storage,gift))return null;const next={...state,coins:state.coins+gift.coins,...(gift.rating?{rating:state.rating+gift.rating}:{}),giftClaims:[...(state.giftClaims||[]),gift.id]};store.replace(next);try{storage.setItem('kanji_gift_'+gift.id,'received');}catch{}return next;}
 return {get,received,claim,describe};
});
