# moshi-dojo

Audio experimentation playground with Moshi by Kyutai.

## Stack

- **Package manager**: uv
- **Python**: 3.13+
- **Audio AI**: Moshi (moshi_mlx for macOS)

## Commands

```bash
# Install dependencies
uv sync

# Run
uv run main.py

# Add a dependency
uv add <package>
```

## Moshi

Moshi is a full-duplex real-time speech-to-speech AI model from Kyutai.
- Uses Mimi codec (80ms latency)
- MLX version for Apple Silicon: `moshi_mlx`
- Supports 4-bit and 8-bit quantization
