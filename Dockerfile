# Stage fetch: downloads and checks Pandoc and Typst. Only the verified files leave this stage.
FROM node:26-slim AS fetch
ARG TARGETARCH
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl xz-utils \
 && rm -rf /var/lib/apt/lists/*
RUN set -eux; \
    case "$TARGETARCH" in \
      amd64) \
        PANDOC_SHA256=7e3736f255090296ca5d1a14291a76b9b3c43cd385011b1621a4d0c16091a70f; \
        TYPST_TRIPLE=x86_64-unknown-linux-musl; \
        TYPST_SHA256=a6d077d0a95eed5a2eba715b2dae06be954f624ccbf85758a03f389ded33118c ;; \
      arm64) \
        PANDOC_SHA256=e55b480eb76997812b44c3f65f641c84214e623bc40b70a6b6d16ee00bfcca23; \
        TYPST_TRIPLE=aarch64-unknown-linux-musl; \
        TYPST_SHA256=5aa8d74a3d906e60ea12a66ac2f37f8eef1b14cbad7182a745e393a10c23dcee ;; \
      *) echo "unsupported TARGETARCH: $TARGETARCH" >&2; exit 1 ;; \
    esac; \
    curl -fsSL -o /tmp/pandoc.deb "https://github.com/jgm/pandoc/releases/download/3.13/pandoc-3.13-1-$TARGETARCH.deb"; \
    echo "$PANDOC_SHA256  /tmp/pandoc.deb" | sha256sum -c -; \
    curl -fsSL -o /tmp/typst.tar.xz "https://github.com/typst/typst/releases/download/v0.15.1/typst-$TYPST_TRIPLE.tar.xz"; \
    echo "$TYPST_SHA256  /tmp/typst.tar.xz" | sha256sum -c -; \
    tar -xJf /tmp/typst.tar.xz -C /tmp; \
    mkdir -p /out; \
    install -m 0755 "/tmp/typst-$TYPST_TRIPLE/typst" /out/typst

# Stage build: full Node LTS image. Its layers are discarded; only /out/app is copied on.
FROM node:26 AS build
WORKDIR /src
COPY . .
RUN npm ci
ARG VERSION=0.0.0-dev
ARG REVISION=dev
ARG BUILT_AT=dev
RUN printf 'export const BUILD_INFO = {\n  version: "%s",\n  revision: "%s",\n  builtAt: "%s",\n} as const;\n' "$VERSION" "$REVISION" "$BUILT_AT" > apps/api/src/modules/platform/build-info.ts
RUN npm run build -w @bbartolome/scriba-contracts
RUN npm run build -w @bbartolome/scriba-api
RUN npm run build -w @bbartolome/scriba-web
RUN npm ci --omit=dev -w @bbartolome/scriba-api -w @bbartolome/scriba-contracts
RUN set -eux; \
    mkdir -p /out/app/apps/api /out/app/apps/web/dist/scriba-web /out/app/packages/contracts; \
    cp -a node_modules /out/app/; \
    cp -a apps/api/package.json apps/api/dist /out/app/apps/api/; \
    if [ -d apps/api/node_modules ]; then cp -a apps/api/node_modules /out/app/apps/api/; fi; \
    cp -a apps/web/dist/scriba-web/browser /out/app/apps/web/dist/scriba-web/; \
    cp -a packages/contracts/package.json packages/contracts/dist /out/app/packages/contracts/; \
    if [ -d packages/contracts/node_modules ]; then cp -a packages/contracts/node_modules /out/app/packages/contracts/; fi

# Stage runtime: the image that ships. Root-owned content, run as UID 1000.
FROM node:26-slim AS runtime
WORKDIR /opt/scriba/app
RUN --mount=type=bind,from=fetch,source=/tmp/pandoc.deb,target=/tmp/pandoc.deb \
    apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates /tmp/pandoc.deb \
 && rm -rf /var/lib/apt/lists/*
COPY --from=fetch /out/typst /usr/local/bin/typst
COPY --from=build /out/app /opt/scriba/app
COPY --from=build /src/packages/packs /opt/scriba/packs
COPY --from=build /src/examples /opt/scriba/examples
COPY --from=build /src/deploy /opt/installer
COPY scripts/entrypoint.sh /usr/local/bin/scriba-entrypoint
RUN chmod 0755 /usr/local/bin/scriba-entrypoint
USER 1000:1000
ENTRYPOINT ["/usr/local/bin/scriba-entrypoint"]
