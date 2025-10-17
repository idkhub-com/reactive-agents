# Docker Production Deployment

Deploy IDKHub using Docker with PostgreSQL and PostgREST.

## Quick Start

**With docker-compose (recommended):**
```bash
docker-compose up
```

**Standalone docker run (requires external PostgreSQL/PostgREST):**
```bash
# 1. Build the image
docker build -t idkhub .

# 2. Run the container
docker run --rm \
    --name idkhub \
    -p 3000:3000 \
    -e SUPABASE_URL="https:your-project-id.supabase.com" \
    -e SUPABASE_SECRET_KEY="your-supabase-secret-key" \
    -e OPENAI_API_KEY="your-openai-key" \
    idkhub
```
