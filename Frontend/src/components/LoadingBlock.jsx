import './LoadingBlock.css'

function LoadingBlock({ message = 'Loading data from backend...' }) {
  return (
    <section className="loading-block">
      <article className="loading-card">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p>{message}</p>
        </div>
      </article>
    </section>
  )
}

export default LoadingBlock
