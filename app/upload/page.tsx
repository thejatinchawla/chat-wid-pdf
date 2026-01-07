'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Document {
  id: string;
  title: string;
  mimeType: string;
  createdAt: string;
  chunksCount: number;
}

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocuments();
  }, []);

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
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf' && selectedFile.type !== 'text/plain') {
        setUploadStatus('Only PDF and TXT files are supported');
        return;
      }
      setFile(selectedFile);
      setUploadStatus(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setUploadStatus('Please select a file');
      return;
    }

    setUploading(true);
    setUploadStatus('Uploading and indexing...');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setUploadStatus(`Success! Indexed ${data.chunksCount} chunks.`);
        setFile(null);
        // Reset file input
        const fileInput = document.getElementById('file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        fetchDocuments();
      } else {
        setUploadStatus(`Error: ${data.error}`);
      }
    } catch (error) {
      setUploadStatus(`Error: ${error instanceof Error ? error.message : 'Upload failed'}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Upload Documents</h1>
        <Link
          href="/chat"
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#0070f3',
            color: 'white',
            borderRadius: '0.5rem',
          }}
        >
          Go to Chat
        </Link>
      </div>

      <div
        style={{
          border: '2px dashed #ccc',
          borderRadius: '0.5rem',
          padding: '2rem',
          marginBottom: '2rem',
          textAlign: 'center',
        }}
      >
        <input
          id="file-input"
          type="file"
          accept=".pdf,.txt"
          onChange={handleFileChange}
          disabled={uploading}
          style={{ marginBottom: '1rem' }}
        />
        {file && (
          <div style={{ marginBottom: '1rem' }}>
            <p>Selected: {file.name}</p>
            <p style={{ fontSize: '0.9rem', color: '#666' }}>
              Size: {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        )}
        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: uploading ? '#ccc' : '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: uploading ? 'not-allowed' : 'pointer',
          }}
        >
          {uploading ? 'Uploading...' : 'Upload & Index'}
        </button>
        {uploadStatus && (
          <p
            style={{
              marginTop: '1rem',
              color: uploadStatus.startsWith('Error') ? '#d32f2f' : '#2e7d32',
            }}
          >
            {uploadStatus}
          </p>
        )}
      </div>

      <div>
        <h2 style={{ marginBottom: '1rem' }}>Uploaded Documents</h2>
        {loading ? (
          <p>Loading...</p>
        ) : documents.length === 0 ? (
          <p style={{ color: '#666' }}>No documents uploaded yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {documents.map((doc) => (
              <div
                key={doc.id}
                style={{
                  border: '1px solid #ddd',
                  borderRadius: '0.5rem',
                  padding: '1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <h3 style={{ marginBottom: '0.5rem' }}>{doc.title}</h3>
                  <p style={{ fontSize: '0.9rem', color: '#666' }}>
                    {doc.mimeType} • {doc.chunksCount} chunks •{' '}
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

