# Leaf Labs - AI Plant Disease Detection App

A modern, mobile-first plant disease detection application built with Next.js, Supabase, and AI-powered inference.

## Features

- 🔐 **Authentication**: Email/password and Google OAuth
- 📱 **Mobile-first Design**: Responsive with bottom navigation
- 🤖 **AI-powered Detection**: ONNX runtime with Gemini fallback
- 📊 **Analytics Dashboard**: Plant health tracking and statistics
- 📚 **Disease Library**: Comprehensive plant disease database
- 💬 **AI Assistant**: Chatbot for plant care guidance
- 🌙 **Dark/Light Theme**: Customizable appearance
- 📱 **PWA Ready**: Installable web app experience

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (Auth, Database, Storage, Edge Functions)
- **AI/ML**: ONNX Runtime Web, Google Gemini API
- **Charts**: Recharts
- **State Management**: Zustand
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account
- Google Gemini API key (for AI features)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd leaf-labs
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Fill in your Supabase and Google Gemini API credentials.

4. Set up Supabase:
   - Create a new Supabase project
   - Run the migration file in the Supabase SQL editor
   - Enable Google OAuth in Authentication settings
   - Add your `GEMINI_API_KEY` as a secret in Project Settings > Edge Functions

5. Add your ONNX model:
   - Place your trained plant disease model as `public/models/plant-disease-model.onnx`
   - See `public/models/README.md` for model requirements

6. Start the development server:
```bash
npm run dev
```

## Project Structure

```
├── app/                    # Next.js app router pages
├── components/ui/          # Reusable UI components
├── lib/
│   ├── ai/                # ONNX inference engine
│   ├── providers/         # React context providers
│   ├── stores/            # Zustand state stores
│   └── supabase/          # Supabase client and types
├── supabase/
│   ├── functions/         # Edge functions
│   └── migrations/        # Database migrations
└── public/models/         # ONNX model files
```

## Key Features

### Authentication
- Email/password signup and login
- Google OAuth integration
- Protected routes with middleware

### Plant Disease Detection
- Camera capture and file upload
- Client-side ONNX inference
- Gemini API fallback for failed inferences
- Confidence scoring and top-3 predictions

### Dashboard
- Plant health statistics
- Interactive charts showing health trends
- Quick action buttons
- Recent scan history

### Disease Library
- Comprehensive disease database
- Categorized by type (fungal, bacterial, viral)
- Detailed descriptions and treatment advice
- Scan history with full details

### AI Assistant
- Gemini-powered chatbot
- Context-aware responses
- Plant care guidance
- Treatment recommendations
- Conversational AI with memory

## Deployment

The app is configured for deployment on Vercel:

1. Connect your repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy Supabase Edge Functions using the Supabase CLI
4. Deploy automatically on push to main branch

### Deploying Edge Functions

To deploy the Supabase Edge Functions:

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Deploy functions
supabase functions deploy chat-gemini
supabase functions deploy classify-image

# Set secrets
supabase secrets set GEMINI_API_KEY=your_api_key_here
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details