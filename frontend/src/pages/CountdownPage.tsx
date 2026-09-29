import { useEffect, useState } from 'react'

type Props = { onDone: () => void }

export function CountdownPage({ onDone }: Props) {
  const [count, setCount] = useState(3)

  useEffect(() => {
    if (count <= 0) {
      onDone()
      return
    }
    const id = setTimeout(() => setCount((c) => c - 1), 1000)
    return () => clearTimeout(id)
  }, [count, onDone])

  return (
    <section style={{ textAlign: 'center' }}>
      <h2>Get ready…</h2>
      <p style={{ fontSize: '4rem', fontWeight: 'bold' }}>{count}</p>
    </section>
  )
}
