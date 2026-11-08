// RTDB has no user-defined functions. Generate the repeated slot comparisons so
// every accepted manual move is checked atomically, including award priority.
import {readFileSync,writeFileSync} from 'node:fs';
import {CARD_PATTERNS,STAGE_POINTS,PACES,REACTIONS} from '../core.js';
import {ROOM_BASE as BASE,REACTION_BASE} from '../room-transactions.js';
const and=xs=>'('+xs.join(' && ')+')',or=xs=>'('+xs.join(' || ')+')';
const child=(s,p)=>`${s}.child('${p}')`,v=(s,p)=>`${child(s,p)}.val()`,exists=(s,p)=>`${child(s,p)}.exists()`;
const eq=p=>`${v('newData',p)} === ${v('data',p)}`;
const same=paths=>and(paths.map(eq));
const slots=[0,1,2,3],stages=['first','second','tombala'];
const staticFields=['uid','name','color','cardNo','card','row0','row1','row2','readyRound','online','joinedAt'];
const markFields=['marks','hits0','hits1','hits2'];
// Puan yalnızca ödül kazanan işaretleme transaction'ında artar.
const moveFields=[...markFields,'score'];
const gameStable=['drawn','lastDraw','interval','updatedAt'];
const markMeta=['seq','lastUid','lastNumber','lastRow'];
const awards=stages.flatMap(key=>['uid','seq','number','row'].map(f=>'game/awards/'+key+'/'+f));
const metaStable=['meta/hostId','meta/createdAt'];
const paceValues=[0,...PACES];
const staticPlayers=(allowPrune=false)=>and(slots.map(i=>{
 const path='players/'+i;
 const equal=and([`${exists('data',path)} === ${exists('newData',path)}`,`(!${exists('data',path)} || ${same(staticFields.map(f=>path+'/'+f))})`]);
 const prune=and([`${v('data','meta/phase')} === 'lobby'`,`${v('newData','meta/phase')} === 'lobby'`,`${v('data',path+'/online')} === false`,`${v('data',path+'/uid')} !== auth.uid`,`!${exists('newData',path)}`]);
 return allowPrune?or([equal,prune]):equal;
}));
const marksSame=and(slots.map(i=>`(!${exists('newData','players/'+i)} || ${same(markFields.map(f=>'players/'+i+'/'+f))})`));
// Oda sahibi hiçbir aşamada puanları değiştiremez; tekrar oynamada da korunur.
const scoresSame=and(slots.map(i=>`(!${exists('newData','players/'+i)} || ${eq('players/'+i+'/score')})`));
const marksEmpty=and(slots.map(i=>`(!${exists('newData','players/'+i)} || ${and([`${v('newData','players/'+i+'/marks')} === ','`,...Array.from({length:3},(_,r)=>`${v('newData',`players/${i}/hits${r}`)} === 0`)])})`));
const emptyGame=and([`${v('newData','game/drawn')} === ','`,`${v('newData','game/lastDraw')} === 0`,`${v('newData','game/seq')} === 0`,`${v('newData','game/lastUid')} === ''`,`${v('newData','game/lastNumber')} === 0`,`${v('newData','game/lastRow')} === -1`,...stages.flatMap(key=>[`${v('newData',`game/awards/${key}/uid`)} === ''`,`${v('newData',`game/awards/${key}/seq`)} === 0`,`${v('newData',`game/awards/${key}/number`)} === 0`,`${v('newData',`game/awards/${key}/row`)} === -1`])]);
const ready=and([`(${slots.map(i=>`(${exists('data','players/'+i)} ? 1 : 0)`).join(' + ')}) >= 2`,...slots.map(i=>`(!${exists('data','players/'+i)} || (${v('data','players/'+i+'/online')} === true && ${v('data','players/'+i+'/readyRound')} === ${v('data','meta/round')}))`)]);
const phase=(old,next)=>and([`${v('data','meta/phase')} === '${old}'`,`${v('newData','meta/phase')} === '${next}'`]);
const unchangedGame=same(['drawn','lastDraw','auto','interval','updatedAt',...markMeta].map(f=>'game/'+f).concat(awards));
const drawOrAuto=or([
 same(['game/drawn','game/lastDraw']),
 and([`${v('newData','game/lastDraw')} >= 1`,`${v('newData','game/lastDraw')} <= 90`,`!${v('data','game/drawn')}.contains(',' + ${v('newData','game/lastDraw')} + ',')`,`${v('newData','game/drawn')} === ${v('data','game/drawn')} + ${v('newData','game/lastDraw')} + ','`])
]);
const hostWrite=and([`${v('data','meta/hostId')} === auth.uid`,same(metaStable),staticPlayers(true),scoresSame,or([
 and([phase('lobby','lobby'),eq('meta/round'),marksSame,unchangedGame]),
 and([phase('lobby','playing'),eq('meta/round'),ready,marksSame,emptyGame]),
 and([phase('playing','playing'),eq('meta/round'),marksSame,same(markMeta.map(f=>'game/'+f).concat(awards)),drawOrAuto]),
 and([phase('finished','lobby'),`${v('newData','meta/round')} === ${v('data','meta/round')} + 1`,marksEmpty,emptyGame])
])]);
function ownMove(i){
 const p=`players/${i}`,old=f=>v('data',p+'/'+f),next=f=>v('newData',p+'/'+f),number=v('newData','game/lastNumber'),row=v('newData','game/lastRow');
 const completed='('+[0,1,2].map(r=>`(${next('hits'+r)} === 5 ? 1 : 0)`).join(' + ')+')';
 const validRow=or([0,1,2].map(r=>and([`${row} === ${r}`,`(',' + ${old('row'+r)} + ',').contains(',' + ${number} + ',')`,...[0,1,2].map(k=>`${next('hits'+k)} === ${old('hits'+k)}${r===k?' + 1':''}`)])));
 const claim=stages.map((key,k)=>{
  const a=`game/awards/${key}`,blank=`${v('data',a+'/uid')} === ''`,done=`${completed} >= ${k+1}`;
  return or([
   and([`${blank}`,`${done}`,`${v('newData',a+'/uid')} === auth.uid`,`${v('newData',a+'/seq')} === ${v('newData','game/seq')}`,`${v('newData',a+'/number')} === ${number}`,`${v('newData',a+'/row')} === ${row}`]),
   and([`!(${blank} && ${done})`,same(['uid','seq','number','row'].map(f=>a+'/'+f))])
  ]);
 });
 const points=stages.map((key,k)=>`((${v('data',`game/awards/${key}/uid`)} === '' && ${completed} >= ${k+1}) ? ${STAGE_POINTS[key]} : 0)`).join(' + ');
 const result=or([and([`${completed} === 3`,`${v('newData','meta/phase')} === 'finished'`,`${v('newData','game/auto')} === false`]),and([`${completed} < 3`,`${v('newData','meta/phase')} === 'playing'`,eq('game/auto')])]);
 return and([`${old('uid')} === auth.uid`,`${old('online')} === true`,`!${old('marks')}.contains(',' + ${number} + ',')`,`${next('marks')} === ${old('marks')} + ${number} + ','`,validRow,...claim,`${next('score')} === ${old('score')} + ${points}`,result]);
}
const manualWrite=and([`${v('data','meta/phase')} === 'playing'`,same([...metaStable,'meta/round','meta/pace']),staticPlayers(),same(gameStable.map(f=>'game/'+f)),`${v('newData','game/seq')} === ${v('data','game/seq')} + 1`,`${v('newData','game/lastUid')} === auth.uid`,`${v('data','game/drawn')}.contains(',' + ${v('newData','game/lastNumber')} + ',')`,...slots.map(i=>`(${v('data',`players/${i}/uid`)} === auth.uid || !${exists('data','players/'+i)} || ${same(moveFields.map(f=>`players/${i}/${f}`))})`),or(slots.map(ownMove))]);
const create=and([`!data.exists()`,`${v('newData','meta/hostId')} === auth.uid`,`${v('newData','players/0/uid')} === auth.uid`,...slots.slice(1).map(i=>`!${exists('newData','players/'+i)}`),`${v('newData','meta/phase')} === 'lobby'`,`${v('newData','meta/round')} === 1`,`${v('newData','players/0/score')} === 0`,`${v('newData','game/auto')} === false`,emptyGame,marksEmpty]);
const rootPath=`${BASE}/' + $code + '`;
const rootRead=path=>`root.child('${rootPath}/${path}').val()`;
const hostGone=and(slots.map(i=>`(${rootRead(`players/${i}/uid`)} !== data.child('hostId').val() || ${rootRead(`players/${i}/online`)} === false)`));
const inRoom=or(slots.map(i=>`${rootRead(`players/${i}/uid`)} === auth.uid`));
const sameMeta=and(['phase','round','createdAt','pace'].map(f=>`newData.child('${f}').val() === data.child('${f}').val()`));
const regex=CARD_PATTERNS.map(mask=>mask.map((filled,i)=>{if(!filled)return '0';const c=i%9;return c===0?'[1-9]':c===8?'(8[0-9]|90)':`${c}[0-9]`;}).join(',')).join('|');
const scalar=expr=>({'.validate':expr}),number=expr=>scalar(`newData.isNumber() && newData.val() % 1 === 0 && ${expr}`);
const ownLobby=`auth != null && $slot.matches(/^[0-3]$/) && ${rootRead('meta/phase')} === 'lobby' && ((data.child('uid').val() === auth.uid && (!newData.exists() || (newData.child('uid').val() === auth.uid && newData.child('score').val() === data.child('score').val()))) || (!data.exists() && newData.child('uid').val() === auth.uid && newData.child('score').val() === 0 && ${and(slots.map(i=>`${rootRead(`players/${i}/uid`)} !== auth.uid`))}))`;
const lobbyUnready=`auth.uid === data.parent().child('uid').val() && ${rootRead('meta/phase')} === 'lobby' && data.parent().child('readyRound').val() !== ${rootRead('meta/round')}`;
const cardMutable=expr=>scalar(`${expr} && (!data.exists() || newData.val() === data.val() || (${lobbyUnready}))`);
const fields={uid:scalar("newData.isString() && newData.val().length > 0 && ((!data.exists() && newData.val() === auth.uid) || newData.val() === data.val())"),name:scalar('newData.isString() && newData.val().length >= 1 && newData.val().length <= 16'),color:number('newData.val() >= 0 && newData.val() <= 3'),cardNo:number("newData.val() === ($slot === '0' ? 1 : $slot === '1' ? 2 : $slot === '2' ? 3 : 4)"),card:cardMutable(`newData.isString() && newData.val().matches(/^(${regex})$/)`),readyRound:number('newData.val() >= 0 && newData.val() <= 10000'),score:number('newData.val() >= 0 && newData.val() <= 60000'),online:{'.write':"auth != null && data.parent().child('uid').val() === auth.uid",...scalar('newData.isBoolean()')},joinedAt:scalar('newData.isNumber() && (!data.exists() || newData.val() === data.val())'),marks:scalar("newData.isString() && newData.val().length <= 46 && (newData.val() === ',' || newData.val().matches(/^,(([1-9]|[1-8][0-9]|90),){1,15}$/))")};
for(let r=0;r<3;r++){fields['row'+r]=cardMutable("newData.isString() && newData.val().length <= 26");fields['hits'+r]=number('newData.val() >= 0 && newData.val() <= 5');}
const parentEmpty="(newData.parent().parent().child('meta/phase').val() !== 'lobby' || (newData.child('marks').val() === ',' && newData.child('hits0').val() === 0 && newData.child('hits1').val() === 0 && newData.child('hits2').val() === 0))";
const playerValidate=`$slot.matches(/^[0-3]$/) && newData.hasChildren(${JSON.stringify(Object.keys(fields))}) && newData.child('card').val() === newData.child('row0').val() + ',' + newData.child('row1').val() + ',' + newData.child('row2').val() && ${parentEmpty}`;
const game={drawn:scalar("newData.isString() && newData.val().length <= 271 && (newData.val() === ',' || newData.val().matches(/^,(([1-9]|[1-8][0-9]|90),){1,90}$/))"),lastDraw:number('newData.val() >= 0 && newData.val() <= 90'),auto:scalar('newData.isBoolean()'),interval:scalar(or(PACES.map(ms=>`newData.val() === ${ms}`))),updatedAt:scalar('newData.isNumber()'),seq:number('newData.val() >= 0 && newData.val() <= 60'),lastUid:scalar('newData.isString() && newData.val().length <= 128'),lastNumber:number('newData.val() >= 0 && newData.val() <= 90'),lastRow:number('newData.val() >= -1 && newData.val() <= 2'),awards:{'.validate':"newData.hasChildren(['first','second','tombala'])",'$other':{'.validate':false}}};
for(const key of stages)game.awards[key]={'.validate':"newData.hasChildren(['uid','seq','number','row'])",uid:scalar('newData.isString() && newData.val().length <= 128'),seq:number('newData.val() >= 0 && newData.val() <= 60'),number:number('newData.val() >= 0 && newData.val() <= 90'),row:number('newData.val() >= -1 && newData.val() <= 2'),'$other':{'.validate':false}};
const rules={rules:{'.read':false,'.write':false,[BASE]:{'$code':{
 '.read':"auth != null && $code.matches(/^[1-9][0-9]{3}$/)",
 '.write':`auth != null && $code.matches(/^[1-9][0-9]{3}$/) && (${create} || (data.exists() && (${hostWrite} || ${manualWrite})))`,
 '.validate':"newData.hasChildren(['meta','players','game']) && newData.child('meta/createdAt').val() > now - 21600000",
 meta:{'.write':`auth != null && data.exists() && ${hostGone} && ${inRoom} && newData.child('hostId').val() === auth.uid && ${sameMeta}`,'.validate':"newData.hasChildren(['hostId','phase','round','createdAt','pace'])",pace:scalar(or(paceValues.map(ms=>`newData.val() === ${ms}`))),hostId:scalar('newData.isString() && newData.val().length > 0 && newData.val().length <= 128'),phase:scalar("newData.val() === 'lobby' || newData.val() === 'playing' || newData.val() === 'finished'"),round:number('newData.val() >= 1 && newData.val() <= 10000'),createdAt:scalar('newData.isNumber() && ((!data.exists() && newData.val() <= now + 60000) || newData.val() === data.val())'),'$other':{'.validate':false}},
 players:{'$slot':{'.write':ownLobby,'.validate':playerValidate,...fields,'$other':{'.validate':false}}},
 game:{'.validate':`newData.hasChildren(${JSON.stringify(Object.keys(game))})`,...game,'$other':{'.validate':false}},'$other':{'.validate':false}
}},
 [REACTION_BASE]:{'$code':{
  '.read':"auth != null && $code.matches(/^[1-9][0-9]{3}$/)",
  '$slot':{
   '.write':`auth != null && $code.matches(/^[1-9][0-9]{3}$/) && $slot.matches(/^[0-3]$/) && root.child('${BASE}/' + $code + '/players/' + $slot + '/uid').val() === auth.uid`,
   '.validate':"newData.hasChildren(['e','t']) && (!data.exists() || newData.child('t').val() - data.child('t').val() >= 700)",
   e:number(`newData.val() >= 0 && newData.val() < ${REACTIONS.length}`),
   t:scalar('newData.isNumber() && newData.val() === now'),
   '$other':{'.validate':false}
  }
 }}
}};
const output=JSON.stringify(rules,null,2)+'\n',file=new URL('../database.rules.json',import.meta.url);
if(process.argv.includes('--check')){if(readFileSync(file,'utf8')!==output){console.error('database.rules.json güncel değil: npm run rules:build');process.exitCode=1;}}else writeFileSync(file,output);
