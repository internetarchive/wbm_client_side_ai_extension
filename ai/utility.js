export class AISession {
    constructor() {
        this.session = null;
        this.insightSession = null;
    }
    async init() {
        try {
            const availability = await LanguageModel.availability();
            console.log("AI availability:", availability);
            if(availability === "available") {
                [this.session, this.insightSession] = await Promise.all([
                    LanguageModel.create({
                        expectedOutputLanguages: ["en"],
                        expectedInputs: [
                            { type: "text" },
                            { type: "image" }
                        ],
                        initialPrompts: [
                            {
                                role: "system",
                                content: "You are a helpful assistant that analyzes archived web pages from the Wayback Machine. Provide concise, accurate summaries and quality assessments based on what the prompt of the user is asking."
                            }
                        ]
                    }),
                    LanguageModel.create({
                        expectedOutputLanguages: ["en"],
                        initialPrompts: [
                            {
                                role: "system",
                                content: "You are a structured data extraction assistant. Always respond with valid JSON in the exact schema requested. Do not include markdown, code fences, or explanations outside the JSON."
                            }
                        ]
                    })
                ]);
                console.log("AI sessions created successfully!");
            }
            else {
                console.log("AI not available:", availability);
            }
        } catch ( error ) {
            console.error("Failed to create AI sessions:", error);
        } 
    }

    async getStructuredInsights(pageContent) {
        try {
            if (!this.insightSession) {
                await this.init();
                if (!this.insightSession) return { faqs: [], famousPeople: [] };
            }

            const schema = {
                type: "object",
                properties: {
                    faqs: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                question: { type: "string" },
                                answer: { type: "string" }
                            },
                            required: ["question", "answer"],
                            additionalProperties: false
                        }
                    },
                    famousPeople: {
                        type: "array",
                        items: { type: "string" }
                    }
                },
                required: ["faqs", "famousPeople"],
                additionalProperties: false
            };

            const prompt = `Based on this archived web page, generate interesting FAQs and notable personalities related to the page's topic.

Rules:
- FAQs: 3-5 interesting questions with clear, informative answers
- famousPeople: 2-4 notable personalities associated with this topic

Page content:
${pageContent}`;

            const result = await this.insightSession.prompt(prompt, { responseConstraint: schema });
            const parsed = JSON.parse(result);
            return {
                faqs: Array.isArray(parsed.faqs) ? parsed.faqs : [],
                famousPeople: Array.isArray(parsed.famousPeople) ? parsed.famousPeople : []
            };
        } catch (error) {
            console.error("Failed to get structured insights:", error);
            return { faqs: [], famousPeople: [] };
        }
    }

    async analyzePage(pageContent, timingSummary, action, targetLanguage, tabId, screenshotBlob) {
        try {
            if (!this.session) {
                await this.init();
            }

            if (action === "quality" && screenshotBlob) {
                await this.session.append([{
                    role: "user",
                    content: [
                        { type: "image", value: screenshotBlob },
                        { type: "text", value: "This is a screenshot of the archived web page. Use it alongside the page text to assess visual quality and completeness." }
                    ]
                }]);
            }

            let prompt;

            console.log(targetLanguage);

            if(action === "summarize") {
                prompt = `Summarize this archived web page in 2-3 sentences:
                    ${pageContent}`;
            } else if(action === "quality") {
                prompt = `Analyze this archived web page in three aspects:

1) Is this a real page or a soft-404 error page?
2) Does the content seem complete or broken?
3) Also mention some lines about the screenshot of the page that you are seeing.

Page content:
${pageContent}

Load Stats:
${timingSummary}`;
            } 
            console.time(action);

            const qualitySchema = {
                type: "object",
                properties: {
                    analysis: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                question: { type: "string" },
                                answer: { type: "string" }
                            },
                            required: ["question", "answer"],
                            additionalProperties: false
                        },
                        minItems: 3,
                        maxItems: 3
                    }
                },
                required: ["analysis"],
                additionalProperties: false
            };

            const streamOptions = action === "quality" ? { responseConstraint: qualitySchema } : {};
            const stream = await this.session.promptStreaming(prompt, streamOptions);

            chrome.tabs.sendMessage(tabId, {
                type: "STREAM_START",
                action,
                targetLanguage
            });

            let fullText = "";

            for await (const chunk of stream) {
                fullText += chunk;
                chrome.tabs.sendMessage(tabId, {
                    type: "STREAM_CHUNK",
                    chunk
                });
            }

            if (action === "quality") {
                try {
                    const parsed = JSON.parse(fullText);
                    if (parsed.analysis && Array.isArray(parsed.analysis)) {
                        fullText = parsed.analysis.map(item => `**${item.question}**\n\n${item.answer}`).join('\n\n');
                    }
                } catch (e) {
                    console.error("Failed to parse quality JSON:", e);
                }
            }

            console.timeEnd(action);

            if (targetLanguage && targetLanguage !== 'en') {
                const translated = await this.translateResult(fullText, targetLanguage);
                return {
                    success: true,
                    summary: translated,
                    originalSummary: fullText
                };
            }
            return {
                success: true,
                summary: fullText,
                originalSummary: fullText
            };
        } catch (error) {
            if(targetLanguage && targetLanguage !== 'en') {
                const translatedError = await this.translateResult(error.message, targetLanguage);
                chrome.tabs.sendMessage(tabId,{
                    type:"STREAM_ERROR",
                    error:translatedError
                });
                return {
                    success: false,
                    error: translatedError,
                };
            }
            return {
                success: false,
                error: error.message
            }
        }
    }

    async translateResult(text, targetLanguage) {
        try {
            const detector = await LanguageDetector.create();
            const [{ detectedLanguage }] = await detector.detect(text);
            console.log("Detected language:", detectedLanguage);

            const availability = await Translator.availability({
            sourceLanguage: detectedLanguage,
            targetLanguage: targetLanguage
            });

            if (availability === 'unavailable') {
                console.log("Translation unavailable, returning original");
                return text;
            }

            const translator = await Translator.create({
                sourceLanguage: detectedLanguage,
                targetLanguage: targetLanguage
            });

            const lines = text.split('\n');
            const translatedLines = await Promise.all(
                lines.map(async (line) => {
                    if (line.trim() === '') return line;
                    
                    const translated = await translator.translate(line);
                    return translated;
                })
            );
            translator.destroy();
            return translatedLines.join('\n');

        } catch (error) {
            console.error("Translation failed:", error);
            return text; 
        }
    }

    async translateInsights(insights, targetLanguage) {
        if (!targetLanguage || targetLanguage === "en") return insights;

        const texts = [];

        insights.faqs?.forEach(faq => {
            texts.push(faq.question);
            texts.push(faq.answer);
        });
        insights.famousPeople?.forEach(person => texts.push(person));

        if (texts.length === 0) return insights;

        try {
            const detector = await LanguageDetector.create();
            const [{ detectedLanguage }] = await detector.detect(texts.join(" "));

            const translator = await Translator.create({
                sourceLanguage: detectedLanguage,
                targetLanguage
            });

            const translated = await Promise.all(
                texts.map(text => translator.translate(text))
            );
            translator.destroy();

            const result = { faqs: [], famousPeople: [] };
            let idx = 0;

            for (let i = 0; i < (insights.faqs?.length || 0); i++) {
                result.faqs.push({
                    question: translated[idx++],
                    answer: translated[idx++]
                });
            }
            for (let i = 0; i < (insights.famousPeople?.length || 0); i++) {
                result.famousPeople.push(translated[idx++]);
            }

            return result;
        } catch (error) {
            console.error("Failed to translate insights:", error);
            return insights;
        }
    }
}
