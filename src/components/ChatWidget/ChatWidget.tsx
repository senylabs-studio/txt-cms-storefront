import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FaComments, FaTimes, FaPaperPlane } from 'react-icons/fa';
import { sendChatMessage, type ChatMessage } from '../../services/chatService';
import './ChatWidget.css';

const ChatWidget: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const reply = await sendChatMessage(nextMessages, i18n.language);
      setMessages(m => [...m, { role: 'assistant', content: reply }]);
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: t('chat.error') }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-widget">
      {open && (
        <div className="chat-widget-panel">
          <div className="chat-widget-header">
            <span>{t('chat.title')}</span>
            <button type="button" className="chat-widget-close" onClick={() => setOpen(false)} aria-label={t('chat.close')}>
              <FaTimes />
            </button>
          </div>
          <div className="chat-widget-body" ref={bodyRef}>
            {messages.length === 0 && (
              <div className="chat-widget-message chat-widget-message--assistant">{t('chat.greeting')}</div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`chat-widget-message chat-widget-message--${m.role}`}>
                {m.content}
              </div>
            ))}
            {loading && (
              <div className="chat-widget-message chat-widget-message--assistant chat-widget-typing">
                <span /><span /><span />
              </div>
            )}
          </div>
          <form className="chat-widget-input" onSubmit={handleSend}>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={t('chat.placeholder')}
              disabled={loading}
              maxLength={2000}
            />
            <button type="submit" disabled={loading || !input.trim()} aria-label={t('chat.send')}>
              <FaPaperPlane />
            </button>
          </form>
        </div>
      )}
      <button
        type="button"
        className="chat-widget-toggle"
        onClick={() => setOpen(o => !o)}
        aria-label={open ? t('chat.close') : t('chat.open')}
      >
        {open ? <FaTimes /> : <FaComments />}
      </button>
    </div>
  );
};

export default ChatWidget;
