export async function POST(req: Request) {
  const body = await req.json();
  const { topic } = body;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Write a viral short-form video script about: ${topic}`
        }
      ],
    }),
  });

  const data = await res.json();

  return Response.json({
    script: data.choices[0].message.content,
  });
}