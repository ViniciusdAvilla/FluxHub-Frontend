import { backendRequest } from "@/lib/backend-transport";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const ids = new URL(request.url).searchParams.get("ids") || "";
  const values = ids.split(",");
  if (!values.length || values.length > 100 ||
      values.some(id => !/^[A-Z0-9]{3,100}$/i.test(id)))
    return Response.json({error:"Lista de produtos inválida."},{status:422});
  try {
    const result = await backendRequest("/api/v1/products/photos",
      new URLSearchParams({ ids: values.join(",") }), 25000);
    return Response.json(result,{headers:{"Cache-Control":"private, no-store"}});
  } catch {
    return Response.json({error:"Fotos indisponíveis."},{
      status:502,headers:{"Cache-Control":"private, no-store"}});
  }
}
