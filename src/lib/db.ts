import { error } from "console";
import mongoose from "mongoose";   

const MONGODB_URL=process.env.MONGODB_URL!;//! his exclamtory is for the typescipt


if(!MONGODB_URL){
    throw new Error("Please define mongodb url in env file")
}

let cached=global.mongoose;//as this now not define the globally so we have to define this as type in type.d.ts because we are using typescript

if(!cached){
    cached=global.mongoose={
        conn:null,promise:null,
    };
}
export async function connectToDatabase() {
    //the connnection already exist
    if(cached.conn){
        return cached.conn
    }
    //agar promise nhi hai to 
    if(!cached.promise){
        const opts={
            bufferCommands:true,//what this does(homework)
            //One-line intuition

// bufferCommands = true → “Queue now, execute later”
// bufferCommands = false → “No DB? No work.”
            
            maxPoolSize:10,//how many connection 
        }
    
   
    cached.promise=mongoose.connect(MONGODB_URL,opts).then(()=>
    mongoose.connection)

    }
     //if there is promis
     try{
        cached.conn=await cached.promise
     }catch (error){
        cached.promise=null//already running garbage promise
        throw error
     }
     return cached.conn
    
}