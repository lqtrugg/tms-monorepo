# TMS monorepo

## Build Docker image local

Build với cấu hình development:

```bash
docker build --build-arg ENV_FILE=.env.development -f dockerfile -t tms:local .
```

Build với cấu hình production:

```bash
docker build --build-arg ENV_FILE=env.prod -f dockerfile -t tms:prod .
```

## Chạy local

Chạy image đã build bằng `docker run`:

```bash
docker run --rm --env-file .env.development -p 4000:4000 --name tms-local tms:local
```

Hoặc chạy bằng Docker Compose:

```bash
ENV_FILE=.env.development NODE_ENV=development docker compose up --build
```

Ứng dụng sẽ chạy tại `http://localhost:4000`.

## Build và push image

```bash
docker buildx build --platform linux/amd64 --build-arg ENV_FILE=env.prod -f dockerfile -t owlix/tms:prod_linux --push .
docker buildx build --build-arg ENV_FILE=env.prod -f dockerfile -t owlix/tms:prod_macos --push .
docker buildx build --build-arg ENV_FILE=.env.development -f dockerfile -t owlix/tms:dev --push .
```
