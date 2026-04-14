FROM node:20

RUN apt-get update && apt-get install -y ffmpeg

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY server ./server
COPY sample.mp4 ./sample.mp4
COPY voice.mp3 ./voice.mp3

EXPOSE 8080

CMD ["node", "server/index.js"]