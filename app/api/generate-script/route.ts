export async function POST(req: Request) {
  const body = await req.json();
  const { topic } = body;

  console.log("API received topic:", topic);

  return Response.json({
    script: `🔥 Viral Script for: ${topic}`,
  });
}