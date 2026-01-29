const messages_default = {
    es: {
        required: (f) => `El campo ${f} es obligatorio`,
        min: (f, n) => `El campo ${f} debe tener al menos ${n} caracteres`,
        max: (f, n) => `El campo ${f} no puede tener más de ${n} caracteres`,
        email: (f) => `El campo ${f} debe ser un email válido`,
        number: (f) => `El campo ${f} debe ser numérico`,
        alpha: (f) => `El campo ${f} solo puede contener letras`,
        alphanumeric: (f) => `El campo ${f} solo puede contener letras y números`,
        boolean: (f) => `El campo ${f} debe ser verdadero o falso`,
        date: (f) => `El campo ${f} debe ser una fecha válida`,
        url: (f) => `El campo ${f} debe ser una URL válida`,
        in: (f, v) => `El campo ${f} debe ser uno de: ${v.join(', ')}`,
        equals: (f, v) => `El campo ${f} debe ser igual a ${v}`,
        password: () => `La contraseña debe tener mayúsculas, minúsculas y números`,
        pattern: (f) => `El campo ${f} no cumple el patrón requerido`
    },
    en: {
        required: (f) => `${f} is required`,
        min: (f, n) => `${f} must be at least ${n} characters`,
        max: (f, n) => `${f} must be at most ${n} characters`,
        email: (f) => `${f} must be a valid email`,
        number: (f) => `${f} must be numeric`,
        alpha: (f) => `${f} must contain only letters`,
        alphanumeric: (f) => `${f} must contain only letters and numbers`,
        boolean: (f) => `${f} must be true or false`,
        date: (f) => `${f} must be a valid date`,
        url: (f) => `${f} must be a valid URL`,
        in: (f, v) => `${f} must be one of: ${v.join(', ')}`,
        equals: (f, v) => `${f} must equal ${v}`,
        password: () => `Password must contain uppercase, lowercase and numbers`,
        pattern: (f) => `${f} does not match the required pattern`
    },
    pt: {
        required: (f) => `O campo ${f} é obrigatório`,
        min: (f, n) => `O campo ${f} deve ter pelo menos ${n} caracteres`,
        max: (f, n) => `O campo ${f} não pode ter mais de ${n} caracteres`,
        email: (f) => `O campo ${f} deve ser um email válido`,
        number: (f) => `O campo ${f} deve ser numérico`,
        alpha: (f) => `O campo ${f} só pode conter letras`,
        alphanumeric: (f) => `O campo ${f} só pode conter letras e números`,
        boolean: (f) => `O campo ${f} deve ser verdadeiro ou falso`,
        date: (f) => `O campo ${f} deve ser uma data válida`,
        url: (f) => `O campo ${f} deve ser uma URL válida`,
        in: (f, v) => `O campo ${f} deve ser um de: ${v.join(', ')}`,
        equals: (f, v) => `O campo ${f} deve ser igual a ${v}`,
        password: () => `A senha deve conter maiúsculas, minúsculas e números`,
        pattern: (f) => `O campo ${f} não corresponde ao padrão exigido`
    },
    br: {
        required: (f) => `O campo ${f} é obrigatório`,
        min: (f, n) => `O campo ${f} deve ter pelo menos ${n} caracteres`,
        max: (f, n) => `O campo ${f} não pode ter mais de ${n} caracteres`,
        email: (f) => `O campo ${f} deve ser um email válido`,
        number: (f) => `O campo ${f} deve ser numérico`,
        alpha: (f) => `O campo ${f} só pode conter letras`,
        alphanumeric: (f) => `O campo ${f} só pode conter letras e números`,
        boolean: (f) => `O campo ${f} deve ser verdadeiro ou falso`,
        date: (f) => `O campo ${f} deve ser uma data válida`,
        url: (f) => `O campo ${f} deve ser uma URL válida`,
        in: (f, v) => `O campo ${f} deve ser um de: ${v.join(', ')}`,
        equals: (f, v) => `O campo ${f} deve ser igual a ${v}`,
        password: () => `A senha deve conter maiúsculas, minúsculas e números`,
        pattern: (f) => `O campo ${f} não corresponde ao padrão exigido`
    },
    fr: {
        required: (f) => `Le champ ${f} est obligatoire`,
        min: (f, n) => `Le champ ${f} doit contenir au moins ${n} caractères`,
        max: (f, n) => `Le champ ${f} ne peut pas contenir plus de ${n} caractères`,
        email: (f) => `Le champ ${f} doit être un email valide`,
        number: (f) => `Le champ ${f} doit être numérique`,
        alpha: (f) => `Le champ ${f} ne peut contenir que des lettres`,
        alphanumeric: (f) => `Le champ ${f} ne peut contenir que des lettres et des chiffres`,
        boolean: (f) => `Le champ ${f} doit être vrai ou faux`,
        date: (f) => `Le champ ${f} doit être une date valide`,
        url: (f) => `Le champ ${f} doit être une URL valide`,
        in: (f, v) => `Le champ ${f} doit être l'un de: ${v.join(', ')}`,
        equals: (f, v) => `Le champ ${f} doit être égal à ${v}`,
        password: () => `Le mot de passe doit contenir des majuscules, des minuscules et des chiffres`,
        pattern: (f) => `Le champ ${f} ne correspond pas au modèle requis`
    }
};

