export function GET() {
  return Response.json({
    status: "ok",
    aplicacao: "ThiagoDocs Web",
    release: "assistente-escritura-v3"
  });
}
