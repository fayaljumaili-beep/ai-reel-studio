// trigger redeploy
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { prompt } = body

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
            content: `Write a viral short-form video script about: ${prompt}`
          }
        ]
      }),
    })

    const data = await res.json()

    return Response.json({
      script: data.choices?.[0]?.message?.content || "No script generated"
    })

  } catch (err) {
    return new Response("Error generating script", { status: 500 })
  }
}