import { createRequire } from 'node:module';
import fs from 'node:fs';
import { MongoClient } from 'mongodb';
const require=createRequire(import.meta.url);require('@next/env').loadEnvConfig(process.cwd());
const client=new MongoClient(process.env.MONGODB_URI,{serverSelectionTimeoutMS:12000});
try {
 await client.connect();const db=client.db(process.env.MONGODB_DB||'xtreme_gym');
 const inventory=await db.collection('xtreme_gym_equipment_assets').find({kind:'machine'},{projection:{_id:0,id:1,name:1,code:1,machineGuideId:1,status:1}}).toArray();
 fs.writeFileSync('tmp/group-a/live-inventory.json',JSON.stringify(inventory,null,2));
 console.log('Machines:',inventory.length);console.log(JSON.stringify(inventory));
 const members=await db.collection('xtreme_gym_members').find({memberName:{$regex:'Tiffany|Chermey|Yuslin|Lauren|Melissa|Yadilet',$options:'i'}},{projection:{memberName:1,normalizedName:1}}).toArray();
 console.log('Matching names:',JSON.stringify(members));
}finally{await client.close();}
