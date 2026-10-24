(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.KanjiFishCharacters=api;})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
const characters=Object.freeze(["鯵", "鮎", "鰯", "鰻", "鰍", "鰹", "鯨", "鯉", "鮭", "鯖", "鮫", "鮮", "鯛", "鱈", "鰭", "鮒", "鮪", "鱒", "鱗", "鰐", "魴", "鮓", "鮃", "鮑", "鮖", "鮗", "鮟", "鮠", "鮨", "鮴", "鯀", "鮹", "鯆", "鯏", "鯑", "鯒", "鯣", "鯢", "鯤", "鯔", "鯡", "鰺", "鯲", "鯱", "鯰", "鰕", "鰔", "鰉", "鰓", "鰌", "鰆", "鰈", "鰒", "鰊", "鰄", "鰮", "鰛", "鰥", "鰤", "鰡", "鰰", "鱇", "鱆", "鰾", "鱚", "鱠", "鱧", "鱶", "鱸", "魞", "魹", "魦", "魲", "魵", "鮄", "鮊", "鮏", "鮞", "鮧", "鯁", "鯎", "鯥", "鯸", "鯽", "鰀", "鰣", "鱁", "鱏", "鱐", "鱓", "鱣", "鱥", "鱷", "魣", "魥", "魫", "魬", "魳", "魶", "魷", "鮦", "鮬", "鮱", "𩷛", "𩸽", "鮲", "鮸", "鮾", "鯇", "鯳", "鯘", "鯝", "鯧", "鯪", "鯫", "鯯", "鯮", "𩸕", "鯺", "𩺊", "鯷", "𩹉", "鰖", "鰘", "鰙", "鰚", "鰝", "鰢", "鰩", "鰪", "𩻄", "鰱", "鰶", "鰷", "鱅", "鱜", "𩻩", "鱊", "𩻛", "鱔", "鱘", "鱛", "鱝", "鱩", "鱪", "鱫", "鱭", "鱮", "鱰", "鱲", "鱵", "鱺", "鷠"]),known=new Set(characters);
const has=value=>known.has(typeof value==='string'?value:value?.char);
function summary(state){const found=new Set([...(state?.characterDiscoveries||[]),...(state?.inventory||[]).map(i=>i.char)]);return {found:characters.filter(c=>found.has(c)).length,total:characters.length};}
return {characters,has,summary};
});
