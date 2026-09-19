const ProfileSettings = (() => {
    let dialog;
    let perfil;
    let fotoAlterada;
    let ocupado = false;
    let ultimoFoco;
    let menuAtivo;
    const byId = id => document.getElementById(id);

    function fotoSegura(url) {
        return typeof url === "string" && (/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(url) || /^https:\/\//i.test(url));
    }

    function avatar(elemento, nome, foto) {
        if (!elemento) return;
        const inicial = (nome || "Usuário").trim().charAt(0).toUpperCase();
        elemento.replaceChildren();
        elemento.textContent = inicial;
        if (!fotoSegura(foto)) return;
        const img = document.createElement("img");
        img.className = "profile-avatar-image";
        img.alt = "";
        img.addEventListener("error", () => { elemento.textContent = inicial; }, { once: true });
        img.src = foto;
        elemento.replaceChildren(img);
    }

    function renderUser(usuario) {
        if (!usuario) return;
        const nome = usuario.nome || "Usuário";
        const primeiroNome = nome.trim().split(/\s+/)[0];
        for (const id of ["userName", "providerName", "welcomeProviderName"]) {
            if (byId(id)) byId(id).textContent = primeiroNome;
        }
        for (const id of ["sidebarAdminName", "profileNameDisplay"]) {
            if (byId(id)) byId(id).textContent = nome;
        }
        const foto = usuario.fotoUrl ?? usuario.foto_url;
        for (const id of ["userAvatar", "providerAvatar", "profileAvatarLarge", "sidebarAdminAvatar", "topAdminAvatar"]) {
            avatar(byId(id), nome, foto);
        }
    }

    function mensagem(id, texto = "", erro = false) {
        const el = byId(id);
        el.textContent = texto;
        el.dataset.error = String(erro);
    }

    function bloquear(valor) {
        ocupado = valor;
        byId("settingsProfileFields").disabled = valor;
        byId("settingsPasswordFields").disabled = valor;
        byId("settingsClose").disabled = valor;
        byId("settingsCancel").disabled = valor;
    }

    function fecharMenu() {
        if (!menuAtivo) return;
        const { menu, trigger } = menuAtivo;
        menu.classList.remove("show");
        if (menu.id === "adminProfileMenu") menu.hidden = true;
        trigger.setAttribute("aria-expanded", "false");
        menuAtivo = null;
    }

    function prepararMenu(trigger, menu) {
        if (!trigger || !menu) return;
        trigger.setAttribute("aria-expanded", "false");
        trigger.setAttribute("aria-controls", menu.id);
        trigger.addEventListener("click", event => {
            event.stopPropagation();
            const aberto = menuAtivo?.trigger === trigger;
            fecharMenu();
            if (aberto) return;
            if (menu.id === "adminProfileMenu") {
                menu.hidden = false;
                const rect = trigger.getBoundingClientRect();
                menu.style.left = Math.max(8, Math.min(rect.right - 225, window.innerWidth - 233)) + "px";
                menu.style.top = Math.max(8, Math.min(rect.bottom + 8, window.innerHeight - menu.offsetHeight - 8)) + "px";
            }
            menu.classList.add("show");
            trigger.setAttribute("aria-expanded", "true");
            menuAtivo = { trigger, menu };
            menu.querySelector("button, a")?.focus();
        });
    }

    async function abrir() {
        if (dialog.open) return;
        ultimoFoco = menuAtivo?.trigger || document.activeElement;
        fecharMenu();
        perfil = null;
        fotoAlterada = undefined;
        byId("settingsProfileForm").reset();
        byId("settingsPasswordForm").reset();
        avatar(byId("settingsPhotoPreview"), "Usuário", "");
        mensagem("settingsProfileMessage", "Carregando seu perfil...");
        mensagem("settingsPasswordMessage");
        dialog.showModal();
        bloquear(true);
        try {
            perfil = await PerfilService.carregar();
            byId("settingsName").value = perfil.nome || "";
            byId("settingsPhone").value = perfil.telefone || "";
            byId("settingsEmail").value = perfil.email || "";
            avatar(byId("settingsPhotoPreview"), perfil.nome, perfil.foto_url);
            mensagem("settingsProfileMessage");
            bloquear(false);
            byId("settingsName").focus();
        } catch (error) {
            mensagem("settingsProfileMessage", error.message, true);
            ocupado = false;
            byId("settingsClose").disabled = false;
            byId("settingsCancel").disabled = false;
            byId("settingsClose").focus();
        }
    }

    function fechar() {
        if (ocupado) return;
        dialog.close();
    }

    function inicializar() {
        dialog = document.createElement("dialog");
        dialog.className = "profile-settings";
        dialog.setAttribute("aria-labelledby", "settingsTitle");
        dialog.innerHTML = `
            <header class="profile-settings-header">
                <div><h2 id="settingsTitle">Configurações de perfil</h2><p>Atualize seus dados e a segurança da sua conta.</p></div>
                <button type="button" class="profile-settings-close" id="settingsClose">Fechar</button>
            </header>
            <div class="profile-settings-body">
                <form id="settingsProfileForm">
                    <fieldset id="settingsProfileFields">
                        <legend>Dados pessoais</legend>
                        <div class="profile-photo-row">
                            <div class="profile-photo-preview" id="settingsPhotoPreview" aria-label="Prévia da foto de perfil"></div>
                            <div>
                                <div class="profile-photo-actions">
                                    <button type="button" class="profile-settings-secondary" id="settingsChoosePhoto">Alterar foto</button>
                                    <button type="button" class="profile-settings-secondary" id="settingsRemovePhoto">Remover foto</button>
                                </div>
                                <input type="file" id="settingsPhotoInput" accept="image/jpeg,image/png,image/webp" hidden>
                                <p class="profile-photo-note">JPG, PNG ou WebP, até 5 MB. A foto será recortada ao centro.</p>
                            </div>
                        </div>
                        <div class="profile-settings-fields">
                            <div class="profile-settings-wide"><label for="settingsName">Nome completo</label><input id="settingsName" name="name" autocomplete="name" required minlength="2" maxlength="100"></div>
                            <div><label for="settingsPhone">Telefone</label><input id="settingsPhone" name="tel" type="tel" autocomplete="tel" maxlength="25" placeholder="(11) 99999-9999"></div>
                            <div><label for="settingsEmail">E-mail da conta</label><input id="settingsEmail" type="email" readonly aria-describedby="settingsEmailNote"><p id="settingsEmailNote" class="profile-photo-note">O e-mail de acesso não pode ser alterado aqui.</p></div>
                        </div>
                        <div class="profile-settings-actions"><button class="profile-settings-primary" type="submit" id="settingsSave">Salvar alterações</button></div>
                    </fieldset>
                    <p class="profile-settings-message" id="settingsProfileMessage" role="status" aria-live="polite"></p>
                </form>
                <form id="settingsPasswordForm" class="profile-settings-password">
                    <fieldset id="settingsPasswordFields">
                        <legend>Alterar senha</legend>
                        <label for="settingsCurrentPassword">Senha atual</label><input id="settingsCurrentPassword" type="password" autocomplete="current-password" required>
                        <div class="profile-settings-fields">
                            <div><label for="settingsNewPassword">Nova senha</label><input id="settingsNewPassword" type="password" autocomplete="new-password" minlength="8" required aria-describedby="settingsPasswordNote"></div>
                            <div><label for="settingsConfirmPassword">Confirmar nova senha</label><input id="settingsConfirmPassword" type="password" autocomplete="new-password" minlength="8" required></div>
                        </div>
                        <p id="settingsPasswordNote" class="profile-photo-note">Use pelo menos 8 caracteres.</p>
                        <div class="profile-settings-actions"><button class="profile-settings-secondary" type="submit" id="settingsSavePassword">Atualizar senha</button></div>
                    </fieldset>
                    <p class="profile-settings-message" id="settingsPasswordMessage" role="status" aria-live="polite"></p>
                </form>
                <div class="profile-settings-actions"><button type="button" class="profile-settings-secondary" id="settingsCancel">Fechar sem salvar</button></div>
            </div>`;
        document.body.appendChild(dialog);

        const userMenu = byId("userMenu");
        if (userMenu) {
            const option = document.createElement("button");
            option.type = "button";
            option.className = "profile-settings-link";
            option.textContent = "Configurações de perfil";
            option.addEventListener("click", abrir);
            userMenu.prepend(option);
            prepararMenu(byId("profileMenuTrigger"), userMenu);
            prepararMenu(byId("userMenuBtn"), userMenu);
            userMenu.addEventListener("click", event => { if (event.target.closest("a")) fecharMenu(); });
        }
        if (byId("topAdminAvatar")) {
            const menu = document.createElement("div");
            menu.id = "adminProfileMenu";
            menu.className = "admin-profile-menu";
            menu.hidden = true;
            const option = document.createElement("button");
            option.type = "button";
            option.textContent = "Configurações de perfil";
            option.addEventListener("click", abrir);
            menu.appendChild(option);
            document.body.appendChild(menu);
            prepararMenu(byId("topAdminAvatar"), menu);
            prepararMenu(byId("sidebarAdminAvatar"), menu);
        }
        document.addEventListener("click", event => {
            if (menuAtivo && !menuAtivo.menu.contains(event.target)) fecharMenu();
        });
        document.addEventListener("keydown", event => {
            if (event.key === "Escape" && menuAtivo) {
                const trigger = menuAtivo.trigger;
                fecharMenu();
                trigger.focus();
            }
        });
        window.addEventListener("resize", fecharMenu);
        byId("settingsClose").addEventListener("click", fechar);
        byId("settingsCancel").addEventListener("click", fechar);
        dialog.addEventListener("cancel", event => { if (ocupado) event.preventDefault(); });
        dialog.addEventListener("close", () => {
            byId("settingsPasswordForm").reset();
            byId("settingsPhotoInput").value = "";
            perfil = null;
            fotoAlterada = undefined;
            ultimoFoco?.focus();
        });
        byId("settingsChoosePhoto").addEventListener("click", () => byId("settingsPhotoInput").click());
        byId("settingsPhotoInput").addEventListener("change", async event => {
            const file = event.target.files[0];
            if (!file || ocupado) return;
            bloquear(true);
            mensagem("settingsProfileMessage", "Preparando foto...");
            try {
                fotoAlterada = await PerfilService.prepararFoto(file);
                avatar(byId("settingsPhotoPreview"), byId("settingsName").value, fotoAlterada);
                mensagem("settingsProfileMessage", "Foto pronta. Clique em Salvar alterações para confirmar.");
            } catch (error) { mensagem("settingsProfileMessage", error.message, true); }
            finally { event.target.value = ""; bloquear(false); }
        });
        byId("settingsRemovePhoto").addEventListener("click", () => {
            fotoAlterada = "";
            avatar(byId("settingsPhotoPreview"), byId("settingsName").value, "");
            mensagem("settingsProfileMessage", "Clique em Salvar alterações para remover a foto.");
        });
        byId("settingsProfileForm").addEventListener("submit", async event => {
            event.preventDefault();
            if (ocupado || !perfil) return;
            const dados = { nome: byId("settingsName").value, telefone: byId("settingsPhone").value, foto: fotoAlterada };
            bloquear(true);
            mensagem("settingsProfileMessage", "Salvando alterações...");
            try {
                perfil = await PerfilService.salvar(dados);
                fotoAlterada = undefined;
                byId("settingsName").value = perfil.nome;
                byId("settingsPhone").value = perfil.telefone || "";
                renderUser(perfil);
                avatar(byId("settingsPhotoPreview"), perfil.nome, perfil.foto_url);
                window.dispatchEvent(new CustomEvent("helpgo:profile-updated", { detail: perfil }));
                mensagem("settingsProfileMessage", "Perfil atualizado.");
            } catch (error) { mensagem("settingsProfileMessage", error.message, true); }
            finally { bloquear(false); }
        });
        byId("settingsPasswordForm").addEventListener("submit", async event => {
            event.preventDefault();
            if (ocupado || !perfil) return;
            bloquear(true);
            mensagem("settingsPasswordMessage", "Atualizando senha...");
            try {
                await PerfilService.alterarSenha(byId("settingsCurrentPassword").value, byId("settingsNewPassword").value, byId("settingsConfirmPassword").value);
                byId("settingsPasswordForm").reset();
                mensagem("settingsPasswordMessage", "Senha atualizada. Use a nova senha no próximo acesso.");
            } catch (error) { mensagem("settingsPasswordMessage", error.message, true); }
            finally { bloquear(false); }
        });
    }

    document.addEventListener("DOMContentLoaded", inicializar);
    return { renderUser };
})();
