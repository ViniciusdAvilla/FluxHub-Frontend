import "server-only";
import { backendRequest } from "./backend-transport";
import { sellerIdentity } from "./seller-data";
import type { SellerIdentity, SourceStatus } from "./seller-data";

export type AdminUser={id:number;email:string;is_admin:boolean;is_active:boolean;created_at:string};
export type AdminOverview={total_users:number;active_users:number;total_products:number;mercado_livre_accounts:number;mercado_pago_accounts:number};
export type AdminClient={user:AdminUser;sources:SourceStatus[]};
export type AdminReport={me:SellerIdentity|null;overview:AdminOverview|null;clients:AdminClient[];error:string|null};

export async function getAdminReport():Promise<AdminReport>{
  const me=await sellerIdentity();
  if(!me?.is_admin) return {me,overview:null,clients:[],error:"Acesso reservado aos administradores."};
  try{
    const [overview,users]=await Promise.all([
      backendRequest("/api/v1/admin/overview") as Promise<AdminOverview>,
      backendRequest("/api/v1/admin/users",new URLSearchParams({limit:"100",offset:"0"})) as Promise<AdminUser[]>,
    ]);
    const rows=await Promise.all(users.slice(0,100).map(async u=>{
      try{
        const sources=await backendRequest(`/api/v1/admin/users/${u.id}/sources`) as SourceStatus[];
        return {user:u,sources:Array.isArray(sources)?sources:[]};
      }catch{return {user:u,sources:[]};}
    }));
    return {me,overview,clients:rows,error:null};
  }catch(e){return {me,overview:null,clients:[],error:e instanceof Error?e.message:"API administrativa indisponível."};}
}
