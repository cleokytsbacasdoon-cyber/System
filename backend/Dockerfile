FROM node:20-bookworm-slim

WORKDIR /app

# --- Node.js dependencies (cached layer) ---
COPY package*.json ./
RUN npm install --omit=dev

# --- Python setup (cached until requirements.txt changes) ---
RUN apt-get update \
	&& apt-get install -y --no-install-recommends \
		python3 \
		python3-venv \
		python3-pip \
		libgomp1 \
	&& rm -rf /var/lib/apt/lists/* \
	&& python3 -m venv /opt/venv

COPY src/scripts/ml/requirements.txt ./requirements_ml.txt
RUN /opt/venv/bin/pip install --no-cache-dir --timeout 300 -r ./requirements_ml.txt

ENV PATH="/opt/venv/bin:${PATH}"

# --- Application source (changes here do not invalidate pip cache above) ---
COPY . .

EXPOSE 3000

CMD ["sh", "-c", "npm run db:init && npm start"]
