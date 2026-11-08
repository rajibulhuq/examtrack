export type Sub={id:string;name:string;max:number};
export type Test={id:string;name:string;date:string;category:100|200;obtained?:number;platform:string;notes:string;subjects?:Record<string,{o:number;m:number}>;createdAt:number;updatedAt:number;deleted?:boolean};
export type Settings={pass:number;target:number;weekly:number;monthly:number;subjects:Sub[];dark:boolean;updatedAt:number};
export const DEFAULT_SUBJECTS:Sub[]=[['বাংলা ভাষা ও সাহিত্য',35],['ইংরেজি ভাষা ও সাহিত্য',35],['বাংলাদেশ বিষয়াবলি',30],['আন্তর্জাতিক বিষয়াবলি',20],['ভূগোল, বাংলাদেশ ও বিশ্ব, পরিবেশ ও দুর্যোগ ব্যবস্থাপনা',10],['সাধারণ বিজ্ঞান',15],['কম্পিউটার ও তথ্যপ্রযুক্তি',15],['গাণিতিক যুক্তি',15],['মানসিক দক্ষতা',15],['নৈতিকতা, মূল্যবোধ ও সুশাসন',10]].map(([n,m],i)=>({id:'s'+(i+1),name:n as string,max:m as number}));
export const DEFAULTS:Settings={pass:65,target:75,weekly:3,monthly:12,subjects:DEFAULT_SUBJECTS,dark:false,updatedAt:0};
export const uid=()=>crypto.randomUUID();
export const avg=(a:number[])=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;
export const f1=(n:number|null|undefined)=>n==null?'—':n.toFixed(1);
export function totals(t:Test){if(t.subjects){const v=Object.values(t.subjects);if(v.length)return{o:v.reduce((s,x)=>s+x.o,0),m:v.reduce((s,x)=>s+x.m,0)}}return{o:t.obtained??0,m:t.category}}
export const pct=(t:Test)=>{const x=totals(t);return x.m?x.o/x.m*100:0};
export const zone=(p:number,s:Settings)=>p<s.pass?{k:'FAIL',label:'Red Zone',c:'#ef4444'}:p<70?{k:'PASS',label:'Danger Zone',c:'#f59e0b'}:p<75?{k:'SAFE',label:'Safe Zone',c:'#22c55e'}:{k:'EXCELLENT',label:'Excellent Zone',c:'#10b981'};
export const live=(a:Test[])=>a.filter(t=>!t.deleted);
export function weekStart(d:string){const x=new Date(d+'T00:00:00');const w=(x.getDay()+6)%7;x.setDate(x.getDate()-w);return x.toLocaleDateString('en-CA')}
export const monthKey=(d:string)=>d.slice(0,7);
export function group(a:Test[],key:(t:Test)=>string){const m:Record<string,Test[]>={};a.forEach(t=>(m[key(t)]??=[]).push(t));return Object.entries(m).sort((x,y)=>x[0]<y[0]?-1:1)}
export function subjectStats(a:Test[],s:Sub){const v=a.filter(t=>t.subjects?.[s.id]).map(t=>({d:t.date,p:t.subjects![s.id].o/t.subjects![s.id].m*100})).sort((x,y)=>x.d<y.d?-1:1);const p=v.map(x=>x.p);
const h=Math.floor(p.length/2);return{n:p.length,avg:avg(p),max:p.length?Math.max(...p):null,min:p.length?Math.min(...p):null,delta:p.length>=2?avg(p.slice(h))!-avg(p.slice(0,h))!:null}}
export function csv(a:Test[],s:Settings){const q=(x:unknown)=>`"${String(x??'').replace(/"/g,'""')}"`;const h=['Name','Date','Category','Obtained','Max','Percent','Platform','Mode',...s.subjects.map(x=>x.name)];
return [h.map(q).join(','),...live(a).map(t=>{const x=totals(t);return [t.name,t.date,t.category,x.o,x.m,pct(t).toFixed(2),t.platform,t.subjects?'subject-wise':'total-only',...s.subjects.map(u=>t.subjects?.[u.id]?`${t.subjects[u.id].o}/${t.subjects[u.id].m}`:'')].map(q).join(',')})].join('\n')}
export function validate(t:Test):string|null{if(!t.name.trim())return'Test name required';if(!t.date)return'Date required';
if(t.subjects&&Object.keys(t.subjects).length){for(const [k,v] of Object.entries(t.subjects)){if(!(v.m>0))return'Subject max must be > 0';if(v.o<0||v.o>v.m||isNaN(v.o))return`Invalid marks (${k})`}
if(t.obtained!=null&&Math.abs(t.obtained-totals(t).o)>0.001)return`Total ${t.obtained} doesn't match subject sum ${totals(t).o}`;return null}
if(t.obtained==null||isNaN(t.obtained)||t.obtained<0||t.obtained>t.category)return'Obtained marks must be between 0 and '+t.category;return null}
// merge by id, newest updatedAt wins; tombstones preserved so deletes sync without data loss
export function merge(a:Test[],b:Test[]){const m=new Map<string,Test>();[...a,...b].forEach(t=>{const o=m.get(t.id);if(!o||t.updatedAt>o.updatedAt)m.set(t.id,t)});return[...m.values()]}
// IndexedDB
const db=()=>new Promise<IDBDatabase>((r,j)=>{const q=indexedDB.open('examtrack',1);q.onupgradeneeded=()=>q.result.createObjectStore('kv');q.onsuccess=()=>r(q.result);q.onerror=()=>j(q.error)});
export async function idbGet<T>(k:string):Promise<T|undefined>{const d=await db();return new Promise(r=>{const q=d.transaction('kv').objectStore('kv').get(k);q.onsuccess=()=>r(q.result)})}
export async function idbSet(k:string,v:unknown){const d=await db();return new Promise<void>(r=>{const t=d.transaction('kv','readwrite');t.objectStore('kv').put(v,k);t.oncomplete=()=>r()})}
export async function idbClear(){const d=await db();return new Promise<void>(r=>{const t=d.transaction('kv','readwrite');t.objectStore('kv').clear();t.oncomplete=()=>r()})}
// Google Drive (scope drive.file: app only touches files it created; no client secret in frontend)
const CID=import.meta.env.VITE_GOOGLE_CLIENT_ID as string|undefined;
export const driveConfigured=!!CID;
let token='';
export function connect():Promise<void>{return new Promise((res,rej)=>{const g=(window as any).google;if(!CID||!g)return rej(new Error('Google not configured'));
g.accounts.oauth2.initTokenClient({client_id:CID,scope:'https://www.googleapis.com/auth/drive.file',callback:(r:any)=>{if(r.access_token){token=r.access_token;res()}else rej(new Error(r.error||'Auth failed'))}}).requestAccessToken()})}
export const disconnect=()=>{token=''};
export const isConnected=()=>!!token;
async function api(path:string,init:RequestInit={}){const r=await fetch(path,{...init,headers:{Authorization:'Bearer '+token,...(init.headers||{})}});if(r.status===401){token='';throw new Error('Session expired — reconnect Google Drive')}if(!r.ok)throw new Error('Drive error '+r.status);return r}
const G='https://www.googleapis.com/drive/v3/files';
async function findOrCreate(name:string,parent?:string,folder=true):Promise<string>{const q=`name='${name}' and trashed=false`+(parent?` and '${parent}' in parents`:'')+(folder?` and mimeType='application/vnd.google-apps.folder'`:'');
const j=await(await api(`${G}?q=${encodeURIComponent(q)}&fields=files(id)&spaces=drive`)).json();if(j.files?.[0])return j.files[0].id;
if(!folder)return'';return(await(await api(G,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,mimeType:'application/vnd.google-apps.folder',parents:parent?[parent]:undefined})})).json()).id}
async function upsert(name:string,parent:string,data:unknown){const id=await findOrCreate(name,parent,false);const b='xtb';const meta=id?{}:{name,parents:[parent]};
const body=`--${b}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(meta)}\r\n--${b}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(data)}\r\n--${b}--`;
await api(`https://www.googleapis.com/upload/drive/v3/files${id?'/'+id:''}?uploadType=multipart`,{method:id?'PATCH':'POST',headers:{'Content-Type':`multipart/related; boundary=${b}`},body})}
async function read<T>(name:string,parent:string):Promise<T|null>{const id=await findOrCreate(name,parent,false);return id?await(await api(`${G}/${id}?alt=media`)).json():null}
export async function syncDrive(tests:Test[],settings:Settings):Promise<{tests:Test[];settings:Settings}>{
const root=await findOrCreate('ExamTrack BD');for(const f of['Backups','Weekly Reports','Monthly Reports'])await findOrCreate(f,root);
const rt=await read<Test[]>('exam_records.json',root)??[];const rs=await read<Settings>('settings.json',root);
const mt=merge(tests,rt);const ms=rs&&rs.updatedAt>settings.updatedAt?rs:settings;
if(rt.length&&JSON.stringify(rt)!==JSON.stringify(mt)||rt.length)await upsert(`backup_${new Date().toISOString().slice(0,10)}.json`,(await findOrCreate('Backups',root)),rt);
await upsert('exam_records.json',root,mt);await upsert('settings.json',root,ms);return{tests:mt,settings:ms}}
