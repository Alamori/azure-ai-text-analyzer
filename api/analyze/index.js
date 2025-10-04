const { OpenAIClient, AzureKeyCredential } = require("@azure/openai");

module.exports = async function (context, req) {
    context.log('Azure AI Text Analyzer - Processing request');

    // CORS headers
    context.res = {
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
    };

    // Handle OPTIONS request (CORS preflight)
    if (req.method === 'OPTIONS') {
        context.res.status = 200;
        return;
    }

    // Validate request method
    if (req.method !== 'POST') {
        context.res.status = 405;
        context.res.body = { error: 'Method not allowed. Use POST.' };
        return;
    }

    // Get text from request body
    const text = req.body?.text;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
        context.res.status = 400;
        context.res.body = { error: 'Please provide text to analyze' };
        return;
    }

    try {
        // Azure OpenAI Configuration
        const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
        const apiKey = process.env.AZURE_OPENAI_KEY;
        const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-4";

        if (!endpoint || !apiKey) {
            throw new Error('Azure OpenAI credentials not configured');
        }

        // Initialize Azure OpenAI client
        const client = new OpenAIClient(endpoint, new AzureKeyCredential(apiKey));

        // Create the prompt
        const prompt = `Analyze the following text and provide:
1. Sentiment (positive/negative/neutral)
2. Key topics (3-5 main topics)
3. Brief summary (2-3 sentences)

Text: "${text}"

Respond in a clear, structured format.`;

        // Call Azure OpenAI
        const result = await client.getChatCompletions(deploymentName, [
            {
                role: "system",
                content: "You are a helpful AI assistant that analyzes text for sentiment, topics, and summaries."
            },
            {
                role: "user",
                content: prompt
            }
        ], {
            maxTokens: 500,
            temperature: 0.7,
            topP: 1.0
        });

        // Extract the response
        const analysis = result.choices[0].message.content;

        // Return success response
        context.res.status = 200;
        context.res.body = {
            success: true,
            analysis: analysis,
            metadata: {
                model: deploymentName,
                textLength: text.length,
                timestamp: new Date().toISOString()
            }
        };

    } catch (error) {
        context.log.error('Error analyzing text:', error);
        
        context.res.status = 500;
        context.res.body = {
            error: 'Failed to analyze text',
            message: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        };
    }
};