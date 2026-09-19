// =======================================================
// HELPGO - PAINEL ADMIN (legado)
// Corrigido para usar supabaseClient e coluna correta.
// O painel principal é admin.html + admin.js.
// =======================================================

async function verificarAdministrador() {

    if (typeof supabaseClient === "undefined" || !supabaseClient) {
        window.location.href = "./login.html";
        return;
    }

    const {
        data: { user }
    } = await supabaseClient.auth.getUser();

    if (!user) {
        window.location.href = "./login.html";
        return;
    }

    const { data: admin, error } = await supabaseClient
        .from("admins")
        .select("id, email, nome")
        .eq("id", user.id)
        .maybeSingle();

    if (error || !admin) {
        await supabaseClient.auth.signOut();
        window.location.href = "./login.html";
        return;
    }

    const nomeEl = document.getElementById("nomeAdmin");
    if (nomeEl) {
        nomeEl.textContent = admin.nome;
    }
}


async function logout() {
    if (typeof AuthService !== "undefined") {
        await AuthService.fazerLogout();
    } else if (supabaseClient) {
        await supabaseClient.auth.signOut();
        window.location.href = "./login.html";
    }
}


const btnLogout = document.getElementById("btnLogout");
if (btnLogout) {
    btnLogout.addEventListener("click", logout);
}


verificarAdministrador();