import mongoose,{Schema,models,model} from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser{
    email:string;
    password:string;
    _id?:mongoose.Types.ObjectId//special mongodb type
    createdAt?:Date,//? this is for checking true or not
    updatedAt?:Date
}

const userSchema=new Schema<IUser>(
    {
        email:{type:String,required:true,unique:true},
        password:{type:String,required:true},
       

    },
    {timestamps:true}
)
//if password changes call this hook to encrypt it
userSchema.pre("save",async function (){
    if(this.isModified("password")){
        this.password=await bcrypt.hash(this.password,10);
    }
    
})
//In next js always check this that is anything simliar is already there on the db or not because nextjs run on edge
const User=models?.User || model<IUser>("User",userSchema)

export default User

