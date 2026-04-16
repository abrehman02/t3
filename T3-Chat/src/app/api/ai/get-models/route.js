import { NextResponse } from 'next/server';

export async function GET(req) {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: "OPENROUTER_API_KEY is not configured",
        },
        { status: 500 }
      );
    }

    const response = await fetch('https://openrouter.ai/api/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    const models = Array.isArray(data?.data) ? data.data : [];
    
    const freeModels = models.filter(model => {
      const promptPrice = parseFloat(model.pricing?.prompt || '0');
      const completionPrice = parseFloat(model.pricing?.completion || '0');
      return promptPrice === 0 && completionPrice === 0;
    });

    // Return formatted response with useful model information
    const formattedModels = freeModels.map(model => ({
      id: model.id,
      name: model.name,
      description: model.description,
      context_length: model.context_length,
      architecture: model.architecture,
      pricing: model.pricing,
      top_provider: model.top_provider,
    }));

    return NextResponse.json({
      models: formattedModels,
    });

  } catch (error) {
    console.error('Error fetching free models:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch free models',
      },
      { status: 500 }
    );
  }
}
