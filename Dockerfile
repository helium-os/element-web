# Builder
FROM --platform=$BUILDPLATFORM node:16-bullseye as builder

# Support custom branches of the react-sdk and js-sdk. This also helps us build
# images of chat-desktop develop.
# ARG USE_CUSTOM_SDKS=true
# ARG REACT_SDK_REPO="https://github.com/helium-os/matrix-react-sdk.git"
# ARG REACT_SDK_BRANCH="users/tianhq/login"
# ARG JS_SDK_REPO="https://github.com/matrix-org/matrix-js-sdk.git"
# ARG JS_SDK_BRANCH="master"
# ARG JS_SDK_TAG="v26.2.0"

WORKDIR /src

COPY . /src
# RUN dos2unix /src/scripts/docker-link-repos.sh && bash /src/scripts/docker-link-repos.sh
# RUN yarn config set registry https://registry.npmmirror.com
RUN yarn --network-timeout=100000 install


RUN bash /src/scripts/docker-package.sh

# Copy the config now so that we don't create another layer in the app image
RUN cp /src/config.sample.json /src/webapp/config.json

# App
FROM nginx:alpine-slim

COPY --from=builder /src/webapp /app

# Override default nginx config
COPY /nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf

RUN rm -rf /usr/share/nginx/html \
  && ln -s /app /usr/share/nginx/html