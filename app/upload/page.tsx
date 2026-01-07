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
  const [isDragging, setIsDragging] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string } | null>(null);

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

  const setSelectedFile = (selectedFile: File) => {
    if (selectedFile.type !== 'application/pdf' && selectedFile.type !== 'text/plain') {
      setUploadStatus('Only PDF and TXT files are supported');
      return;
    }
    setFile(selectedFile);
    setUploadStatus(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) setSelectedFile(selectedFile);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) setSelectedFile(droppedFile);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
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

  const handleDeleteClick = (id: string, title: string) => {
    setDeleteConfirm({ id, title });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm || deletingId) return;

    const { id } = deleteConfirm;
    setDeletingId(id);
    setDeleteConfirm(null);
    setUploadStatus(null);

    try {
      const res = await fetch('/api/documents', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (res.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== id));
        setUploadStatus('Document deleted.');
      } else {
        setUploadStatus(`Error: ${data.error}`);
      }
    } catch (error) {
      setUploadStatus(`Error: ${error instanceof Error ? error.message : 'Delete failed'}`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm(null);
  };

  return (
    <div className="page-shell">
      <div className="spaced" style={{ marginBottom: '1.5rem' }}>
        <div>
          <p className="eyebrow">Upload</p>
          <h1>Upload Documents</h1>
          <p className="muted" style={{ marginTop: '0.35rem' }}>
            Add PDFs or TXT files. We will chunk, embed, and index them for grounded chat.
          </p>
        </div>
        <Link className="btn btn-ghost" href="/">
          Go to Chat
        </Link>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div
          className={`upload-drop ${isDragging ? 'dragging' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <input
            id="file-input"
            type="file"
            accept=".pdf,.txt"
            onChange={handleFileChange}
            disabled={uploading}
            style={{ display: 'none' }}
          />

          <p className="muted-strong" style={{ marginBottom: '0.5rem' }}>
            Drag & drop your PDF or TXT here
          </p>
          <p className="muted small" style={{ marginBottom: '1rem' }}>
            PDF and TXT only. Max 20MB recommended.
          </p>

          <div className="row small-gap" style={{ justifyContent: 'center', marginBottom: '1rem' }}>
            <label className="btn btn-ghost" htmlFor="file-input">
              Choose file
            </label>
            {file && (
              <span className="pill" title={file.name}>
                {file.name}
              </span>
            )}
          </div>

          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className={`btn btn-primary ${uploading || !file ? 'btn-disabled' : ''}`}
          >
            {uploading ? 'Uploading...' : 'Upload & Index'}
          </button>

          {uploadStatus && (
            <p
              className="muted"
              style={{
                marginTop: '1rem',
                color: uploadStatus.startsWith('Error') ? 'var(--danger)' : 'var(--success)',
              }}
            >
              {uploadStatus}
            </p>
          )}
        </div>
      </div>

      <div className="spaced" style={{ marginBottom: '0.75rem' }}>
        <h2>Uploaded Documents</h2>
        <span className="pill">{documents.length} total</span>
      </div>

      {loading ? (
        <p className="muted">Loading documents...</p>
      ) : documents.length === 0 ? (
        <p className="muted">No documents uploaded yet.</p>
      ) : (
        <div className="grid">
          {documents.map((doc) => (
            <div key={doc.id} className="doc-row">
              <div>
                <h3 style={{ marginBottom: '0.35rem' }}>{doc.title}</h3>
                <p className="muted small">
                  {doc.mimeType} • {doc.chunksCount} chunks • {new Date(doc.createdAt).toLocaleDateString()}
                </p>
              </div>
              <button
                className={`btn btn-ghost ${deletingId === doc.id ? 'btn-disabled' : ''}`}
                style={{ minWidth: '120px' }}
                onClick={() => handleDeleteClick(doc.id, doc.title)}
                disabled={!!deletingId}
              >
                {deletingId === doc.id ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          ))}
        </div>
      )}

      {deleteConfirm && (
        <div className="modal-overlay" onClick={handleDeleteCancel}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Delete Document</h3>
            </div>
            <div className="modal-body">
              <p>
                Are you sure you want to delete <strong>"{deleteConfirm.title}"</strong>? This will permanently remove the document and all its chunks.
              </p>
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={handleDeleteCancel}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleDeleteConfirm}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

