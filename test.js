import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: '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',
    baseURL: 'https://integrate.api.nvidia.com/v1',
})

async function main() {
    console.log("Started")
    const completion = await openai.chat.completions.create({
        model: "z-ai/glm-5.2",
        messages: [{ "role": "user", "content": "hi there!" }],
        temperature: 1,
        top_p: 1,
        max_tokens: 16384,
        seed: 42,

        stream: false
    })
    console.log(completion)
    // for await (const chunk of completion) {
    //     process.stdout.write(chunk.choices[0]?.delta?.content || '')
    //     console.log(chunk.choices[0]?.delta?.content)
    // }

}

await main();