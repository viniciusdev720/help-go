<?php
// Teste de Verificação Completa da Remoção de Prestadores Falsos e Inserção Dinâmica Real
$baseUrl = 'http://127.0.0.1:8000';

function req($url, $method = 'GET', $data = null, &$cookieJar = null) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    if ($cookieJar !== null) {
        curl_setopt($ch, CURLOPT_COOKIEJAR, $cookieJar);
        curl_setopt($ch, CURLOPT_COOKIEFILE, $cookieJar);
    }
    if ($data !== null) {
        $json = json_encode($data);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $json);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Content-Length: ' . strlen($json)
        ]);
    }
    $res = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ['status' => $code, 'data' => json_decode($res, true), 'raw' => $res];
}

echo "1. Verificando se a lista de prestadores inicia vazia (SEM prestadores falsos)...\n";
$resList = req("$baseUrl/api/prestadores.php?action=listar");
echo "Total de prestadores retornados: " . ($resList['data']['total'] ?? 'erro') . "\n";
if (($resList['data']['total'] ?? -1) === 0) {
    echo " -> OK: Zero prestadores falsos!\n\n";
} else {
    echo " -> FALHA: Prestadores ainda presentes!\n\n";
}

echo "2. Cadastrando um prestador real pelo formulário (ex: Lucas Silva - Eletricista)...\n";
$cookieJarPro = tempnam(sys_get_temp_dir(), 'pro_');
$cadPro = req("$baseUrl/api/auth.php?action=cadastro-prestador", 'POST', [
    'nome' => 'Lucas Silva Eletricista',
    'email' => 'lucas.eletrica' . time() . '@gmail.com',
    'senha' => 'senha123',
    'telefone' => '(11) 98888-2222',
    'cpf' => '123.456.789-00',
    'categoria' => 'Eletricista',
    'descricao' => 'Eletricista credenciado, atendimento rápido para residências.',
    'cep' => '01001-000',
    'rua' => 'Praça da Sé',
    'numero' => '100',
    'bairro' => 'Sé',
    'cidade' => 'São Paulo',
    'estado' => 'SP'
], $cookieJarPro);



echo "3. Verificando se agora a lista de prestadores exibe EXATAMENTE e APENAS o prestador recém-cadastrado...\n";
$resList2 = req("$baseUrl/api/prestadores.php?action=listar");
echo "Total agora: " . ($resList2['data']['total'] ?? 'erro') . "\n";
if (($resList2['data']['total'] ?? 0) === 1) {
    $pro = $resList2['data']['data'][0];
    echo "Nome do prestador exibido: " . $pro['nome'] . "\n";
    echo "Categoria: " . $pro['categoria'] . "\n";
    echo " -> OK: O prestador real apareceu dinamicamente para os clientes!\n";
} else {
    echo " -> FALHA na listagem dinâmica!\n";
}
