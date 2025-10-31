import React from 'react';

const ChatGenerator: React.FC = () => {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <iframe
        src="https://chiba-u-ai25-g4.xvps.jp/chatbot/1Ft7aa6uABv76n8J"
        style={{ width: '100%', height: '100%', minHeight: '700px' }}
        frameBorder="0"
        allow="microphone"
      ></iframe>
    </div>
  );
};

export default ChatGenerator;
