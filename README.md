docker buildx build --platform linux/amd64 -f dockerfile -t owlix/tms:prod_linux --push .
docker buildx build --build-arg ENV_FILE=.env.prod -f dockerfile -t owlix/tms:prod_macos --push .
docker buildx build --build-arg ENV_FILE=.env.dev  -f dockerfile -t owlix/tms:dev --push .

docker buildx build --platform linux/amd64 --build-arg ENV_FILE=.env.dev  -f dockerfile -t owlix/tms:prod --push .