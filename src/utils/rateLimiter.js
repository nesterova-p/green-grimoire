class RateLimiter {
    constructor() {
        this.messageQueue = [];
        this.isProcessing = false;
        this.lastMessageTime = 0;
        this.minDelay = 1000; // 1 second between messages
    }

    async sendMessage(telegramBot, chatId, text, options = {}) {
        return new Promise((resolve, reject) => {
            this.messageQueue.push({
                type: 'message',
                telegramBot,
                chatId,
                text,
                options,
                resolve,
                reject
            });
            this.processQueue();
        });
    }

    async sendVideo(telegramBot, chatId, video, options = {}) {
        return new Promise((resolve, reject) => {
            this.messageQueue.push({
                type: 'video',
                telegramBot,
                chatId,
                video,
                options,
                resolve,
                reject
            });
            this.processQueue();
        });
    }

    async editMessageText(telegramBot, chatId, messageId, text, options = {}) {
        return new Promise((resolve, reject) => {
            this.messageQueue.push({
                type: 'edit',
                telegramBot,
                chatId,
                messageId,
                text,
                options,
                resolve,
                reject
            });
            this.processQueue();
        });
    }

    async processQueue() {
        if (this.isProcessing || this.messageQueue.length === 0) {
            return;
        }

        this.isProcessing = true;

        while (this.messageQueue.length > 0) {
            const task = this.messageQueue.shift();

            try {
                // wait if sent a message tooooo recently
                const timeSinceLastMessage = Date.now() - this.lastMessageTime;
                if (timeSinceLastMessage < this.minDelay) {
                    await this.sleep(this.minDelay - timeSinceLastMessage);
                }

                let result;
                switch (task.type) {
                    case 'message':
                        result = await this.sendMessageWithRetry(
                            task.telegramBot,
                            task.chatId,
                            task.text,
                            task.options
                        );
                        break;
                    case 'video':
                        result = await this.sendVideoWithRetry(
                            task.telegramBot,
                            task.chatId,
                            task.video,
                            task.options
                        );
                        break;
                    case 'edit':
                        result = await this.editMessageWithRetry(
                            task.telegramBot,
                            task.chatId,
                            task.messageId,
                            task.text,
                            task.options
                        );
                        break;
                }

                this.lastMessageTime = Date.now();
                task.resolve(result);

            } catch (error) {
                console.error('Rate limiter error:', error.message);
                task.reject(error);
            }
        }

        this.isProcessing = false;
    }

    async sendMessageWithRetry(telegramBot, chatId, text, options, retries = 3) {
        for (let i = 0; i < retries; i++) {
            try {
                if (options.message_thread_id) {
                    return await telegramBot.sendMessage(chatId, text, options);
                } else {
                    return await telegramBot.sendMessage(chatId, text, options);
                }
            } catch (error) {
                if (error.response?.error_code === 429) {
                    const retryAfter = error.response.parameters?.retry_after || 5;
                    console.log(`Rate limited, waiting ${retryAfter}s before retry ${i + 1}/${retries}`);
                    await this.sleep(retryAfter * 1000);
                } else {
                    throw error;
                }
            }
        }
        throw new Error('Max retries exceeded for sendMessage');
    }

    async sendVideoWithRetry(telegramBot, chatId, video, options, retries = 3) {
        for (let i = 0; i < retries; i++) {
            try {
                return await telegramBot.sendVideo(chatId, video, options);
            } catch (error) {
                if (error.response?.error_code === 429) {
                    const retryAfter = error.response.parameters?.retry_after || 5;
                    console.log(`Rate limited, waiting ${retryAfter}s before retry ${i + 1}/${retries}`);
                    await this.sleep(retryAfter * 1000);
                } else {
                    throw error;
                }
            }
        }
        throw new Error('Max retries exceeded for sendVideo');
    }

    async editMessageWithRetry(telegramBot, chatId, messageId, text, options, retries = 3) {
        for (let i = 0; i < retries; i++) {
            try {
                return await telegramBot.editMessageText(chatId, messageId, null, text, options);
            } catch (error) {
                if (error.response?.error_code === 429) {
                    const retryAfter = error.response.parameters?.retry_after || 5;
                    console.log(`Rate limited, waiting ${retryAfter}s before retry ${i + 1}/${retries}`);
                    await this.sleep(retryAfter * 1000);
                } else {
                    throw error;
                }
            }
        }
        throw new Error('Max retries exceeded for editMessage');
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// global rate limiter
const globalRateLimiter = new RateLimiter();

module.exports = globalRateLimiter;