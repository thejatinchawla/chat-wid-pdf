'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

interface Document {
  id: string;
  title: string;
  mimeType: string;
  createdAt: string;
  chunksCount: number;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  citations?: Array<{
    documentTitle: string;
    chunkIndex: number;
    page: number | null;
    snippet: string;
  }>;
}

export default function Home() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchDocuments = async () => {
    try {
      const res = await fetch('/api/documents');
      const data = await res.json();
      if (res.ok) {
        setDocuments(data.documents);
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setDocumentsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: input,
          documentIds: selectedDocIds.length > 0 ? selectedDocIds : null,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.answer,
          citations: data.citations,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        const errorMessage: Message = {
          role: 'assistant',
          content: `Error: ${data.error}`,
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      const errorMessage: Message = {
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to send message'}`,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const toggleDocument = (docId: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  const selectAll = () => {
    if (selectedDocIds.length === documents.length) {
      setSelectedDocIds([]);
    } else {
      setSelectedDocIds(documents.map((d) => d.id));
    }
  };

  return (
    <div className="chat-layout">
      <aside className="sidebar">
        <div className="sidebar-header spaced">
          <div>
            <p className="eyebrow">Documents</p>
            <h2>Library</h2>
          </div>
          <Link className="btn btn-primary" href="/upload">
            Upload
          </Link>
        </div>

        <div className="sidebar-content scroll-hide">
         {documents.length > 0 && (
          <button
            onClick={selectAll}
            className={`btn ${selectedDocIds.length === documents.length ? 'btn-primary' : ''}`}
            style={{ width: '100%', marginBottom: '0.75rem' }}
          >
            {selectedDocIds.length === documents.length ? 'Deselect All' : 'Select All'}
          </button>
         )}

          {documentsLoading ? (
            <p className="muted">Loading documents...</p>
          ) : documents.length === 0 ? (
            <p className="muted">No documents yet. Upload a file to start.</p>
          ) : (
            <div className="stack">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className={`doc-card ${selectedDocIds.includes(doc.id) ? 'selected' : ''}`}
                  onClick={() => toggleDocument(doc.id)}
                >
                  <div className="spaced">
                    <div className="row small-gap" style={{ alignItems: 'flex-start' }}>
                      <input
                        type="checkbox"
                        checked={selectedDocIds.includes(doc.id)}
                        onChange={() => toggleDocument(doc.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div>
                        <p className="muted-strong">{doc.title}</p>
                        <p className="doc-meta">{doc.chunksCount} chunks</p>
                      </div>
                    </div>
                    <span className="pill">{new Date(doc.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedDocIds.length > 0 && (
          <div className="status-bar">
            <p className="muted">
              {selectedDocIds.length} document{selectedDocIds.length !== 1 ? 's' : ''} selected
            </p>
          </div>
        )}
      </aside>

      <section className="chat-main">
        <div className="chat-header">
          <h1>Chat with Documents</h1>
          <p className="muted" style={{ marginTop: '0.35rem' }}>
            Ask grounded questions. Answers include snippets from your uploads.
          </p>
          {selectedDocIds.length > 0 && (
            <p className="badge" style={{ marginTop: '0.65rem' }}>
              Chatting with {selectedDocIds.length} selected document
              {selectedDocIds.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        <div className="chat-messages scroll-hide">
          {messages.length === 0 ? (
            <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
              <p className="muted">Start a conversation by asking a question about your documents.</p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  marginBottom: '1.25rem',
                }}
              >
                <div className={`message ${msg.role === 'user' ? 'user' : 'assistant'}`}>
                  <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{msg.content}</p>
                </div>

                {msg.citations && msg.citations.length > 0 && (
                  <div style={{ marginTop: '0.6rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {msg.citations.map((citation, cIdx) => (
                      <span className="citation" key={cIdx} title={citation.snippet}>
                        {citation.documentTitle} (Chunk {citation.chunkIndex}
                        {citation.page ? `, Page ${citation.page}` : ''})
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}

          {loading && (
            <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div className="message assistant">
                <p style={{ margin: 0 }}>Thinking...</p>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-form">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            style={{ display: 'flex', gap: '0.65rem', flex: 1 }}
          >
            <input
              className="chat-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about your documents..."
              disabled={loading}
            />
            <button
              type="submit"
              className={`btn btn-primary ${loading || !input.trim() ? 'btn-disabled' : ''}`}
              disabled={loading || !input.trim()}
            >
              Send
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

