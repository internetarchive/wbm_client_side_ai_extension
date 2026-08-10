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
                    LanguageModel.create({ expectedOutputLanguages: ["en"] }),
                    LanguageModel.create({ expectedOutputLanguages: ["en"] })
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
            const prompt = `Based on this archived web page, generate interesting FAQs and notable personalities related to the page's topic.
Return ONLY valid JSON matching this exact schema:
{
  "faqs": [{ "question": "string", "answer": "string" }],
  "famousPeople": ["string"]
}

Rules:
- FAQs: 3-5 interesting questions with clear, informative answers
- famousPeople: 2-4 notable personalities associated with this topic
- No explanations, no markdown, no code fences \u2014 pure JSON only.

Page content:
${pageContent}`;

            const result = await this.insightSession.prompt(prompt);

            const jsonStr = result.replace(/```(?:json)?\s*([\s\S]*?)\s*```/g, '$1').trim();
            const parsed = JSON.parse(jsonStr);
            return {
                faqs: Array.isArray(parsed.faqs) ? parsed.faqs : [],
                famousPeople: Array.isArray(parsed.famousPeople) ? parsed.famousPeople : []
            };
        } catch (error) {
            console.error("Failed to get structured insights:", error);
            return { faqs: [], famousPeople: [] };
        }
    }

    async analyzePage(pageContent,  timingSummary, action, targetLanguage, tabId) {
        try {
            if (!this.session) {
                await this.init();
            }
            let prompt;

            console.log(targetLanguage);

            if(action === "summarize") {
                prompt = `Summarize this archived web page in 2-3 sentences:
                    ${pageContent}`;
            } else if(action === "quality") {
                prompt = `Analyze this archived web page and determine: 1) Is this a real page or a soft-404 error page? 2) Does the content seem complete or broken? Answer in 2-3 sentences: ${pageContent} \n\nLoad Stats:\n ${timingSummary}`;
            } 
            console.time(action);
            const stream = await this.session.promptStreaming(prompt);

            chrome.tabs.sendMessage(tabId, {
                type: "STREAM_START",
                action
            });

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
                };
            }
            return {
                success: true,
                summary: fullText,
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
