export class AISession {
    constructor() {
        this.session = null;
        this.insightSession = null;
        this.compareSession = null;
    }

    async CompareSessionInit() {
        try {
            const availability = await LanguageModel.availability();
            console.log("Compare AI availability:", availability);
            
            if (availability === "available") {
                this.compareSession = await LanguageModel.create({
                    expectedOutputLanguages: ["en"],
                    expectedInputs: [
                        { type: "text" }
                    ],
                    initialPrompts: [
                        {
                            role: "system",
                            content: `You are an expert date and time parser. Convert the user's request into EXACTLY TWO 14-digit Wayback Machine timestamps (YYYYMMDDHHMMSS).
                            
                    CRITICAL INSTRUCTIONS:
                    - You MUST respond with ONLY a valid JSON object matching this exact schema: {"type":"object","properties":{"tsA":{"type":"string"},"tsB":{"type":"string"}},"required":["tsA","tsB"]}
                    - Do not wrap the JSON in markdown blocks or backticks. Output raw JSON only.
                    - If the user asks for one date (e.g., "compare with 2010"), tsA MUST be the Current Snapshot Date provided, and tsB is the requested date.
                    - If the user asks to compare two specific dates (e.g., "2004 vs 2005"), use those for tsA and tsB.
                    - Default to the 1st of the month/year at 00:00:00 if exact days are missing.
                    - RULE AGAINST IDENTICAL TIMESTAMPS: tsA and tsB MUST NEVER be exactly the same. If the user asks to compare with the "same day", "earlier today", or if the timestamps would otherwise be identical, set the time of tsB to the very beginning of the day (000000).

                    EXAMPLES:
                    Current snapshot date: 20260716000000. User request: "Compare with 2015" 
                    Output: {"tsA": "20260716000000", "tsB": "20150101000000"}

                    Current snapshot date: 20200219213704. User request: "Compare 2004 with 2002" 
                    Output: {"tsA": "20040101000000", "tsB": "20020101000000"}

                    Current snapshot date: 20240315143000. User request: "Compare with another one from today" 
                    Output: {"tsA": "20240315143000", "tsB": "20240315000000"}`
                    }
                    ]
                });
                console.log("Compare AI session created successfully!");
                return this.compareSession;
            } else {
                console.log("Compare AI not available:", availability);
                return null;
            }
        } catch (error) {
            console.error("Failed to create Compare AI session:", error);
            return null;
        }
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
                        items: {
                            type: "object",
                            properties: {
                                name: { type: "string" },
                                description: { type: "string" }
                            },
                            required: ["name", "description"],
                            additionalProperties: false
                        }
                    }
                },
                required: ["faqs", "famousPeople"],
                additionalProperties: false
            };

            const prompt = `Based on this archived web page, generate interesting FAQs and notable personalities related to the page's topic.

Rules:
- FAQs: 3-5 interesting questions with clear, informative answers
- famousPeople: 2-4 notable personalities associated with this topic, each with a one-line description about who they are

Page content:
${pageContent}`;

            const result = await this.insightSession.prompt(prompt, { responseConstraint: schema });
            const parsed = JSON.parse(result);
            return {
                faqs: Array.isArray(parsed.faqs) ? parsed.faqs : [],
                famousPeople: Array.isArray(parsed.famousPeople) ? parsed.famousPeople.map(p => ({
                    name: p.name || "",
                    description: p.description || ""
                })) : []
            };
        } catch (error) {
            console.error("Failed to get structured insights:", error);
            return { faqs: [], famousPeople: [] };
        }
    }

    async getTimeStamp(currentSnapshotDate, userQuery) {
        try {
            if(!this.compareSession) {
                await this.CompareSessionInit();
            }
            const timestampSchema = {
                type: "object",
                properties: {
                    tsA: { 
                        type: "string",
                        description: "The first 14-digit Wayback Machine timestamp (YYYYMMDDHHMMSS). If only one date is requested, this MUST be the current snapshot date."
                    },
                    tsB: { 
                        type: "string",
                        description: "The second 14-digit Wayback Machine timestamp (YYYYMMDDHHMMSS). This is the target comparison date."
                    }
                },
                required: ["tsA", "tsB"],
                additionalProperties: false
            };
            const promptText = `Current snapshot date: ${currentSnapshotDate}. User request: "${userQuery}"`;
            console.log("Sending to Compare AI:", promptText);
            const data = await this.compareSession.prompt(promptText, { responseConstraint: timestampSchema });
            const tsResponse = JSON.parse(data);
            return tsResponse;
        } catch (error) {
            console.error("Error generating timestamp from AI:", error);
            return null;
        }
    }

    async analyzePage(pageContent, timingSummary, action, targetLanguage, tabId, screenshotBlob, httpStatus = null) {
        try {
            if (!this.session) {
                await this.init();
            }

            const worker = await this.session.clone();

            let promptInput;
            const qualitySchema = {
                type: "object",
                properties: {
                    errorStatus: { type: "string" },
                    contentCompleteness: { type: "string" }
                },
                required: ["errorStatus", "contentCompleteness"],
                additionalProperties: false
            };
            if (screenshotBlob) {
                qualitySchema.properties.screenshotQuality = { type: "string" };
                qualitySchema.required.push("screenshotQuality");
            }
            const streamOptions = action === "quality" ? { responseConstraint: qualitySchema } : {};

            if (action === "quality" && screenshotBlob) {
                const statusLine = httpStatus?.status === "confirmed" ? `HTTP Status: ${httpStatus.codes[0]}` :
                    httpStatus?.status === "chain" ? `HTTP Status chain: ${httpStatus.codes.join(' → ')}` : '';
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

${statusLine}
Load Stats:
${timingSummary}`;

                promptInput = [{ role: "user", content: [
                    { type: "image", value: screenshotBlob },
                    { type: "text", value: textPrompt }
                ]}];
            } else if (action === "quality") {
                const statusLine = httpStatus?.status === "confirmed" ? `HTTP Status: ${httpStatus.codes[0]}` :
                    httpStatus?.status === "chain" ? `HTTP Status chain: ${httpStatus.codes.join(' → ')}` : '';
                promptInput = `Analyze this archived web page using the load timing stats. Answer each question in 1-2 concise sentences.

1) Is this page showing an error? (real error page, soft-404, or normal). Even if the HTTP status is 200, the page can still be a soft-404 — look for signs like very short/generic text, "not found" messaging, or an empty body.
2) Does the content look complete, or truncated/broken?

${statusLine}
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

            worker.destroy();

            if (action === "quality") {
                try {
                    const parsed = JSON.parse(fullText);
                    const imageBase = chrome.runtime.getURL('Public');
                    const qa = [
                        { q: "Is this page showing an error? (real error page, soft-404, or normal)", key: "errorStatus", icon: "🛑" },
                        { q: "Does the content look complete, or truncated/broken?", key: "contentCompleteness", icon: "📄" },
                    ];
                    if (parsed.screenshotQuality) {
                        qa.push({ q: "Does the screenshot show a properly rendered page, or something broken/blank?", key: "screenshotQuality", icon: "🖼️" });
                    }
                    fullText = qa.map(({ q, key, icon }) => {
                        const answer = parsed[key];
                        if (!answer) return '';
                        let img = '';
                        if (key === 'errorStatus') {
                            const lower = answer.toLowerCase();
                            if (lower.includes('normal')) {
                                img = `<p><img src="${imageBase}/200.jpeg" style="max-width:160px; border-radius:8px; margin-top:8px;"></p>`;
                            } else if (lower.includes('error') || lower.includes('404') || lower.includes('soft-404') || lower.includes('broken') || lower.includes('not found') || lower.includes('blank') || lower.includes('empty')) {
                                img = `<p><img src="${imageBase}/404.jpeg" style="max-width:160px; border-radius:8px; margin-top:8px;"></p>`;
                            }
                        }
                        return `<p><strong>${icon} ${q}</strong></p><p>${answer}</p>${img}`;
                    }).filter(Boolean).join('');
                } catch (e) {
                    console.error("Failed to parse quality JSON:", e);
                }
            }

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
            if (action !== "quality" && targetLanguage && targetLanguage !== 'en') {
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
        insights.famousPeople?.forEach(person => {
            texts.push(person.name);
            texts.push(person.description);
        });

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

            const result = {
                faqs: [],
                famousPeople: [],
                famousPeopleOriginal: insights.famousPeople
                    ? insights.famousPeople.map(p => ({ name: p.name, description: p.description }))
                    : []
            };
            let idx = 0;

            for (let i = 0; i < (insights.faqs?.length || 0); i++) {
                result.faqs.push({
                    question: translated[idx++],
                    answer: translated[idx++]
                });
            }
            for (let i = 0; i < (insights.famousPeople?.length || 0); i++) {
                result.famousPeople.push({
                    name: translated[idx++],
                    description: translated[idx++]
                });
            }

            return result;
        } catch (error) {
            console.error("Failed to translate insights:", error);
            return insights;
        }
    }

    async summarizeChanges(titleChanges, diffText) {
        try {
            if (!this.session) await this.init();
            if (!this.session) return "";

            const worker = await this.session.clone();
            const MAX_CHARS = 6000;
            let trimmed = false;
            if (diffText.length > MAX_CHARS) {
                diffText = diffText.slice(0, MAX_CHARS) + "\n... (truncated)";
                trimmed = true;
            }

            const prompt = `Compare these two versions of a web page and summarize what changed in 2-3 sentences. Focus on meaningful content changes, not formatting.

${titleChanges ? `Title changed from "${titleChanges.before}" to "${titleChanges.after}"` : ""}

Changes:
${diffText}${trimmed ? "\n\nNote: The changes list was truncated. Focus on the most significant changes visible." : ""}`;

            const result = await worker.prompt(prompt);
            worker.destroy();
            return result;
        } catch (error) {
            console.error("Failed to summarize changes:", error);
            return "";
        }
    }
}
