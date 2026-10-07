import { MongoClient } from "mongodb";
const uri=process.env.MONGODB_URI;
if(!uri)throw new Error("MONGODB_URI is not defined in .env.local");
const options={};let client:MongoClient;let clientPromise:Promise<MongoClient>;let indexesPromise:Promise<void>|undefined;
if(process.env.NODE_ENV==="development"){const g=global as typeof globalThis & {_mongoClientPromise?:Promise<MongoClient>};if(!g._mongoClientPromise){client=new MongoClient(uri,options);g._mongoClientPromise=client.connect()}clientPromise=g._mongoClientPromise}else{client=new MongoClient(uri,options);clientPromise=client.connect()}
export async function getDb(){const client=await clientPromise;const db=client.db("taskflow");if(!indexesPromise){indexesPromise=Promise.allSettled([
 db.collection("users").createIndex({email:1},{unique:true}),
 db.collection("workspaces").createIndex({joinCode:1},{unique:true}),
 db.collection("tasks").createIndex({workspaceId:1,createdAt:-1}),
 db.collection("notifications").createIndex({userEmail:1,read:1,createdAt:-1}),
 db.collection("comments").createIndex({taskId:1,createdAt:-1}),
]).then(results=>{for(const result of results){if(result.status==="rejected")console.error("Failed to ensure database index:",result.reason)}})}await indexesPromise;return db}
