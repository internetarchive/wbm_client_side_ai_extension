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

    async analyzePage(pageContent) {
        try {
            if (!this.session) {
                await this.init();
            }
            const prompt = `
                Summarize this archived web page in 2-3 sentences:
                ${pageContent}
            `;
          
          const result = await this.session.prompt(prompt);
          
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
}