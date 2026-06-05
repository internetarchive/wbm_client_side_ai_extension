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
                    expectedOutputLanguages: ["en"],
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

    async analyzePage(pageContent, action, targetLanguage) {
        try {
            if (!this.session) {
                await this.init();
            }
            let prompt;

            if(action === "summarize") {
                prompt = `
                    Summarize this archived web page in 2-3 sentences:
                    ${pageContent}
                `;

                console.time("summarise");
                const result = await this.session.prompt(prompt);
                console.timeEnd("summarise");

                return {
                    success: true,
                    type: 'summarize',
                    summary: result,
                };
            } else if(action === "quality") {
                prompt = `Analyze this archived web page and determine: 1) Is this a real page or a soft-404 error page? 2) Does the content seem complete or broken? Answer in 2-3 sentences: ${pageContent}`;

                console.time("quality");
                const result = await this.session.prompt(prompt);
                console.timeEnd("quality");

                return {
                    success: true,
                    type: 'quality',
                    summary: result,
                };
            } else if(action === "translate") {
                prompt = `
                Translate the following text to ${targetLanguage}.
                Return only the translated text without any explanation or prefix:    
                ${pageContent}`;

                console.time("Translation");
                const result = await this.session.prompt(prompt);
                console.timeEnd("Translation");
                
                return { success: true, type: 'translate', summary: result };
            }
        } catch (error) {
            return {
                success: false,
                error: error.message,
            };
        }
    }
}
