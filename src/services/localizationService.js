const path = require('path');
const fs = require('fs');

class LocalizationService {
    constructor() {
        this.messages = new Map();
        this.supportedLanguages = ['en', 'pl', 'uk', 'de', 'fr', 'es', 'it', 'ru'];
        this.defaultLanguage = 'en';
        this.isInitialized = false;
    }

    initialize() {
        try {
            console.log('🌍 Initializing Localization Service...');

            this.supportedLanguages.forEach(lang => {
                try {
                    this.loadLanguage(lang);
                } catch (error) {
                    console.warn(`⚠️ Could not load ${lang} locale, using fallback`);
                    this.loadFallbackMessages(lang);
                }
            });

            this.isInitialized = true;
            console.log(`✅ Localization initialized with ${this.messages.size} languages`);

        } catch (error) {
            console.error('❌ Localization initialization failed, using English fallback:', error.message);
            this.loadFallbackMessages('en');
            this.isInitialized = true;
        }
    }

    loadLanguage(languageCode) {
        try {
            const filePath = path.join(__dirname, '..', 'locales', `${languageCode}.json`);

            if (fs.existsSync(filePath)) {
                const data = fs.readFileSync(filePath, 'utf8');
                const messages = JSON.parse(data);
                this.messages.set(languageCode, messages);
                console.log(`📚 Loaded ${languageCode} locale from file`);
            } else {
                throw new Error(`Locale file not found: ${filePath}`);
            }
        } catch (error) {
            console.warn(`⚠️ Loading ${languageCode} from fallback`);
            this.loadFallbackMessages(languageCode);
        }
    }

    loadFallbackMessages(languageCode) {
        const fallbackMessages = {
            'en': {
                commands: {
                    start: {
                        welcome: "🌿✨ *Greetings, {username}!* ✨🌿\n\n*Moss the Green Keeper awakens from the ancient grimoire...*\n\n🍄 I am the guardian of this enchanted recipe tome! Within these pages lie the culinary secrets of countless realms and kitchens.\n\n🔮 *Current magical abilities:*\n- Conversing with fellow cooks\n- Extracting recipes from cooking videos\n- Organizing recipes in your collection\n\n🌍 *Language Magic:* I automatically adapted to your language! Use /language to change it anytime.\n\n*Send /help to view my spell book, dear cook!* 📜⚡",
                        language_auto_detected: "🔍 **Language Auto-Detected!**\n\nI noticed your Telegram is set to {detected_language}, so I'm speaking {detected_language} with you!\n\n🌍 *Want to change?* Use /language anytime\n✨ *All recipes and responses will be in your preferred language*"
                    },
                    language: {
                        choose: "🌍 **Choose Your Language** 🌍\n\n🗣️ **Current:** {current_language}\n🔄 **Select new language for recipes and interface:",
                        changed: "✅ **Language Updated** ✅\n\n{language_flag} **New Language:** {language_name}\n🔄 **Recipe extraction will now use this language**\n🌿 **Interface updated for future interactions**\n📱 **Command menu updated to your language**\n\n*Moss adapts to your linguistic preferences!* ✨"
                    },
                    ping: {
                        response: "🏓 *Pong!* ⚡\n\n🌿 Moss is awake and ready!\n⏱️ Response time: {response_time}ms\n🌍 Speaking: {current_language}"
                    }
                }
            },
            'pl': {
                commands: {
                    start: {
                        welcome: "🌿✨ *Witaj, {username}!* ✨🌿\n\n*Moss, Zielony Strażnik budzi się z pradawnego grimoire...*\n\n🍄 Jestem strażnikiem tego zaczarowanego tomu przepisów! W tych kartach kryją się kulinarne sekrety niezliczonych krain i kuchni.\n\n🔮 *Obecne magiczne umiejętności:*\n- Rozmowy z innymi kucharzami\n- Wydobywanie przepisów z filmów kulinarnych\n- Organizowanie przepisów w kolekcji\n\n🌍 *Magia Językowa:* Automatycznie dostosowałem się do twojego języka! Użyj /language aby zmienić w dowolnym momencie.\n\n*Wyślij /help aby zobaczyć księgę zaklęć, drogi kucharzu!* 📜⚡",
                        language_auto_detected: "🔍 **Język Automatycznie Wykryty!**\n\nZauważyłem, że twój Telegram jest ustawiony na {detected_language}, więc rozmawiam z tobą po {detected_language}!\n\n🌍 *Chcesz zmienić?* Użyj /language w dowolnym momencie\n✨ *Wszystkie przepisy i odpowiedzi będą w twoim preferowanym języku*"
                    },
                    language: {
                        choose: "🌍 **Wybierz Swój Język** 🌍\n\n🗣️ **Obecny:** {current_language}\n🔄 **Wybierz nowy język dla przepisów i interfejsu:**",
                        changed: "✅ **Język Zaktualizowany** ✅\n\n{language_flag} **Nowy Język:** {language_name}\n🔄 **Wydobywanie przepisów będzie teraz używać tego języka**\n🌿 **Interfejs zaktualizowany dla przyszłych interakcji**\n📱 **Menu komend zaktualizowane do twojego języka**\n\n*Moss dostosowuje się do twoich preferencji językowych!* ✨"
                    },
                    ping: {
                        response: "🏓 *Pong!* ⚡\n\n🌿 Moss jest czujny i gotowy!\n⏱️ Czas odpowiedzi: {response_time}ms\n🌍 Mówię: {current_language}"
                    }
                }
            },
            'uk': {
                commands: {
                    start: {
                        welcome: "🌿✨ *Вітаю, {username}!* ✨🌿\n\n*Мос, Зелений Хранитель прокидається з давнього гримуару...*\n\n🍄 Я хранитель цього зачарованого тому рецептів! На цих сторінках приховані кулінарні секрети незліченних світів та кухонь.\n\n🔮 *Поточні магічні здібності:*\n- Розмови з іншими кухарями\n- Витягування рецептів з кулінарних відео\n- Організація рецептів у колекції\n\n🌍 *Мовна Магія:* Я автоматично адаптувався до вашої мови! Використовуйте /language щоб змінити в будь-який час.\n\n*Надішліть /help щоб переглянути книгу заклинань, дорогий кухар!* 📜⚡",
                        language_auto_detected: "🔍 **Мову Автоматично Виявлено!**\n\nЯ помітив, що ваш Telegram налаштований на {detected_language}, тому я розмовляю {detected_language} з вами!\n\n🌍 *Хочете змінити?* Використовуйте /language в будь-який час\n✨ *Всі рецепти та відповіді будуть вашою бажаною мовою*"
                    },
                    language: {
                        choose: "🌍 **Виберіть Вашу Мову** 🌍\n\n🗣️ **Поточна:** {current_language}\n🔄 **Виберіть нову мову для рецептів та інтерфейсу:**",
                        changed: "✅ **Мову Оновлено** ✅\n\n{language_flag} **Нова Мова:** {language_name}\n🔄 **Витягування рецептів тепер використовуватиме цю мову**\n🌿 **Інтерфейс оновлено для майбутніх взаємодій**\n📱 **Меню команд оновлено до вашої мови**\n\n*Мос адаптується до ваших мовних вподобань!* ✨"
                    },
                    ping: {
                        response: "🏓 *Понг!* ⚡\n\n🌿 Мос пильний і готовий!\n⏱️ Час відповіді: {response_time}мс\n🌍 Розмовляю: {current_language}"
                    }
                }
            }
        };

        this.messages.set(languageCode, fallbackMessages[languageCode] || fallbackMessages['en']);
    }

