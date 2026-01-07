import Link from 'next/link';

export default function Home() {
  return (
    <main style={{ padding: '2rem', textAlign: 'center' }}>
      <h1 style={{ marginBottom: '2rem' }}>Chat with Your Documents</h1>
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        <Link
          href="/upload"
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#0070f3',
            color: 'white',
            borderRadius: '0.5rem',
            display: 'inline-block',
          }}
        >
          Upload Documents
        </Link>
        <Link
          href="/chat"
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#0070f3',
            color: 'white',
            borderRadius: '0.5rem',
            display: 'inline-block',
          }}
        >
          Chat
        </Link>
      </div>
    </main>
  );
}

