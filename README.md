# 🎙️ Newscast AI — Voice Studio (Private & Secured)

A private broadcast-grade AI Voice Studio powered by Google Gemini TTS with Journey-D narrative storytelling voice, DSP audio calibration, quota analytics, and full-stack cryptographic password security.

---

## 🔒 Security & Privacy Features

- **Encrypted / Hidden Gemini API Key**: The Google Gemini API key is managed strictly on the serverless backend (`process.env.GEMINI_API_KEY`) and is never exposed in client bundles or public repositories.
- **Encrypted Master Password Gate**: All studio access and generation endpoints are protected by PBKDF2 cryptographic password verification.
- **Backend Auth Guard**: All TTS synthesis, story polish, and analytics API endpoints reject unauthenticated requests with `401 Unauthorized` to prevent unauthorized usage or quota drain.
- **Session Persistence**: Includes an optional "Remember on this browser" session token so you don't have to re-type the password every reload.

---

## 🚀 Deploy to Vercel (Step-by-Step)

### Option 1: Deploy via Vercel Web Dashboard (Recommended)

1. Push this repository to your GitHub account.
2. Go to [vercel.com](https://vercel.com) and click **"Add New Project"** -> **"Import"**.
3. Select this repository.
4. In the **Environment Variables** section, add the following 2 variables:
   - `GEMINI_API_KEY`: Your Gemini API key from Google AI Studio
   - `APP_PASSWORD_HASH`: `cd9cad94b2c7c6fc58125b40024f1b4dc19d3252f3d596a47bfa02acc693b8e1`
5. Click **"Deploy"**.
6. Once deployed, open your live Vercel URL, enter your master password at the lock screen, and start generating!

---

## 💻 Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   Create a `.env` file:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   APP_PASSWORD_HASH=cd9cad94b2c7c6fc58125b40024f1b4dc19d3252f3d596a47bfa02acc693b8e1
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) and unlock with your master password.

---

## 🛠️ Project Structure

- `api/index.ts` — Vercel Serverless Express backend with PBKDF2 encrypted password auth, usage analytics & Gemini TTS proxy
- `vercel.json` — Vercel routing & serverless build configuration
- `src/components/PasswordGate.tsx` — Minimalist ElevenLabs-style studio lock screen
- `src/components/ApiUsageAnalytics.tsx` — Real-time quota & 7-day bar chart diagram
- `src/components/` — Audio player, simple controls, voice presets, and history
- `src/App.tsx` — Main application logic with auth headers and state management
