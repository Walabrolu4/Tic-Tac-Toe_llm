# TICK TAC TOE (Played with an LLM)

The project has 2 parts a simple game made in phaser.

The other half is python code I run in a collab notebook with the game uploaded there. It uses
1. Python
2. Flask (To use the REST API to communicate with the phaser app)
3. Ngrok (Creates a tunnel to the app so it can be used online)
4. Gemini API (Has a free tier)

*Note:* You need keys for ngrok and gemini. I put them in my collab secrets and used the userdata.get function to trigger it. 