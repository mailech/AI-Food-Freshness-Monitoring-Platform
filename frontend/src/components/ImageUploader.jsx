import { useState, useRef } from 'react'

export default function ImageUploader({ onFileSelect, preview }) {
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef()

  const handleDrop = e => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) onFileSelect(file)
  }

  const handleChange = e => {
    const file = e.target.files[0]
    if (file) onFileSelect(file)
  }

  return (
    <div>
      {preview ? (
        <div className="upload-preview">
          <img src={preview} alt="Food preview" />
          <button className="btn btn-secondary btn-sm" style={{position:'absolute',top:10,right:10}} onClick={() => { onFileSelect(null); fileRef.current.value = '' }}>✕ Remove</button>
        </div>
      ) : (
        <div className={`upload-zone${dragging ? ' dragging' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current.click()}>
          <div className="upload-icon">📸</div>
          <p>Drag & drop a food image here</p>
          <p>or <span className="browse-link">browse files</span></p>
          <p style={{fontSize:'0.78rem',marginTop:8,color:'var(--text-muted)'}}>Supports JPG, PNG, WebP</p>
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*" onChange={handleChange} style={{display:'none'}} />
    </div>
  )
}
