import assert from 'node:assert/strict';
const base=process.env.TEST_BASE_URL||'http://localhost:3000';
for(const path of ['/','/auth','/covers/couple-1.jpg','/covers/couple-2.jpg','/covers/couple-3.jpg','/covers/couple-4.jpg']){
 const response=await fetch(base+path);assert.equal(response.status,200,path);
}
const admin=await fetch(base+'/admin',{redirect:'manual'});
assert.equal(admin.status,307);assert.equal(admin.headers.get('location'),'/auth');
for(const method of ['GET','POST','PATCH','DELETE']){
 const response=await fetch(base+'/api/admin/weddings',{method});assert.equal(response.status,401,method);
}
const crossOrigin=await fetch(base+'/api/auth/login',{method:'POST',headers:{origin:'https://other.example','content-type':'application/json'},body:'{}'});
assert.equal(crossOrigin.status,403);
console.log('Public pages, four images, admin redirect, API authorization and origin protection passed.');
