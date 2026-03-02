export default function Loading() {
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F7F5FF',
      }}
    >
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎯</div>
      <p style={{ color: '#9ca3af', fontSize: '14px' }}>読み込み中...</p>
    </div>
  )
}
