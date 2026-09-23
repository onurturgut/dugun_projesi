import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {randomUUID,randomBytes,scryptSync} from 'node:crypto';
import {MongoClient} from 'mongodb';
import {once} from 'node:events';
const dbName=`test_platform_${Date.now()}`;
const mongo=new MongoClient(process.env.MONGODB_URI||'mongodb://127.0.0.1:27017');
const port=Number(process.env.TEST_PORT||3100),base=`http://localhost:${port}`;
const objects=new Map();let next;let output='';
const s3=createServer(async(req,res)=>{
 try{const key=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(req.method==='PUT'){const chunks=[];for await(const chunk of req)chunks.push(chunk);objects.set(key,{body:Buffer.concat(chunks),type:req.headers['content-type']});res.writeHead(200,{ETag:'"test"'});res.end();return;}
 if(req.method==='DELETE'){objects.delete(key);res.writeHead(204);res.end();return;}
 const object=objects.get(key);if(!object){res.writeHead(404,{'content-type':'application/xml'});res.end('<Error><Code>NoSuchKey</Code></Error>');return;}
 let body=object.body,status=200;const headers={'content-type':object.type,ETag:'"test"','accept-ranges':'bytes'};
 if(req.headers.range){const match=/bytes=(\d+)-(\d*)/.exec(req.headers.range);const start=Number(match[1]),end=match[2]?Number(match[2]):body.length-1;headers['content-range']=`bytes ${start}-${end}/${body.length}`;body=body.subarray(start,end+1);status=206;}
 res.writeHead(status,{...headers,'content-length':body.length});res.end(req.method==='HEAD'?undefined:body);
 }catch{res.writeHead(500);res.end();}
});
const initial='Temporary-test-password-123!',changed='Changed-test-password-456!';
async function call(path,method='GET',body,cookie,status=200){const r=await fetch(base+'/api'+path,{method,headers:{'content-type':'application/json',...(cookie?{cookie}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});const data=await r.json();assert.equal(r.status,status,`${method} ${path}: ${JSON.stringify(data)}`);return {data,cookie:r.headers.get('set-cookie')?.split(';')[0]};}
async function login(email,password=initial){return (await call('/auth/login','POST',{email,password})).cookie;}
async function activate(email){const cookie=await login(email);await call('/admin/weddings','GET',undefined,cookie,403);await call('/auth/password','POST',{current_password:initial,password:changed},cookie);return cookie;}
try{
 await mongo.connect();const db=mongo.db(dbName);
 await Promise.all([db.collection('users').createIndex({email:1},{unique:true}),db.collection('users').createIndex({owner_event_id:1},{unique:true,partialFilterExpression:{role:'owner'}}),db.collection('weddings').createIndex({slug:1},{unique:true}),db.collection('media').createIndex({storage_path:1},{unique:true})]);
 const salt=randomBytes(16).toString('hex');await db.collection('users').insertOne({id:randomUUID(),email:'platform-test',salt,passwordHash:scryptSync(initial,salt,64).toString('hex'),role:'platform',partner_id:null,display_name:'Test Platform',disabled:false,must_change_password:false});
 await db.collection('partners').insertOne({id:'platform',name:'Platform',active:true,logo_url:'',created_at:new Date().toISOString()});
 s3.listen(0,'127.0.0.1');await once(s3,'listening');
 const secret=randomBytes(32).toString('hex');
 next=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--webpack','--port',String(port)],{windowsHide:true,env:{...process.env,NODE_ENV:'development',MONGODB_DB:dbName,NEXT_DIST_DIR:'.next-test',R2_ACCOUNT_ID:'test',R2_ACCESS_KEY_ID:'test',R2_SECRET_ACCESS_KEY:'test',R2_BUCKET_NAME:'test-media',R2_TEST_ENDPOINT:`http://127.0.0.1:${s3.address().port}`,CRON_SECRET:secret},stdio:['ignore','pipe','pipe']});
 for(const pipe of [next.stdout,next.stderr])pipe.on('data',chunk=>{output=(output+chunk.toString()).slice(-12000);});
 let ready=false;for(let i=0;i<120;i++){try{if((await fetch(base+'/auth')).ok){ready=true;break;}}catch{}if(next.exitCode!==null)throw new Error(output);await new Promise(r=>setTimeout(r,500));}
 assert.ok(ready,'Test server did not start');console.log(`Test server ready: ${base}`);
 // Allow the browser verification to inspect the running server as well.
 await new Promise(r=>setTimeout(r,15000));
 const platform=await login('platform-test');
 const partnerA=(await call('/admin/partners','POST',{name:'A İşletmesi',display_name:'A Yetkili',username:'partner-a',password:initial},platform,201)).data.id;
 const partnerB=(await call('/admin/partners','POST',{name:'B İşletmesi',display_name:'B Yetkili',username:'partner-b',password:initial},platform,201)).data.id;
 const a=await activate('partner-a'),b=await activate('partner-b');
 await call('/admin/partners','GET',undefined,a,403);
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const input=(slug)=>({slug,title:slug,event_type:'Düğün',wedding_date:today,cover_images:['/covers/couple-1.jpg'],hero_message:'Hoş geldiniz',thank_you_message:'Teşekkürler'});
 const eventA=(await call('/admin/weddings','POST',{...input('event-a'),partner_id:partnerB},a,201)).data;
 assert.equal(eventA.partner_id,partnerA,'Partner must not choose another tenant');
 const eventB=(await call('/admin/weddings','POST',input('event-b'),b,201)).data;
 const eventA2=(await call('/admin/weddings','POST',input('event-a-2'),a,201)).data;
 await call(`/admin/weddings/${eventB.id}`,'GET',undefined,a,404);
 await call(`/admin/weddings/${eventB.id}`,'PATCH',{title:'Hijack'},a,404);
 await call(`/admin/weddings/${eventA.id}`,'PATCH',{upload_days:20},a,403);
 await call(`/admin/weddings/${eventA.id}/owner`,'POST',{username:'owner-a',display_name:'Çift A',password:initial},a,201);
 await call(`/admin/weddings/${eventA.id}/owner`,'POST',{username:'owner-a2',display_name:'Duplicate',password:initial},a,409);
 const owner=await activate('owner-a');
 assert.equal((await call('/admin/weddings','GET',undefined,owner)).data.length,1);
 await call(`/admin/weddings/${eventA2.id}`,'GET',undefined,owner,404);
 await call('/admin/weddings','POST',input('forbidden'),owner,403);
 await call(`/admin/weddings/${eventA.id}`,'PATCH',{title:'Forbidden'},owner,403);
 const publicData=(await call('/weddings/slug/event-a')).data;assert.equal(publicData.can_upload,true);assert.equal(publicData.owner_id,undefined);assert.equal(publicData.partner_id,undefined);
 console.log('PASS: partner creation, password change, tenant/owner isolation, public data projection');
 const payload=Buffer.from('private-image-test-content');
 const upload={weddingId:eventA.id,file_name:'test.jpg',mime_type:'image/jpeg',size_bytes:payload.length,uploader_session_id:randomUUID(),guest_name:'Misafir',guest_message:'Mutluluklar!'};
 const ticket=(await call('/uploads/sign','POST',upload)).data;
 assert.equal((await fetch(ticket.url,{method:'PUT',headers:{'content-type':'image/jpeg'},body:payload})).status,200);
 await call('/uploads/complete','POST',{ticket:ticket.ticket});await call('/uploads/complete','POST',{ticket:ticket.ticket});
 const rows=(await call(`/admin/weddings/${eventA.id}/media`,'GET',undefined,owner)).data;assert.equal(rows.length,1);assert.equal(rows[0].guest_message,'Mutluluklar!');assert.equal(rows[0].storage_path,undefined);const row=rows[0];
 await call(`/admin/weddings/${eventA.id}/media/${row.id}`,'GET',undefined,undefined,401);
 await call(`/admin/weddings/${eventA.id}/media/${row.id}`,'GET',undefined,b,404);
 const image=await fetch(base+row.url,{headers:{cookie:owner}});assert.equal(image.status,200);assert.deepEqual(Buffer.from(await image.arrayBuffer()),payload);
 const range=await fetch(base+row.url,{headers:{cookie:owner,range:'bytes=0-6'}});assert.equal(range.status,206);assert.equal((await range.text()),'private');
 const zip=await fetch(base+`/api/admin/weddings/${eventA.id}/archive`,{headers:{cookie:owner}});assert.equal(zip.status,200);const bytes=Buffer.from(await zip.arrayBuffer());assert.equal(bytes.subarray(0,2).toString(),'PK');assert.ok(bytes.includes(payload));assert.ok(bytes.includes(Buffer.from('misafir-mesajlari.json')));
 await call(`/admin/weddings/${eventA.id}/archive`,'GET',undefined,b,404);
 await call(`/admin/weddings/${eventA.id}/media`,'DELETE',{ids:[row.id]},owner);
 assert.equal((await call(`/admin/weddings/${eventA.id}/media`,'GET',undefined,owner)).data.length,0);
 assert.equal((await call(`/admin/weddings/${eventA.id}/media?trash=1`,'GET',undefined,owner)).data.length,1);
 await call(`/admin/weddings/${eventA.id}/media/${row.id}`,'GET',undefined,owner,404);
 const trashPreview=`/admin/weddings/${eventA.id}/media/${row.id}?trash_preview=1`;
 const preview=await fetch(base+'/api'+trashPreview,{headers:{cookie:owner}});
 assert.equal(preview.status,200);assert.deepEqual(Buffer.from(await preview.arrayBuffer()),payload);
 await call(trashPreview,'GET',undefined,b,404);
 await call(trashPreview,'GET',undefined,undefined,401);
 await call(trashPreview+'&download=1','GET',undefined,owner,400);
 await call(`/admin/weddings/${eventA.id}/media`,'PATCH',{ids:[row.id],action:'restore'},owner);
 console.log('PASS: direct upload, idempotent completion, private download/video ranges, ZIP, trash and restore');
 await db.collection('weddings').updateOne({id:eventA.id},{$set:{uploads_close_at:new Date(Date.now()-1000).toISOString()}});
 await call('/uploads/sign','POST',upload,undefined,410);
 await db.collection('weddings').updateOne({id:eventA.id},{$set:{uploads_close_at:eventA.uploads_close_at}});
 const wrong=(await call('/uploads/sign','POST',upload)).data;await fetch(wrong.url,{method:'PUT',headers:{'content-type':'image/jpeg'},body:Buffer.from('bad')});await call('/uploads/complete','POST',{ticket:wrong.ticket},undefined,400);
 await call(`/admin/weddings/${eventA.id}/media`,'DELETE',{ids:[row.id]},a);
 await db.collection('media').updateOne({id:row.id},{$set:{purge_at:new Date(Date.now()-1000).toISOString()}});
 await call(trashPreview,'GET',undefined,owner,404);
 await call(`/admin/weddings/${eventA.id}/media`,'PATCH',{ids:[row.id],action:'restore'},owner);
 assert.notEqual((await db.collection('media').findOne({id:row.id})).deleted_at,null);
 await call('/maintenance','POST',{},undefined,401);
 const cleanup=async()=>{const r=await fetch(base+'/api/maintenance',{method:'POST',headers:{authorization:`Bearer ${secret}`}});assert.equal(r.status,200);return r.json();};
 await cleanup();assert.equal(await db.collection('media').countDocuments({id:row.id}),0);
 await db.collection('upload_tickets').updateMany({weddingId:eventA.id},{$set:{expiresAt:new Date(Date.now()-1000)}});
 await db.collection('weddings').updateOne({id:eventA.id},{$set:{expires_at:new Date(Date.now()-1000).toISOString()}});
 await cleanup();await cleanup();assert.ok((await db.collection('weddings').findOne({id:eventA.id})).purged_at);assert.equal(await db.collection('upload_tickets').countDocuments({weddingId:eventA.id}),0);assert.equal(objects.size,0);
 await call(`/admin/weddings/${eventA.id}/media`,'GET',undefined,owner,410);
 await call(`/admin/partners/${partnerA}`,'PATCH',{active:false},platform);
 await call('/admin/weddings','GET',undefined,a,401);
 await call('/admin/weddings','GET',undefined,owner,401);
 console.log('PASS: upload cutoff, mismatch rejection, expired trash, permanent purge, retry safety and disabled partners');
 console.log('ALL INTEGRATION CHECKS PASSED (MongoDB + local S3 emulator, not live R2).');
}catch(error){console.error(error);console.error(output);process.exitCode=1;}
finally{
 if(next){next.kill();}
 s3.closeAllConnections();s3.close();
 if(dbName.startsWith('test_platform_'))await mongo.db(dbName).dropDatabase();
 await mongo.close();
}
