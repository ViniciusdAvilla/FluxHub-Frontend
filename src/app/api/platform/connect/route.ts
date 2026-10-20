import { backendRequest } from "@/lib/backend-transport";
import { isTrustedRequestOrigin } from "@/lib/request-security";
export const runtime="nodejs";
export async function POST(request:Request){
  if(!request.headers.get("origin")||!isTrustedRequestOrigin(request))
    return Response.json({error:"Origem não autorizada."},{status:403});
  if(!request.headers.get("content-type")?.startsWith("application/json"))
    return Response.json({error:"Formato inválido."},{status:415});
  try{
    const raw=await request.text();
    if(raw.length>500)return Response.json({error:"Requisição extensa."},{status:413});
    const {provider}=JSON.parse(raw) as {provider?:unknown};
    if(provider!=="mercado-livre"&&provider!=="mercado-pago")
      return Response.json({error:"Provedor não autorizado."},{status:422});
    const data=await backendRequest(`/api/v1/connectors/${provider}/authorize`) as {authorization_url?:string};
    if(!data.authorization_url)throw new Error("O backend não forneceu autorização.");
    const url=new URL(data.authorization_url);
    if(url.protocol!=="https:"||url.username||url.password)
      throw new Error("URL de autorização inválida.");
    return Response.json({authorization_url:data.authorization_url},{headers:{"Cache-Control":"no-store"}});
  }catch(e){return Response.json({error:e instanceof Error?e.message:"Falha de integração."},{status:502});}
}
