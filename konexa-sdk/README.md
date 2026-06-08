# Konexa Python SDK

The official Python library for the Konexa AI API.

## Installation

```bash
pip install konexa
```

## Quick Start

```python
from konexa import Konexa

# Initialize the client
client = Konexa(api_key="your_konexa_api_key")

# Create a chat completion
response = client.chat_completion(
    messages=[
        {"role": "user", "content": "Hello Konexa!"}
    ]
)

print(response['choices'][0]['message']['content'])
```

## Features

- **OpenAI Compatible**: Follows familiar patterns for easy migration.
- **Lightweight**: Zero heavy dependencies.
- **Localized**: Optimized for the Konexa infrastructure in Kenya.

## License

MIT
