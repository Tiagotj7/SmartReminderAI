# Telegram automático e EmailJS

## O que foi implementado

O perfil agora tem o botão **Conectar Telegram**. O usuário não precisa copiar `chat_id` nem cadastrar telefone no Telegram:

1. clica em **Conectar Telegram**;
2. o site abre o bot com um token temporário;
3. toca em **Iniciar** no Telegram;
4. o webhook salva o `chat.id` na conta correta;
5. os lembretes com canal `telegram` são enviados pela Bot API oficial.

O e-mail continua sendo enviado pelo EmailJS para `users.email`.
