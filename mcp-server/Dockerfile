FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy requirements first (for better caching)
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY src/ ./src/
COPY templates/ ./templates/
COPY metadata/ ./metadata/

# Set Python path
ENV PYTHONPATH=/app
ENV MCP_TEMPLATES_DIR=/app/templates
ENV MCP_METADATA_DIR=/app/metadata

# Expose port for HTTP/SSE
EXPOSE 3001

# Run MCP server
CMD ["python", "src/server.py"]