    getMessage(key, languageCode = 'en', interpolations = {}) {
        if (!this.isInitialized) {
            this.initialize();
        }

        const lang = this.messages.has(languageCode) ? languageCode : this.defaultLanguage;
        const langMessages = this.messages.get(lang) || this.messages.get(this.defaultLanguage);

        if (!langMessages) {
            return key;
        }

        const message = this.getNestedProperty(langMessages, key);

        if (!message) {
            const fallbackMessages = this.messages.get(this.defaultLanguage);
            const fallbackMessage = this.getNestedProperty(fallbackMessages, key);
            return fallbackMessage ? this.interpolateMessage(fallbackMessage, interpolations) : key;
        }

        return this.interpolateMessage(message, interpolations);
    }

    getNestedProperty(obj, key) {
        return key.split('.').reduce((current, prop) => {
            return current && current[prop] !== undefined ? current[prop] : null;
        }, obj);
    }

    interpolateMessage(message, interpolations = {}) {
        return message.replace(/\{(\w+)\}/g, (match, key) => {
            return interpolations[key] !== undefined ? interpolations[key] : match;
        });
    }

    detectTelegramLanguage(ctx) {
        const telegramLang = ctx.from?.language_code;
        if (!telegramLang) {
            return this.defaultLanguage;
        }

        const baseLang = telegramLang.split('-')[0];
        if (this.supportedLanguages.includes(baseLang)) {
            console.log(`🔍 Auto-detected Telegram language: ${baseLang}`);
            return baseLang;
        }

        console.log(`🔍 Telegram language ${baseLang} not supported, falling back to ${this.defaultLanguage}`);
        return this.defaultLanguage;
    }

    getLanguageInfo(languageCode) {
        const languageNames = {
            'en': { name: 'English', nativeName: 'English', flag: '🇬🇧' },
            'pl': { name: 'Polish', nativeName: 'Polski', flag: '🇵🇱' },
            'uk': { name: 'Ukrainian', nativeName: 'Українська', flag: '🇺🇦' },
            'de': { name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
            'fr': { name: 'French', nativeName: 'Français', flag: '🇫🇷' },
            'es': { name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
            'it': { name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
            'ru': { name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' }
        };

        const info = languageNames[languageCode] || languageNames[this.defaultLanguage];
        return `${info.flag} ${info.nativeName}`;
    }

    getLanguageDetails(languageCode) {
        const details = {
            'en': { name: 'English', nativeName: 'English', flag: '🇬🇧' },
            'pl': { name: 'Polish', nativeName: 'Polski', flag: '🇵🇱' },
            'uk': { name: 'Ukrainian', nativeName: 'Українська', flag: '🇺🇦' },
            'de': { name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
            'fr': { name: 'French', nativeName: 'Français', flag: '🇫🇷' },
            'es': { name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
            'it': { name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
            'ru': { name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' }
        };

        return details[languageCode] || details[this.defaultLanguage];
    }

    getSupportedLanguages() {
        return this.supportedLanguages.map(code => ({
            code,
            ...this.getLanguageDetails(code)
        }));
    }

    isLanguageSupported(languageCode) {
        return this.supportedLanguages.includes(languageCode);
    }

    botMessage(ctx, messageKey, interpolations = {}) {
        const userLang = ctx.dbUser?.preferred_language || this.defaultLanguage;
        return this.getMessage(messageKey, userLang, interpolations);
    }
}

// singleton instance
const localizationService = new LocalizationService();

module.exports = localizationService;