async function Http(url, method = "GET", body = null) {
    const options = {
        method: method,
        headers: {},
    };

    if (body) {
        if (body instanceof FormData) {
            options.body = body;
        } else {
            options.headers["Content-Type"] = "application/json";
            options.body = JSON.stringify(body);
        }
    }

    const response = await fetch(url, options);

    if (response.status === 401 && !url.includes("/api/auth")) {
        if (window.location.pathname.startsWith("/dashboard")) {
            window.location.href = "/login";
        }
    }

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        let msg = errorData.msg || errorData.message || errorData.error || "Error en la petición";
        if (errorData.errors && Array.isArray(errorData.errors)) {
            msg = errorData.errors.map((e) => Object.values(e)[0]).join(", ");
        }
        throw new Error(msg);
    }

    return await response.json();
}

function snackbar({ message, type = "success" }) {
    let container = document.getElementById("snackbar-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "snackbar-container";
        container.className = "fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none";
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    const bg = type === "success" ? "bg-emerald-600" : "bg-red-600";
    toast.className = `${bg} text-white px-4 py-3 rounded-xl shadow-lg font-bold text-xs flex items-center gap-2 transition-all transform translate-y-2 opacity-0 duration-300 pointer-events-auto`;
    toast.innerHTML = `<span>${type === "success" ? "✓" : "⚠️"}</span> <span>${message}</span>`;

    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.remove("translate-y-2", "opacity-0");
    }, 10);

    setTimeout(() => {
        toast.classList.add("opacity-0");
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

class ResponsiveDataTable {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;
        this.data = options.data || [];
        this.columns = options.columns || [];
        this.editCallback = options.edit;
        this.deleteCallback = options.delete;
        this.customActions = options.customActions || [];
        this.render();
    }

    render() {
        if (!this.data || this.data.length === 0) {
            this.container.innerHTML =
                '<p class="text-xs text-slate-400 italic p-4 text-center">No hay datos registrados.</p>';
            return;
        }

        let html = `
      <!-- Table Desktop -->
      <div class="hidden md:block overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 font-bold uppercase tracking-wider">
              ${this.columns
                .map((col) => `<th class="p-3">${col.title}</th>`)
                .join("")}
              ${this.editCallback || this.deleteCallback || this.customActions.length > 0
                ? '<th class="p-3 text-right">Acciones</th>'
                : ""
            }
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200 dark:divide-slate-800">
            ${this.data
                .map(
                    (item, idx) => `
              <tr class="hover:bg-slate-50 dark:hover:bg-slate-950/50 transition-colors">
                ${this.columns
                            .map(
                                (col) =>
                                    `<td class="p-3 text-slate-800 dark:text-slate-200 font-medium">${item[col.key] !== undefined && item[col.key] !== null ? item[col.key] : ""
                                    }</td>`
                            )
                            .join("")}
                ${this.editCallback || this.deleteCallback || this.customActions.length > 0
                            ? `
                  <td class="p-3 text-right space-x-1.5 whitespace-nowrap">
                    ${this.customActions
                                .map(
                                    (act, aIdx) =>
                                        `<button onclick="window._dtInstances['${this.container.id}'].handleCustomAction(event, ${idx}, ${aIdx})" class="${act.class || 'px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold'}">${act.label}</button>`
                                )
                                .join("")}
                    ${this.editCallback
                                ? `<button onclick="window._dtInstances['${this.container.id}'].handleAction(event, ${idx}, 'edit')" class="px-2.5 py-1 bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg font-bold transition-all">Editar</button>`
                                : ""
                            }
                    ${this.deleteCallback
                                ? `<button onclick="window._dtInstances['${this.container.id}'].handleAction(event, ${idx}, 'delete')" class="px-2.5 py-1 bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 hover:bg-red-600 hover:text-white rounded-lg font-bold transition-all">Eliminar</button>`
                                : ""
                            }
                  </td>
                `
                            : ""
                        }
              </tr>
            `
                )
                .join("")}
          </tbody>
        </table>
      </div>

      <!-- Table Mobile (Cards) -->
      <div class="block md:hidden space-y-3">
        ${this.data
                .map(
                    (item, idx) => `
          <div class="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 shadow-sm">
            ${this.columns
                            .map(
                                (col) => `
              <div class="flex justify-between text-xs gap-2">
                <span class="font-bold text-slate-500">${col.title}:</span>
                <span class="text-slate-800 dark:text-slate-200 font-medium text-right">${item[col.key] !== undefined && item[col.key] !== null ? item[col.key] : ""
                                    }</span>
              </div>
            `
                            )
                            .join("")}
            ${this.editCallback || this.deleteCallback || this.customActions.length > 0
                            ? `
              <div class="flex flex-wrap justify-end gap-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                ${this.customActions
                                .map(
                                    (act, aIdx) =>
                                        `<button onclick="window._dtInstances['${this.container.id}'].handleCustomAction(event, ${idx}, ${aIdx})" class="${act.class || 'px-2 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold'}">${act.label}</button>`
                                )
                                .join("")}
                ${this.editCallback
                                ? `<button onclick="window._dtInstances['${this.container.id}'].handleAction(event, ${idx}, 'edit')" class="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold">Editar</button>`
                                : ""
                            }
                ${this.deleteCallback
                                ? `<button onclick="window._dtInstances['${this.container.id}'].handleAction(event, ${idx}, 'delete')" class="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-bold">Eliminar</button>`
                                : ""
                            }
              </div>
            `
                            : ""
                        }
          </div>
        `
                )
                .join("")}
      </div>
    `;

        this.container.innerHTML = html;
        window._dtInstances = window._dtInstances || {};
        window._dtInstances[this.container.id] = this;
    }

    handleAction(event, index, type) {
        const item = this.data[index];
        if (type === "edit" && this.editCallback) this.editCallback(event, item);
        if (type === "delete" && this.deleteCallback) this.deleteCallback(event, item);
    }

    handleCustomAction(event, index, actionIndex) {
        const item = this.data[index];
        const act = this.customActions[actionIndex];
        if (act && typeof act.callback === "function") {
            act.callback(event, item);
        }
    }
}

/**
 * Creates a debounced function that delays execution until wait milliseconds have elapsed.
 * @param {Function} func
 * @param {number} wait
 * @returns {Function}
 */
function debounce(func, wait = 300) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

/**
 * Autocomplete component supporting static options array or dynamic API search function.
 */
class Autocomplete {
    /**
     * @param {HTMLElement|string} inputElement
     * @param {Object} options
     */
    constructor(inputElement, options = {}) {
        this.input = typeof inputElement === "string" ? document.getElementById(inputElement) : inputElement;
        if (!this.input) return;

        this.options = options.options || [];
        this.fetchFn = options.fetch;
        this.onSelect = options.onSelect;
        this.minChars = options.minChars || 1;
        this.debounceTime = options.debounceTime || 300;
        this.placeholder = options.placeholder || "Sin resultados";
        this.renderItem = options.renderItem || ((item) => (typeof item === "object" ? item.label || item.name : item));

        this.selectedIndex = -1;
        this.items = [];
        this.dropdown = null;
        this.init();
    }

    init() {
        this.input.setAttribute("autocomplete", "off");
        this.wrapInput();
        this.createDropdown();
        this.bindEvents();
    }

    wrapInput() {
        if (!this.input.parentElement.classList.contains("relative")) {
            const wrapper = document.createElement("div");
            wrapper.className = "relative w-full";
            this.input.parentNode.insertBefore(wrapper, this.input);
            wrapper.appendChild(this.input);
        }
    }

    createDropdown() {
        this.dropdown = document.createElement("div");
        this.dropdown.className =
            "hidden absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl transition-all text-xs divide-y divide-slate-100 dark:divide-slate-800/60";
        this.input.parentElement.appendChild(this.dropdown);
    }

    bindEvents() {
        const debouncedSearch = debounce((query) => this.search(query), this.debounceTime);

        this.input.addEventListener("input", (e) => {
            const query = e.target.value.trim();
            if (query.length < this.minChars) {
                this.close();
                return;
            }
            debouncedSearch(query);
        });

        this.input.addEventListener("keydown", (e) => this.handleKeyDown(e));

        document.addEventListener("click", (e) => {
            if (!this.input.contains(e.target) && !this.dropdown.contains(e.target)) {
                this.close();
            }
        });
    }

    async search(query) {
        if (this.fetchFn) {
            try {
                this.items = await this.fetchFn(query);
            } catch (err) {
                this.items = [];
            }
        } else {
            const q = query.toLowerCase();
            this.items = this.options.filter((item) => {
                const label = typeof item === "object" ? item.label || item.name || "" : String(item);
                return label.toLowerCase().includes(q);
            });
        }
        this.render();
    }

    render() {
        this.selectedIndex = -1;
        if (!this.items || this.items.length === 0) {
            this.dropdown.innerHTML = `<div class="p-3 text-slate-400 italic text-center">${this.placeholder}</div>`;
            this.open();
            return;
        }

        this.dropdown.innerHTML = this.items
            .map((item, index) => {
                const content = this.renderItem(item);
                return `<div data-index="${index}" class="px-3 py-2.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors flex items-center justify-between autocomplete-item">${content}</div>`;
            })
            .join("");

        this.dropdown.querySelectorAll(".autocomplete-item").forEach((el) => {
            el.addEventListener("click", () => {
                const idx = parseInt(el.getAttribute("data-index"), 10);
                this.selectItem(idx);
            });
        });

        this.open();
    }

    handleKeyDown(e) {
        if (this.dropdown.classList.contains("hidden")) return;
        const items = this.dropdown.querySelectorAll(".autocomplete-item");

        if (e.key === "ArrowDown") {
            e.preventDefault();
            this.selectedIndex = (this.selectedIndex + 1) % items.length;
            this.updateHighlight(items);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            this.selectedIndex = (this.selectedIndex - 1 + items.length) % items.length;
            this.updateHighlight(items);
        } else if (e.key === "Enter") {
            if (this.selectedIndex >= 0 && this.selectedIndex < this.items.length) {
                e.preventDefault();
                this.selectItem(this.selectedIndex);
            }
        } else if (e.key === "Escape") {
            this.close();
        }
    }

    updateHighlight(items) {
        items.forEach((item, idx) => {
            if (idx === this.selectedIndex) {
                item.classList.add("bg-blue-50", "dark:bg-slate-800", "text-blue-600", "dark:text-blue-400");
                item.scrollIntoView({ block: "nearest" });
            } else {
                item.classList.remove("bg-blue-50", "dark:bg-slate-800", "text-blue-600", "dark:text-blue-400");
            }
        });
    }

    selectItem(index) {
        const item = this.items[index];
        if (!item) return;
        const value = typeof item === "object" ? item.label || item.name || JSON.stringify(item) : String(item);
        this.input.value = value;
        if (typeof this.onSelect === "function") {
            this.onSelect(item);
        }
        this.close();
    }

    open() {
        this.dropdown.classList.remove("hidden");
    }

    close() {
        this.dropdown.classList.add("hidden");
        this.selectedIndex = -1;
    }
}

/**
 * Manages system theme preference detection, local storage persistence, and Tailwind CSS dark class toggling.
 */
class ThemeManager {
    /**
     * Initializes theme detection and sets up matchMedia listener for system changes.
     */
    static init() {
        const savedTheme = localStorage.getItem("theme") || "system";
        ThemeManager.setTheme(savedTheme);

        window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
            const currentSetting = localStorage.getItem("theme") || "system";
            if (currentSetting === "system") {
                ThemeManager.applyTheme("system");
            }
        });
    }

    /**
     * Applies dark or light theme to html element based on preference.
     * @param {string} theme - 'dark', 'light', or 'system'
     */
    static applyTheme(theme) {
        const isDark =
            theme === "dark" ||
            (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

        if (isDark) {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
    }

    /**
     * Sets theme preference, applies theme, and saves to localStorage.
     * @param {string} theme - 'dark', 'light', or 'system'
     */
    static setTheme(theme) {
        localStorage.setItem("theme", theme);
        ThemeManager.applyTheme(theme);
    }

    /**
     * Toggles between dark and light theme.
     * @returns {string} next theme applied
     */
    static toggleTheme() {
        const currentIsDark = document.documentElement.classList.contains("dark");
        const nextTheme = currentIsDark ? "light" : "dark";
        ThemeManager.setTheme(nextTheme);
        return nextTheme;
    }

    /**
     * Gets current stored theme setting.
     * @returns {string} 'dark', 'light', or 'system'
     */
    static getTheme() {
        return localStorage.getItem("theme") || "system";
    }
}

/**
 * Displays a Promise-based modal confirmation dialog styled with Tailwind CSS.
 * @param {Object} options
 * @returns {Promise<boolean>}
 */
function confirmModal({
    title = "Confirmar acción",
    message = "¿Estás seguro de que deseas realizar esta acción?",
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    type = "danger",
} = {}) {
    return new Promise((resolve) => {
        const overlay = document.createElement("div");
        overlay.className =
            "fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 transition-opacity duration-200";

        const bgBtn =
            type === "danger" ? "bg-red-600 hover:bg-red-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white";

        overlay.innerHTML = `
            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl max-w-md w-full space-y-4 transform transition-all scale-100">
                <h3 class="text-base font-bold text-slate-800 dark:text-slate-100">${title}</h3>
                <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">${message}</p>
                <div class="flex justify-end gap-2 pt-2">
                    <button id="modal-cancel-btn" class="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">${cancelText}</button>
                    <button id="modal-confirm-btn" class="px-4 py-2 ${bgBtn} rounded-xl text-xs font-bold transition-all shadow-md">${confirmText}</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const cancelBtn = overlay.querySelector("#modal-cancel-btn");
        const confirmBtn = overlay.querySelector("#modal-confirm-btn");

        const cleanup = (value) => {
            overlay.classList.add("opacity-0");
            setTimeout(() => overlay.remove(), 200);
            resolve(value);
        };

        cancelBtn.addEventListener("click", () => cleanup(false));
        confirmBtn.addEventListener("click", () => cleanup(true));
        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) cleanup(false);
        });
    });
}

/**
 * Copies text to clipboard and optionally shows a snackbar feedback.
 * @param {string} text
 * @param {boolean} notify
 * @returns {Promise<boolean>}
 */
async function copyToClipboard(text, notify = true) {
    try {
        await navigator.clipboard.writeText(text);
        if (notify && typeof snackbar === "function") {
            snackbar({ message: "Copiado al portapapeles", type: "success" });
        }
        return true;
    } catch (err) {
        if (notify && typeof snackbar === "function") {
            snackbar({ message: "Error al copiar", type: "error" });
        }
        return false;
    }
}

/**
 * Formats a numeric value into a currency string.
 * @param {number} amount
 * @param {string} currency
 * @param {string} locale
 * @returns {string}
 */
function formatCurrency(amount, currency = "USD", locale = "es-AR") {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount || 0);
}

/**
 * Formats a date into a localized date string.
 * @param {string|Date} date
 * @param {Object} options
 * @returns {string}
 */
function formatDate(date, options = { day: "2-digit", month: "2-digit", year: "numeric" }) {
    if (!date) return "";
    const d = new Date(date);
    return new Intl.DateTimeFormat("es-AR", options).format(d);
}

if (typeof window !== "undefined") {
    document.addEventListener("DOMContentLoaded", () => {
        ThemeManager.init();
    });
}

window.Http = Http;
window.snackbar = snackbar;
window.ResponsiveDataTable = ResponsiveDataTable;
window.debounce = debounce;
window.Autocomplete = Autocomplete;
window.ThemeManager = ThemeManager;
window.confirmModal = confirmModal;
window.copyToClipboard = copyToClipboard;
window.formatCurrency = formatCurrency;
window.formatDate = formatDate;

window.addEventListener('DOMContentLoaded', () => {
    ThemeManager.init();
});