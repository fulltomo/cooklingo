import React from 'react';

const ChatGenerator: React.FC = () => {
  const chatbotUrl = import.meta.env.VITE_CHATBOT_URL;
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <iframe
        src={chatbotUrl}
        style={{ width: '100%', height: '100%', minHeight: '700px' }}
        frameBorder="0"
        allow="microphone"
      ></iframe>
    </div>
  );
};

export default ChatGenerator;
