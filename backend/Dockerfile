FROM node:20-bookworm-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

RUN apt-get update \
	&& apt-get install -y --no-install-recommends \
		python3 \
		python3-venv \
		python3-pip \
	&& rm -rf /var/lib/apt/lists/* \
	&& python3 -m venv /opt/venv \
	&& /opt/venv/bin/pip install --no-cache-dir -r src/scripts/ml/requirements.txt

ENV PATH="/opt/venv/bin:${PATH}"

EXPOSE 3000

CMD ["sh", "-c", "npm run db:init && npm start"]
