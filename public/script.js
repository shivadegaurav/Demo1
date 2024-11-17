document.addEventListener('DOMContentLoaded', () => {
    const chatLog = document.getElementById('chat-log');
    const chatForm = document.getElementById('chat-form');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const clearChatBtn = document.getElementById('clear-chat');
    const saveChatBtn = document.getElementById('save-chat');
    const toggleThemeBtn = document.getElementById('toggle-theme');
    const buttonText = sendButton.querySelector('.button-text');
    const loadingSpinner = sendButton.querySelector('.loading-spinner');
    
    const converter = new showdown.Converter();
    const sessionId = Date.now().toString(36) + Math.random().toString(36).substr(2);

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const message = userInput.value.trim();
        if (!message) return;

        addMessageToChatLog('You', message, 'user-message');
        userInput.value = '';

        buttonText.style.opacity = '0';
        loadingSpinner.style.display = 'block';
        sendButton.disabled = true;

        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message, sessionId }),
            });

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            let botMessage = '';
            const messageElement = document.createElement('div');
            messageElement.className = 'message bot-message';
            messageElement.innerHTML = '<strong>Bot:</strong> ';
            chatLog.appendChild(messageElement);

            const replyContainer = document.createElement('span');
            messageElement.appendChild(replyContainer);

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const content = line.slice(6).trim();
                        
                        if (content === '[DONE]') break;
                        
                        try {
                            const data = JSON.parse(content);
                            botMessage += data.text;
                            replyContainer.innerHTML = converter.makeHtml(botMessage);
                            chatLog.scrollTop = chatLog.scrollHeight;
                        } catch (parseError) {
                            console.warn('Failed to parse chunk:', content);
                            continue;
                        }
                    }
                }
            }

            messageElement.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightBlock(block);
            });

        } catch (error) {
            console.error('Error:', error);
            addMessageToChatLog('Bot', 'Sorry, an error occurred.', 'bot-message');
        } finally {
            buttonText.style.opacity = '1';
            loadingSpinner.style.display = 'none';
            sendButton.disabled = false;
        }
    });

    function addMessageToChatLog(sender, message, className) {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${className}`;
        
        let formattedMessage = converter.makeHtml(message);
        formattedMessage = formattedMessage.replace(/<pre><code>/g, '<pre><code class="hljs">');
        
        messageElement.innerHTML = `<strong>${sender}:</strong> ${formattedMessage}`;
        chatLog.appendChild(messageElement);
        chatLog.scrollTop = chatLog.scrollHeight;

        messageElement.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightBlock(block);
        });
    }

    clearChatBtn.addEventListener('click', async () => {
        chatLog.innerHTML = '';
        try {
            await fetch('/clear-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId }),
            });
        } catch (error) {
            console.error('Error clearing chat history:', error);
        }
    });

    saveChatBtn.addEventListener('click', () => {
        const chatContent = chatLog.innerHTML;
        const blob = new Blob([chatContent], { type: 'text/html' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'chat_log.html';
        a.click();
    });

    toggleThemeBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');
    });
});