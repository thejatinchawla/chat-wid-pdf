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

export default function ChatPage() {
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
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <div
        style={{
          width: '300px',
          borderRight: '1px solid #ddd',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#f5f5f5',
        }}
      >
        <div style={{ padding: '1rem', borderBottom: '1px solid #ddd' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2>Documents</h2>
            <Link
              href="/upload"
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#0070f3',
                color: 'white',
                borderRadius: '0.5rem',
                fontSize: '0.9rem',
              }}
            >
              Upload
            </Link>
          </div>
          <button
            onClick={selectAll}
            style={{
              padding: '0.5rem',
              backgroundColor: selectedDocIds.length === documents.length ? '#0070f3' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '0.25rem',
              width: '100%',
              fontSize: '0.9rem',
            }}
          >
            {selectedDocIds.length === documents.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
          {documentsLoading ? (
            <p style={{ padding: '1rem', color: '#666' }}>Loading...</p>
          ) : documents.length === 0 ? (
            <p style={{ padding: '1rem', color: '#666' }}>No documents. Upload some first.</p>
          ) : (
            documents.map((doc) => (
              <div
                key={doc.id}
                onClick={() => toggleDocument(doc.id)}
                style={{
                  padding: '0.75rem',
                  marginBottom: '0.5rem',
                  borderRadius: '0.25rem',
                  backgroundColor: selectedDocIds.includes(doc.id) ? '#e3f2fd' : 'white',
                  border: `1px solid ${selectedDocIds.includes(doc.id) ? '#0070f3' : '#ddd'}`,
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={selectedDocIds.includes(doc.id)}
                    onChange={() => toggleDocument(doc.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: '500', marginBottom: '0.25rem' }}>{doc.title}</p>
                    <p style={{ fontSize: '0.8rem', color: '#666' }}>
                      {doc.chunksCount} chunks
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        {selectedDocIds.length > 0 && (
          <div style={{ padding: '1rem', borderTop: '1px solid #ddd', backgroundColor: '#e3f2fd' }}>
            <p style={{ fontSize: '0.9rem' }}>
              {selectedDocIds.length} document{selectedDocIds.length !== 1 ? 's' : ''} selected
            </p>
          </div>
        )}
      </div>

      {/* Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid #ddd' }}>
          <h1>Chat with Documents</h1>
          {selectedDocIds.length > 0 && (
            <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.5rem' }}>
              Chatting with {selectedDocIds.length} selected document{selectedDocIds.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
          {messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#666', marginTop: '2rem' }}>
              <p>Start a conversation by asking a question about your documents.</p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  marginBottom: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    maxWidth: '70%',
                    padding: '1rem',
                    borderRadius: '0.5rem',
                    backgroundColor: msg.role === 'user' ? '#0070f3' : '#f0f0f0',
                    color: msg.role === 'user' ? 'white' : 'black',
                  }}
                >
                  <p style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                </div>
                {msg.citations && msg.citations.length > 0 && (
                  <div style={{ marginTop: '0.5rem', maxWidth: '70%' }}>
                    <p style={{ fontSize: '0.8rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                      Citations:
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {msg.citations.map((citation, cIdx) => (
                        <div
                          key={cIdx}
                          style={{
                            padding: '0.5rem',
                            backgroundColor: '#e3f2fd',
                            borderRadius: '0.25rem',
                            fontSize: '0.8rem',
                            border: '1px solid #90caf9',
                          }}
                          title={citation.snippet}
                        >
                          {citation.documentTitle} (Chunk {citation.chunkIndex}
                          {citation.page ? `, Page ${citation.page}` : ''})
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
          {loading && (
            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
              <div
                style={{
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  backgroundColor: '#f0f0f0',
                }}
              >
                <p>Thinking...</p>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div style={{ padding: '1rem', borderTop: '1px solid #ddd' }}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            style={{ display: 'flex', gap: '0.5rem' }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about your documents..."
              style={{
                flex: 1,
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '0.5rem',
                fontSize: '1rem',
              }}
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: loading || !input.trim() ? '#ccc' : '#0070f3',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

