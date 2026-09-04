// =======================================================
// HELPGO - CONFIGURAÇÃO CENTRAL DA API PHP
// =======================================================

const ApiConfig = (() => {

    // Determina a URL base da API dinamicamente
    function getBaseUrl() {
        const origin = window.location.origin;
        const pathname = window.location.pathname;

        // Se estiver rodando dentro de subpasta (ex: /testes para deixar adequado/pages/...)
        if (pathname.includes("/pages/")) {
            return pathname.substring(0, pathname.indexOf("/pages")) + "/api";
        }

        // Se estiver na raiz
        return origin.includes("localhost") || origin.includes("127.0.0.1")
            ? "/api"
            : "./api";
    }

    const BASE_URL = getBaseUrl();

    /**
     * Helper padrão para chamadas à API PHP com suporte a Sessão (cookies)
     */
    async function apiFetch(endpoint, options = {}) {
        let url = endpoint;
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            // Se o endpoint não começar com a base da API, adiciona
            if (!url.startsWith("/api") && !url.startsWith("./api") && !url.startsWith("api/")) {
                url = `${BASE_URL}/${url.replace(/^\//, "")}`;
            } else {
                url = `${BASE_URL.replace(/\/api$/, "")}/${url.replace(/^\//, "")}`;
            }
        }

        const defaultHeaders = {
            "Content-Type": "application/json",
            "Accept": "application/json"
        };

        const config = {
            ...options,
            credentials: "include", // Envia e recebe cookies de sessão PHP
            headers: {
                ...defaultHeaders,
                ...(options.headers || {})
            }
        };

        if (options.body && typeof options.body === "object") {
            config.body = JSON.stringify(options.body);
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                const errorMsg = data.error || data.message || `Erro na requisição (${response.status})`;
                const err = new Error(errorMsg);
                err.status = response.status;
                err.data = data;
                throw err;
            }

            return data;
        } catch (error) {
            console.error(`[API Error] ${url}:`, error);
            throw error;
        }
    }

    return {
        BASE_URL,
        apiFetch
    };

})();