const validators = {
    isEmpty: (value) => value === undefined || value === null || value === '',
    isEmail: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    isNumeric: (value) => !isNaN(value) && !isNaN(parseFloat(value)),
    isAlpha: (value) => /^[a-zA-Z]+$/.test(value),
    isAlphanumeric: (value) => /^[a-zA-Z0-9]+$/.test(value),
    isBoolean: (value) => value === true || value === false || value === 'true' || value === 'false',
    isISO8601: (value) => !isNaN(Date.parse(value)),
    isURL: (value) => {
        try {
            new URL(value);
            return true;
        } catch {
            return false;
        }
    },
    isLength: (value, { min, max }) => {
        const len = String(value).length;
        if (min !== undefined && len < min) return false;
        if (max !== undefined && len > max) return false;
        return true;
    },
    isIn: (value, values) => values.includes(value),
    equals: (value, comparison) => value === comparison,
    matches: (value, pattern) => pattern.test(value)
};

/**
 * Comprehensive Validator class for handling multi-language data validation.
 */
class Validator {
    /**
     * Initializes the Validator instance with a schema and optional language settings.
     * @param {Object} schema - Validation rules for each field (e.g., { email: { required: true, email: true } }).
     * @param {string} [lang_default=null] - Default language for error messages (e.g., "en", "es").
     * @param {Object} [messages=null] - Custom message overrides for validation rules.
     */
    constructor(schema, lang_default = null, messages = null) {
        this.schema = schema;
        this.lang_default = lang_default;
        this.messages = messages ? messages : messages_default;
    }

