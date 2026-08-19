document.addEventListener("DOMContentLoaded", () => {


    /* ==============================
       ELEMENTOS
    ================================= */

    const form = document.getElementById("serviceForm");

    const service = document.getElementById("service");

    const description = document.getElementById("description");

    const counter = document.getElementById("counter");

    const cep = document.getElementById("cep");

    const searchCep = document.getElementById("searchCep");

    const addressText = document.getElementById("addressText");

    const modal = document.getElementById("modal");

    const closeModal = document.getElementById("closeModal");

    const userMenuBtn = document.getElementById("userMenuBtn");

    const userMenu = document.getElementById("userMenu");

    const logout = document.getElementById("logout");


    /* ==============================
       CONTADOR
    ================================= */

    description.addEventListener("input", () => {

        counter.textContent = description.value.length;

    });


    /* ==============================
       MÁSCARA CEP
    ================================= */

    cep.addEventListener("input", () => {

        let value = cep.value.replace(/\D/g, "");

        if (value.length > 5) {

            value =
                value.substring(0, 5) +
                "-" +
                value.substring(5, 8);

        }

        cep.value = value;

    });


    /* ==============================
       BUSCAR CEP
    ================================= */

    searchCep.addEventListener("click", async () => {

        const cleanCep =
            cep.value.replace(/\D/g, "");

        if (cleanCep.length !== 8) {

            addressText.textContent =
                "Digite um CEP válido.";

            return;

        }

        addressText.textContent =
            "Buscando endereço...";


        try {

            const response =
                await fetch(
                    `https://viacep.com.br/ws/${cleanCep}/json/`
                );

            const data =
                await response.json();


            if (data.erro) {

                addressText.textContent =
                    "CEP não encontrado.";

                return;

            }


            addressText.textContent =
                `${data.logradouro}, ${data.bairro} - ${data.localidade}/${data.uf}`;

        }

        catch (error) {

            addressText.textContent =
                "Não foi possível consultar o CEP.";

            console.error(error);

        }

    });


    /* ==============================
       SERVIÇOS POPULARES
    ================================= */

    const serviceCards =
        document.querySelectorAll(".service-card");


    serviceCards.forEach(card => {

        card.addEventListener("click", () => {

            const selectedService =
                card.dataset.service;

            service.value =
                selectedService;


            document.getElementById("solicitar")
                .scrollIntoView({
                    behavior: "smooth"
                });

        });

    });


    /* ==============================
       ENVIO DO FORMULÁRIO
    ================================= */

    form.addEventListener("submit", event => {

        event.preventDefault();


        if (!service.value) {

            alert(
                "Selecione o serviço que você precisa."
            );

            return;

        }


        if (!description.value.trim()) {

            alert(
                "Descreva o serviço que você precisa."
            );

            description.focus();

            return;

        }


        const cleanCep =
            cep.value.replace(/\D/g, "");


        if (cleanCep.length !== 8) {

            alert(
                "Informe um CEP válido."
            );

            cep.focus();

            return;

        }


        /* ABRE MODAL */

        modal.classList.add("show");


        /*
            Aqui futuramente você poderá enviar
            os dados para o PHP/Supabase.

            Exemplo:

            fetch("../backend/criar-solicitacao.php", {
                method: "POST",
                body: new FormData(form)
            });
        */


        setTimeout(() => {

            const loadingText =
                document.querySelector(".loading-text");

            loadingText.textContent =
                "Profissionais encontrados!";

        }, 1800);


    });


    /* ==============================
       FECHAR MODAL
    ================================= */

    closeModal.addEventListener("click", () => {

        modal.classList.remove("show");

    });


    modal.addEventListener("click", event => {

        if (event.target === modal) {

            modal.classList.remove("show");

        }

    });


    /* ==============================
       MENU DO USUÁRIO
    ================================= */

    userMenuBtn.addEventListener("click", event => {

        event.stopPropagation();

        userMenu.classList.toggle("show");

    });


    document.addEventListener("click", event => {

        if (
            !userMenu.contains(event.target) &&
            event.target !== userMenuBtn
        ) {

            userMenu.classList.remove("show");

        }

    });


    /* ==============================
       INFORMAÇÕES DO USUÁRIO
    ================================= */

    const userName = document.getElementById("userName");
    const userAvatar = document.getElementById("userAvatar");

    const savedUserStr = localStorage.getItem("helpgo_user");
    if (savedUserStr) {
        try {
            const savedUser = JSON.parse(savedUserStr);
            if (savedUser.nome) {
                const primeiroNome = savedUser.nome.split(" ")[0];
                if (userName) userName.textContent = primeiroNome;
                if (userAvatar) userAvatar.textContent = primeiroNome.charAt(0).toUpperCase();
            }
        } catch (e) {
            console.error("Erro ao carregar usuário:", e);
        }
    }

    // Se o cliente Supabase estiver disponível, busca dados da sessão ativa
    if (typeof supabaseClient !== "undefined" && supabaseClient) {
        supabaseClient.auth.getUser().then(({ data }) => {
            if (data?.user) {
                const nome = data.user.user_metadata?.nome || data.user.email?.split("@")[0];
                if (nome) {
                    const primeiroNome = nome.split(" ")[0];
                    if (userName) userName.textContent = primeiroNome;
                    if (userAvatar) userAvatar.textContent = primeiroNome.charAt(0).toUpperCase();
                }
            }
        }).catch(err => console.warn("Aviso ao buscar usuário:", err));
    }


    /* ==============================
       LOGOUT
    ================================= */

    logout.addEventListener("click", async event => {

        event.preventDefault();

        const confirmLogout =
            confirm("Deseja realmente sair?");


        if (confirmLogout) {

            if (typeof supabaseClient !== "undefined" && supabaseClient) {
                try {
                    await supabaseClient.auth.signOut();
                } catch (err) {
                    console.warn("Erro ao deslogar no Supabase:", err);
                }
            }

            localStorage.removeItem("helpgo_user");

            window.location.href =
                "./login.html";

        }

    });


    /* ==============================
       DATA MÍNIMA
    ================================= */

    const dateInput =
        document.getElementById("date");

    const today =
        new Date().toISOString()
            .split("T")[0];

    dateInput.min = today;

});