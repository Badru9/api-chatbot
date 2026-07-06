const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';

export async function embedText(text: string): Promise<number[]> {
  try {
    const response = await fetch(`${PYTHON_SERVICE_URL}/embed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Python service error: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as { embedding: number[] };
    return data.embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error('Gagal membuat embedding dokumen.');
  }
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  try {
    if (texts.length === 0) return [];
    
    const response = await fetch(`${PYTHON_SERVICE_URL}/embed/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ texts }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Python service error: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as { embeddings: number[][] };
    return data.embeddings;
  } catch (error) {
    console.error('Error generating batch embeddings:', error);
    throw new Error('Gagal membuat embedding dokumen dalam batch.');
  }
}

