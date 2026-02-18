export function CareMorePlaceholder() {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#000', overflow: 'hidden' }}>
      <iframe
        src="https://www.caremore.tv/"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          border: 'none',
          background: '#000'
        }}
        allowFullScreen
        title="CM Game"
      />
    </div>
  );
}
