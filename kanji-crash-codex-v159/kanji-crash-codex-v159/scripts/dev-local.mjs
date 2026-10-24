// Local-only, memory DB. Never deploy this harness. No production connection.
import {fixture} from '../tests/friend-server.mjs';
const port=Number(process.env.PORT||8787);if(!Number.isInteger(port)||port<0||port>65535)throw Error('Invalid PORT');
const f=fixture({identityForRequest:()=>null});
await new Promise((resolve,reject)=>{f.server.once('error',reject);f.server.listen(port,'127.0.0.1',resolve);});
console.log('KANJI_LOCAL_READY '+JSON.stringify({url:'http://127.0.0.1:'+f.server.address().port,memoryOnly:true}));
console.log('ローカル専用です。DBは終了時に消えます。本番の復元コード・バックアップを入力しないでください。');
let closing=false;async function stop(){if(closing)return;closing=true;await f.stop();process.exit(0);}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