    /**
     * Validates the request body against the defined schema.
     * @param {import('express').Request} req - The Express request object containing the body to validate.
     * @returns {Promise<{success: boolean, error: boolean, errors: Array<{field: string, message: string}>, message: Array<string>, html: Array<string>}>} Validation results.
     * @example 
     * const loginSchema = {
     *     email: { required: true, email: true },
     *     password: { required: true, min: 6 }
     * };
     * const loginValidator = new Validator(loginSchema, 'es');
     * const result = await loginValidator.validate(req);
     */
    async validate(req) {
        const lang = this.lang_default ? this.lang_default : req?.session?.lang || "es";
        const msg = this.messages[lang] || this.messages.es;
        const errors = [];
        const messages = [];
        const body = req.body || {};

        for (const [field, config] of Object.entries(this.schema)) {
            const value = body[field];

            if (config.required && validators.isEmpty(value)) {
                messages.push(config.messages?.required || msg.required(field));
                errors.push({
                    field: field,
                    message: config.messages?.required || msg.required(field)
                })
                continue;
            }

            if (!validators.isEmpty(value)) {
                if (config.min && !validators.isLength(value, { min: config.min })) {
                    messages.push(config.messages?.min || msg.min(field, config.min));
                    errors.push({
                        field: field,
                        message: config.messages?.min || msg.min(field, config.min)
                    })
                }
                if (config.max && !validators.isLength(value, { max: config.max })) {
                    messages.push(config.messages?.max || msg.max(field, config.max));
                    errors.push({
                        field: field,
                        message: config.messages?.max || msg.max(field, config.max)
                    })
                }
                if (config.email && !validators.isEmail(value)) {
                    messages.push(config.messages?.email || msg.email(field));
                    errors.push({
                        field: field,
                        message: config.messages?.email || msg.email(field)
                    })
                }
                if (config.number && !validators.isNumeric(value)) {
                    messages.push(config.messages?.number || msg.number(field));
                    errors.push({
                        field: field,
                        message: config.messages?.number || msg.number(field)
                    })
                }
                if (config.alpha && !validators.isAlpha(value)) {
                    messages.push(config.messages?.alpha || msg.alpha(field));
                    errors.push({
                        field: field,
                        message: config.messages?.alpha || msg.alpha(field)
                    })
                }
                if (config.alphanumeric && !validators.isAlphanumeric(value)) {
                    messages.push(config.messages?.alphanumeric || msg.alphanumeric(field));
                    errors.push({
                        field: field,
                        message: config.messages?.alphanumeric || msg.alphanumeric(field)
                    })
                }
                if (config.boolean && !validators.isBoolean(value)) {
                    messages.push(config.messages?.boolean || msg.boolean(field));
                    errors.push({
                        field: field,
                        message: config.messages?.boolean || msg.boolean(field)
                    })
                }
                if (config.date && !validators.isISO8601(value)) {
                    messages.push(config.messages?.date || msg.date(field));
                    errors.push({
                        field: field,
                        message: config.messages?.date || msg.date(field)
                    })
                }
                if (config.url && !validators.isURL(value)) {
                    messages.push(config.messages?.url || msg.url(field));
                    errors.push({
                        field: field,
                        message: config.messages?.url || msg.url(field)
                    })
                }
                if (config.in && !validators.isIn(value, config.in)) {
                    messages.push(config.messages?.in || msg.in(field, config.in));
                    errors.push({
                        field: field,
                        message: config.messages?.in || msg.in(field, config.in)
                    })
                }
                if (config.equals !== undefined && !validators.equals(value, config.equals)) {
                    messages.push(config.messages?.equals || msg.equals(field, config.equals));
                    errors.push({
                        field: field,
                        message: config.messages?.equals || msg.equals(field, config.equals)
                    })
                }
                if (config.password && !validators.matches(value, /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{6,}$/)) {
                    messages.push(config.messages?.password || msg.password(field));
                    errors.push({
                        field: field,
                        message: config.messages?.password || msg.password(field)
                    })
                }
                if (config.pattern && !validators.matches(value, config.pattern)) {
                    messages.push(config.messages?.pattern || msg.pattern(field));
                    errors.push({
                        field: field,
                        message: config.messages?.pattern || msg.pattern(field)
                    })
                }
            }
        }

        if (errors.length > 0 || messages.length > 0) {
            return {
                success: false,
                error: true,
                errors: errors,
                message: messages,
                html: messages.map(e => `<p class="text-red-500 text-danger">${e}</p>`)
            };
        }

        return { success: true, error: false, errors: [], message: [], html: [] };
    }

    /**
     * Express middleware for automated validation of the request body.
     * Returns a 400 Bad Request response with validation results if errors occur.
     * @returns {Function} Express middleware function (req, res, next).
     * @example
     * 
     * const loginSchema = {
     *     email: { required: true, email: true },
     *     password: { required: true, min: 6 }
     * };
     * const loginValidator = new Validator(loginSchema, 'es');
     * routerUsers.post('/login', loginValidator.middleware(), (req, res) => {
     *     res.json({ message: 'Login successful' });
     * });
     */
    middleware() {
        return async (req, res, next) => {
            const result = await this.validate(req);
            if (!result.success) {
                return res.status(400).json(result);
            }
            next();
        };
    }
}

export default Validator