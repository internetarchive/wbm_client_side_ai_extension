export class AISession {
    constructor() {
        this.session = null;
    }
    async init() {
        try {
            const availability = await LanguageModel.availability();
            console.log("AI availability:", availability);
            if(availability === "available") {
                this.session = await LanguageModel.create({
                    expectedOutputLanguages: ["en"]
                });
                console.log("AI session created successfully!");
            }
            else {
                console.log("AI not available:", availability);
            }
        } catch ( error ) {
            console.error("Failed to create AI session:", error);
        } 
    }

    async analyzePage(pageContent,  timingSummary, action, targetLanguage) {
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
            const result = await this.session.prompt(prompt);
            console.timeEnd(action);

            if (targetLanguage && targetLanguage !== 'en') {
                const translated = await this.translateResult(result, targetLanguage);
                return {
                    success: true,
                    summary: translated,
                };
            }
            return {
                success: true,
                summary: result,
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
            };
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
}
