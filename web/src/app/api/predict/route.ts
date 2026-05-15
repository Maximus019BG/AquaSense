import type { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  const payload = await req.json()

  // Forward to local inference service. In production, set INFERENCE_URL env var.
  const inferenceBase = (process.env.INFERENCE_URL || 'http://localhost:8000').replace(/\/(predict|forecast)$/, '')
  const inferenceUrl = `${inferenceBase}/predict`

  const resp = await fetch(inferenceUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const data = await resp.json()
  return new Response(JSON.stringify(data), {
    status: resp.status,
    headers: { 'Content-Type': 'application/json' },
  })
}
