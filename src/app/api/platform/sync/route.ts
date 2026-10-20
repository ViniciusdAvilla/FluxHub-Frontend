import { backendMutation } from "@/lib/backend-transport";
import { isTrustedRequestOrigin } from "@/lib/request-security";
export const runtime="nodejs";
export async function POST(request:Request) {
  if(!request.headers.get("origin")||!isTrustedRequestOrigin(request))
    return Response.json({error:"Origem não autorizada."},{status:403});
  if(!request.headers.get("content-type")?.startsWith("application/json"))
    return Response.json({error:"Formato inválido."},{status:415});
  try {
    const raw=await request.text();
    if(raw.length>1024) return Response.json({error:"Requisição muito grande."},{status:413});
    const body=JSON.parse(raw) as {accountId?:unknown};
    if(!Number.isSafeInteger(body.accountId)||Number(body.accountId)<=0)
      return Response.json({error:"Conta inválida."},{status:422});
    const result=await backendMutation(`/api/v1/analytics/sync?account_id=${body.accountId}&limit=50&offset=0`,"POST");
    return Response.json(result,{headers:{"Cache-Control":"no-store"}});
  } catch(e) {
    return Response.json({error:e instanceof Error?e.message:"Sincronização indisponível."},{status:502});
  }
}
