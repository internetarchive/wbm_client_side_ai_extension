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
                this.session = await LanguageModel.create({
                    expectedOutputLanguages: ["en"],
                    expectedInputs: [
                        { type: "text" },
                        { type: "image" }
                    ],
                    initialPrompts: [
                        {
                            role: "system",
                            content: "You are an assistant that analyzes archived web pages from the Wayback Machine. You may receive page text, load-timing data, and occasionally a screenshot. Base your answers only on what's given — don't guess at details that aren't present."
                        }
                    ]
                });
                this.insightSession = await this.session.clone();
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

            const worker = await this.session.clone();

            let promptInput;
            const streamOptions = action === "quality" ? {
                responseConstraint: {
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
                            minItems: 1,
                            maxItems: 3
                        }
                    },
                    required: ["analysis"],
                    additionalProperties: false
                }
            } : {};

            if (action === "quality" && screenshotBlob) {
                const textPrompt = `Analyze this archived web page using the load timing stats and the attached screenshot. Answer each question in 1-2 concise sentences.

            // Truncate page content to fit remaining context window
            const remaining = worker.contextWindow - worker.contextUsage;
            const promptOverhead = 400; // buffer for prompt text + timing stats + response
            const available = Math.max(remaining - promptOverhead, 100);
            const charBudget = available * 4; // ~4 chars per token
            if (pageContent.length > charBudget) {
              pageContent = pageContent.slice(0, charBudget);
            }

            let prompt;

Load Stats:
${timingSummary}`;

                promptInput = [{ role: "user", content: [
                    { type: "image", value: screenshotBlob },
                    { type: "text", value: textPrompt }
                ]}];
            } else if (action === "quality") {
                promptInput = `Analyze this archived web page using the load timing stats. Answer each question in 1-2 concise sentences.

1) Is this a real page or a soft-404 error page? Look for signs like very short/generic content, "not found" style messaging, or an empty body.
2) Does the content look complete, or truncated/broken?

Load Stats:
${timingSummary}`;
            } else {
                promptInput = `Summarize this archived web page in 2-3 sentences:
                    ${pageContent}`;
            }

            console.time(action);
            const stream = await worker.promptStreaming(promptInput, streamOptions);

            let fullText = "";

            for await (const chunk of stream) {
                fullText += chunk;
                chrome.tabs.sendMessage(tabId, {
                    type: "STREAM_CHUNK",
                    chunk
                });
            }

            chrome.tabs.sendMessage(tabId, {
                type: "STREAM_END"
            });
            console.timeEnd(action);
            
            if (targetLanguage && targetLanguage !== 'en') {
                chrome.tabs.sendMessage(tabId, {
                    type: "SHOW_TRANSLATING"
                })
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
