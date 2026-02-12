import { useCallback, useState } from 'react'

type Props = {
  accept?: string
  multiple?: boolean
  onFiles: (files: File[]) => void
  label?: string
  hint?: string
  icon?: React.ReactNode
}

export default function FileDropZone({
  accept,
  multiple = false,
  onFiles,
  label = 'Drop files here or click to browse',
  hint,
  icon,
}: Props) {
  const [dragging, setDragging] = useState(false)

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const files = Array.from(e.dataTransfer.files)
      if (files.length) onFiles(multiple ? files : [files[0]])
    },
    [onFiles, multiple]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
  }, [])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files ? Array.from(e.target.files) : []
      if (files.length) onFiles(multiple ? files : [files[0]])
      e.target.value = ''
    },
    [onFiles, multiple]
  )

  return (
    <label
      className={`drop-zone ${dragging ? 'dragover' : ''}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
        style={{ display: 'none' }}
      />
      <div className="drop-zone-icon">{icon}</div>
      <p className="drop-zone-label">{label}</p>
      {hint && <p className="drop-zone-hint">{hint}</p>}
    </label>
  )
}
