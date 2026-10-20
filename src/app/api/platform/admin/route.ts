import { backendMutation } from "@/lib/backend-transport";
import { isTrustedRequestOrigin } from "@/lib/request-security";
export const runtime="nodejs";
export async function POST(request:Request){
  if(!request.headers.get("origin")||!isTrustedRequestOrigin(request))
    return Response.json({error:"Origem não autorizada."},{status:403});
  if(!request.headers.get("content-type")?.startsWith("application/json"))
    return Response.json({error:"Formato inválido."},{status:415});
  try{
    const text=await request.text();
    if(text.length>4096)return Response.json({error:"Requisição extensa."},{status:413});
    const body=JSON.parse(text) as {action?:unknown;id?:unknown;email?:unknown;password?:unknown;enabled?:unknown};
    const id=body.id;
    const password=typeof body.password==="string"?body.password:"";
    if(body.action==="create"){
      if(typeof body.email!=="string"||body.email.length>320||password.length<12||password.length>256)
        return Response.json({error:"E-mail ou senha inválidos."},{status:422});
      const result=await backendMutation("/api/v1/admin/users","POST",{email:body.email,password});
      return Response.json(result,{status:201});
    }
    if(!Number.isSafeInteger(id)||Number(id)<=0)
      return Response.json({error:"Usuário inválido."},{status:422});
    if(body.action==="reset"){
      if(password.length<12||password.length>256)return Response.json({error:"Senha inválida."},{status:422});
      return Response.json(await backendMutation(`/api/v1/admin/users/${id}/reset-password`,"POST",{password}));
    }
    if(body.action==="status"&&typeof body.enabled==="boolean")
      return Response.json(await backendMutation(`/api/v1/admin/users/${id}/status`,"PATCH",{is_active:body.enabled}));
    return Response.json({error:"Ação inválida."},{status:422});
  }catch(e){return Response.json({error:e instanceof Error?e.message:"Falha de comunicação com backend."},{status:502});}
}
