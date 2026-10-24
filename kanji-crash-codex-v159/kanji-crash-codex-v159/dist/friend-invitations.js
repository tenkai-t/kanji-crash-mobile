'use strict';
let friendInvitationFailures=0;
let friendInvitations=[],friendInvitationTimer=null,friendInvitationBusy=false,friendInvitationAuth=true;
const dismissedFriendInvitations=new Set();
function receiveFriendInvitations(entries){
 friendInvitations=entries.filter(e=>e.code!==friendRoom?.code);
 const codes=new Set(friendInvitations.map(e=>e.code));for(const code of dismissedFriendInvitations)if(!codes.has(code))dismissedFriendInvitations.delete(code);
 const count=friendInvitations.length,notice=document.getElementById('friend-invitation-notice'),next=friendInvitations.find(e=>!dismissedFriendInvitations.has(e.code));
 for(const id of ['friend-invitation-count','friend-tab-invitation-count','nav-invitation-count']){const badge=document.getElementById(id);badge.hidden=!count;badge.textContent=String(count);}
 const listVisible=!document.getElementById('modal-friends').classList.contains('hidden')&&!document.getElementById('friend-section-list').hidden;
 notice.hidden=!next||listVisible;
 if(next){notice.dataset.roomCode=next.code;paintPlayerName(document.getElementById('friend-invitation-name'),next.profile);paintPlayerAvatar(document.getElementById('friend-invitation-avatar'),next.profile);document.getElementById('friend-invitation-message').textContent=count>1?`対戦の招待が${count}件届いています`:'フレンド対戦の招待が届きました';}
}
function invitationsFromDirectory(){if(friendDirectory)receiveFriendInvitations(friendDirectory.entries.filter(e=>e.invitation).map(e=>({code:e.invitation,profile:e.profile})));}
function scheduleFriendInvitations(){clearTimeout(friendInvitationTimer);if(!document.hidden&&friendInvitationAuth)friendInvitationTimer=setTimeout(pollFriendInvitations,KanjiNetwork.delay(15000,friendInvitationFailures,120000));}
async function pollFriendInvitations(){
 if(document.hidden||friendInvitationBusy||!friendInvitationAuth)return;friendInvitationBusy=true;
 try{const result=await playerApi('/api/friends/invitations');friendInvitationFailures=0;receiveFriendInvitations(result.invitations);}
 catch(error){friendInvitationFailures++;if(error.status===401){friendInvitationAuth=false;receiveFriendInvitations([]);}}
 finally{friendInvitationBusy=false;scheduleFriendInvitations();}
}
window.dismissFriendInvitation=()=>{const code=document.getElementById('friend-invitation-notice').dataset.roomCode;if(code)dismissedFriendInvitations.add(code);receiveFriendInvitations(friendInvitations);};
window.openFriendInvitations=()=>{
 for(const entry of friendInvitations)dismissedFriendInvitations.add(entry.code);receiveFriendInvitations(friendInvitations);
 pausePlayerOverlay();document.getElementById('modal-online').classList.add('hidden');document.getElementById('modal-friends').classList.remove('hidden');setFriendLobbyTab('list');renderFriendLobby();loadFriendList();loadFriendSetup().catch(error=>setFriendStatus(error.message));
};
document.addEventListener('visibilitychange',()=>{clearTimeout(friendInvitationTimer);if(!document.hidden)pollFriendInvitations();});
window.addEventListener('online',()=>{friendInvitationAuth=true;pollFriendInvitations();});
window.addEventListener('load',()=>{setTimeout(pollFriendInvitations,1500);});
