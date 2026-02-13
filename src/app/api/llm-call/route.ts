import Groq from "groq-sdk";

const Groq_api=process.env.GROQ_API_KEY;

const groq = new Groq({apiKey:Groq_api});
async function main() {
  const completion = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      {
        role: "user",
        content: "Explain why fast inference is critical for reasoning models",
      },
    ],
  });
  console.log(completion.choices[0]?.message?.content);
}
main().catch(console.error);